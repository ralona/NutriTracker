import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { DailyMeals, MealType, MealPlanWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, CalendarCheck, Download } from "lucide-react";
import { formatDateToISO } from "@/lib/dates";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type WeeklyMealsResponse = {
  meals: Record<string, DailyMeals>;
  summaries: any[];
};

export default function WeeklyView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  // Solo necesitamos el estado para la semana seleccionada

  // Calculate week range for display
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  
  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Fetch weekly meals
  const { data, isLoading } = useQuery<WeeklyMealsResponse>({
    queryKey: ["/api/meals/weekly", formatDateToISO(selectedWeek)],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/meals/weekly?date=${queryKey[1]}`);
      if (!response.ok) throw new Error("Error fetching weekly meals");
      return response.json();
    }
  });
  
  // Fetch active meal plan
  const { data: activeMealPlan, isLoading: isLoadingMealPlan } = useQuery<MealPlanWithDetails>({
    queryKey: ["/api/meal-plans/active"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/meal-plans/active");
        if (response.status === 404) {
          return null;
        }
        if (!response.ok) throw new Error("Error fetching active meal plan");
        return response.json();
      } catch (error) {
        if ((error as Error).message.includes("404")) {
          return null;
        }
        throw error;
      }
    }
  });

  // Ya no necesitamos mutaciones para manipular comidas en esta vista

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setSelectedWeek(prev => subWeeks(prev, 1));
  };

  // Navigate to next week
  const goToNextWeek = () => {
    setSelectedWeek(prev => addWeeks(prev, 1));
  };

  // Set current week
  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };

  // Ya no necesitamos funciones de manipulación de comidas en esta vista

  // Get nutrition summary for a day
  const getNutritionSummary = (day: string) => {
    if (!data?.summaries) return null;
    
    return data.summaries.find(summary => 
      format(new Date(summary.date), 'yyyy-MM-dd') === day
    );
  };
  
  // Get meal plan detail for a specific day and meal type
  const getMealPlanDetail = (day: string, mealType: string) => {
    if (!activeMealPlan || !activeMealPlan.details) return null;
    
    return activeMealPlan.details.find(
      detail => format(new Date(detail.day), "yyyy-MM-dd") === day && detail.mealType === mealType
    );
  };
  
  // Función para descargar el plan recomendado como PDF
  const downloadPlanAsPDF = () => {
    try {
      // Crear un nuevo documento PDF
      const doc = new jsPDF();
      
      // Añadir título
      doc.setFontSize(18);
      doc.text("Plan Semanal Recomendado", 14, 20);
      
      // Añadir periodo
      doc.setFontSize(12);
      doc.text(`Semana del ${format(weekStart, "d 'de' MMMM", { locale: es })} al ${format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}`, 14, 30);
      
      // Añadir descripción si existe
      if (activeMealPlan?.description) {
        doc.setFontSize(10);
        doc.text(`Descripción: ${activeMealPlan.description}`, 14, 36);
      }
      
      // Preparar encabezados para la tabla
      const headers = ["Comida"];
      weekDays.forEach(day => {
        headers.push(format(day, "EEE d MMM", { locale: es }));
      });
      
      // Preparar datos para la tabla
      const tableData = Object.entries(MealType).map(([type, label]) => {
        const row = [label];
        
        weekDays.forEach(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          // La clave en MealType es eso mismo, pero necesitamos manejarlo como string
          const detail = getMealPlanDetail(dayStr, type);
          
          // Si hay un detalle de comida, lo agregamos, sino un guión
          row.push(detail ? detail.description : "");
        });
        
        return row;
      });
      
      // Agregar la tabla al PDF
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: activeMealPlan?.description ? 42 : 40,
        theme: 'grid',
        styles: { 
          fontSize: 9,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 25 }
        },
        headStyles: {
          fillColor: [76, 175, 80]
        }
      });
      
      // Añadir pie de página
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Generado el ' + format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }), 
               14, doc.internal.pageSize.height - 10);
      }
      
      // Nombre del archivo
      const fileName = `plan-semanal-recomendado-${format(weekStart, "dd-MM-yyyy")}`;
      
      // Guardar PDF
      doc.save(`${fileName}.pdf`);
      
      // Notificar al usuario
      toast({
        title: "PDF Generado",
        description: "El plan semanal recomendado se ha descargado correctamente.",
        duration: 3000
      });
    } catch (error) {
      console.error("Error al generar PDF del plan:", error);
      
      // Más información de depuración
      if (activeMealPlan) {
        console.log("Datos del plan disponibles para PDF:", {
          descripcion: activeMealPlan.description || "Sin descripción",
          fechaInicio: activeMealPlan.weekStart,
          fechaFin: activeMealPlan.weekEnd,
          detalles: activeMealPlan.details?.length || 0
        });
      } else {
        console.log("No hay plan de comidas disponible para generar el PDF");
      }
      
      toast({
        title: "Error",
        description: "No se pudo generar el PDF del plan. Verifica que el plan esté activo e intenta de nuevo.",
        variant: "destructive"
      });
    }
  };
  
  // Función para descargar las comidas registradas como PDF
  const downloadMealsAsPDF = () => {
    try {
      // Verificar que tenemos datos
      if (!data || !data.meals) {
        toast({
          title: "Sin datos",
          description: "No hay comidas registradas para exportar.",
          variant: "destructive"
        });
        return;
      }
      
      // Crear un nuevo documento PDF
      const doc = new jsPDF();
      
      // Añadir título
      doc.setFontSize(18);
      doc.text("Registro Semanal de Comidas", 14, 20);
      
      // Añadir periodo
      doc.setFontSize(12);
      doc.text(`Semana del ${format(weekStart, "d 'de' MMMM", { locale: es })} al ${format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}`, 14, 30);
      
      // Preparar encabezados para la tabla
      const headers = ["Comida"];
      weekDays.forEach(day => {
        headers.push(format(day, "EEE d MMM", { locale: es }));
      });
      
      // Preparar datos para la tabla
      const tableData = Object.entries(MealType).map(([type, label]) => {
        const row = [label];
        
        weekDays.forEach(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const meals = data.meals[dayStr]?.[type as keyof typeof MealType];
          
          if (meals && meals.length > 0) {
            // Usar nombre en lugar de descripción
            const mealNames = meals.map(meal => meal.name || "Sin nombre").join("\n\n");
            row.push(mealNames);
          } else {
            row.push("");  // Celda vacía en lugar de guión
          }
        });
        
        return row;
      });
      
      // Agregar la tabla al PDF
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 40,
        theme: 'grid',
        styles: { 
          fontSize: 9,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 25 }
        },
        headStyles: {
          fillColor: [100, 116, 139]
        }
      });
      
      // Añadir pie de página
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Generado el ' + format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }), 
               14, doc.internal.pageSize.height - 10);
      }
      
      // Nombre del archivo
      const fileName = `mis-comidas-${format(weekStart, "dd-MM-yyyy")}`;
      
      // Guardar PDF
      doc.save(`${fileName}.pdf`);
      
      // Notificar al usuario
      toast({
        title: "PDF Generado",
        description: "El registro de comidas se ha descargado correctamente.",
        duration: 3000
      });
    } catch (error) {
      console.error("Error al generar PDF de comidas:", error);
      
      // Más información de depuración
      if (data && data.meals) {
        console.log("Datos disponibles para PDF:", 
          Object.keys(data.meals).map(key => ({ 
            day: key, 
            mealCount: Object.values(data.meals[key]).flat().length 
          }))
        );
      } else {
        console.log("No hay datos disponibles para generar el PDF");
      }
      
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Verifica que tengas comidas registradas e intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with date navigation */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan Semanal Recomendado</h1>
          {user?.role === "client" && (
            <p className="text-sm text-gray-500 mt-1">
              <strong>Nota:</strong> Esta sección es solamente informativa y muestra el plan alimenticio 
              sugerido por tu nutricionista. Para registrar tus comidas, utiliza la sección "Comidas Diarias".
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPreviousWeek}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-gray-600 font-medium whitespace-nowrap">
            {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM, yyyy", { locale: es })}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNextWeek}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center space-x-2" 
            onClick={goToCurrentWeek}
          >
            <Calendar className="h-5 w-5" />
            <span>Hoy</span>
          </Button>
        </div>
      </div>
      
      {/* Active Meal Plan */}
      {user?.role === "client" && (
        isLoadingMealPlan ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500 border-r-2"></div>
          </div>
        ) : activeMealPlan && activeMealPlan.published ? (
          <Card className="mb-6 border-green-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <CalendarCheck className="h-5 w-5 mr-2 text-green-600" />
                    Plan de comidas recomendado
                    <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">Activo</Badge>
                  </CardTitle>
                  <CardDescription>
                    {activeMealPlan.description}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-sm text-gray-500 mb-2">
                    Semana del {format(new Date(activeMealPlan.weekStart), "d 'de' MMMM", { locale: es })} al {format(new Date(activeMealPlan.weekEnd), "d 'de' MMMM yyyy", { locale: es })}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center text-xs" 
                    onClick={downloadPlanAsPDF}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Descargar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 bg-gray-100 text-xs font-medium">Comida</th>
                      {weekDays.map((day) => (
                        <th key={day.toString()} className="text-center p-2 bg-gray-100 text-xs font-medium">
                          {format(day, "EEE d", { locale: es })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(MealType).map(([type, label]) => (
                      <tr key={type} className="border-b">
                        <td className="text-left p-2 text-sm font-medium">{label}</td>
                        {weekDays.map((day) => {
                          const dayStr = format(day, "yyyy-MM-dd");
                          const detail = getMealPlanDetail(dayStr, type);
                          
                          return (
                            <td key={dayStr} className="text-center p-2">
                              {detail ? (
                                <div className="p-2 rounded bg-gray-50 text-xs text-left">
                                  {detail.description.length > 50 
                                    ? `${detail.description.slice(0, 50)}...` 
                                    : detail.description}
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Plan de comidas</CardTitle>
              <CardDescription>
                Aún no tienes un plan de comidas asignado por tu nutricionista.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="bg-gray-100 rounded-full p-4 mb-4">
                  <Calendar className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">Plan pendiente</h3>
                <p className="text-gray-500 max-w-md">
                  Tu nutricionista todavía no ha publicado un plan de comidas recomendado para ti.
                  Esta sección es puramente informativa y mostrará las sugerencias de comidas
                  una vez que tu nutricionista las haya preparado.
                </p>
                <p className="text-blue-600 text-sm mt-2">
                  Recuerda que puedes registrar tus comidas diarias en la sección "Comidas Diarias".
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}
      
      {/* Registered Meals Section */}
      {user?.role === "client" && (
        <Card className="mb-6 border-blue-200">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Mis comidas registradas
                </CardTitle>
                <CardDescription>
                  Resumen de las comidas que has registrado durante la semana
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center text-xs" 
                onClick={downloadMealsAsPDF}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Descargar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 border-r-2"></div>
              </div>
            ) : data && Object.values(data.meals).some(day => Object.keys(day).length > 0) ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 bg-gray-100 text-xs font-medium">Comida</th>
                      {weekDays.map((day) => (
                        <th key={day.toString()} className="text-center p-2 bg-gray-100 text-xs font-medium">
                          {format(day, "EEE d", { locale: es })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(MealType).map(([type, label]) => (
                      <tr key={type} className="border-b">
                        <td className="text-left p-2 text-sm font-medium">{label}</td>
                        {weekDays.map((day) => {
                          const dayStr = format(day, "yyyy-MM-dd");
                          const meals = data.meals[dayStr]?.[type as keyof typeof MealType];
                          
                          return (
                            <td key={dayStr} className="text-center p-2">
                              {meals && meals.length > 0 ? (
                                <div className="p-2 rounded bg-gray-50 text-xs text-left">
                                  {meals.map((meal, idx) => (
                                    <div key={meal.id} className={idx > 0 ? "mt-2 pt-2 border-t" : ""}>
                                      <div className="font-medium">{meal.name || "Sin nombre"}</div>
                                      {meal.description && <div className="text-gray-600 text-xs mt-1">{meal.description}</div>}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No has registrado comidas para esta semana.</p>
                <p className="mt-2 text-sm">
                  Utiliza la sección "Comidas Diarias" para registrar tus comidas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}