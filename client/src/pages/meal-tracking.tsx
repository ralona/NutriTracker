import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, addDays, subDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  DailyMeals, 
  MealType,
  MealTypeValues,
  InsertMeal,
  MealWithComments
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Edit, Calendar, CalendarRange, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import MealForm from "@/components/forms/meal-form";
import { capitalizeFirstLetter } from "@/lib/utils";
import MealTable from "@/components/meal-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function MealTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddingMeal, setIsAddingMeal] = useState<boolean>(false);
  const [editingMeal, setEditingMeal] = useState<number | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealTypeValues | null>(null);
  // Obtener el modo de vista inicial desde la URL
  const getInitialViewMode = (): "daily" | "weekly" => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      return (viewParam === 'weekly') ? 'weekly' : 'daily';
    }
    return 'daily';
  };

  const [viewMode, setViewMode] = useState<"daily" | "weekly">(getInitialViewMode());

  // Para la vista semanal
  const [selectedWeek, setSelectedWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Función para navegar a la semana anterior
  const goToPreviousWeek = () => {
    setSelectedWeek(prev => subWeeks(prev, 1));
  };
  
  // Función para navegar a la semana siguiente
  const goToNextWeek = () => {
    setSelectedWeek(prev => addWeeks(prev, 1));
  };
  
  // Función para ir a la semana actual
  const goToCurrentWeek = () => {
    setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };
  
  // Generar los días de la semana
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeek, i));

  // Fetch meals for the selected date (vista diaria)
  const { data: meals, isLoading } = useQuery<DailyMeals>({
    queryKey: ["/api/meals/daily", selectedDate.toISOString()],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/meals/daily?date=${queryKey[1]}`);
      if (!response.ok) throw new Error("Error fetching meals");
      return response.json();
    },
    enabled: viewMode === "daily"
  });
  
  // Fetch weekly meals (vista semanal)
  const { data: weeklyData, isLoading: isLoadingWeekly } = useQuery({
    queryKey: ["/api/meals/weekly", selectedWeek.toISOString()],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/meals/weekly?date=${queryKey[1]}`);
      if (!response.ok) throw new Error("Error fetching weekly meals");
      return response.json();
    },
    enabled: viewMode === "weekly"
  });

  // Create meal mutation
  const createMealMutation = useMutation({
    mutationFn: async (mealData: InsertMeal) => {
      const res = await apiRequest("POST", "/api/meals", mealData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals/daily", selectedDate.toISOString()] });
      queryClient.invalidateQueries({ queryKey: ["/api/meals/weekly"] });
      setIsAddingMeal(false);
      setSelectedMealType(null);
      toast({
        title: "Comida registrada",
        description: "Tu comida se ha registrado correctamente"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudo registrar la comida",
        variant: "destructive"
      });
    }
  });

  // Update meal mutation
  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertMeal> }) => {
      const res = await apiRequest("PATCH", `/api/meals/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals/daily", selectedDate.toISOString()] });
      queryClient.invalidateQueries({ queryKey: ["/api/meals/weekly"] });
      setEditingMeal(null);
      toast({
        title: "Comida actualizada",
        description: "La comida se ha actualizado correctamente"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudo actualizar la comida",
        variant: "destructive"
      });
    }
  });

  // Delete meal mutation
  const deleteMealMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/meals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals/daily", selectedDate.toISOString()] });
      queryClient.invalidateQueries({ queryKey: ["/api/meals/weekly"] });
      toast({
        title: "Comida eliminada",
        description: "La comida se ha eliminado correctamente"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudo eliminar la comida",
        variant: "destructive"
      });
    }
  });

  // Navigate to previous day
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  // Navigate to next day
  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  // Set today
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Handle form submission for adding meal
  const handleAddMeal = (data: InsertMeal) => {
    if (!user) return;
    
    createMealMutation.mutate({
      ...data,
      userId: user.id,
      date: selectedDate
    });
  };

  // Handle form submission for updating meal
  const handleUpdateMeal = (data: Partial<InsertMeal>) => {
    if (!editingMeal) return;
    
    updateMealMutation.mutate({
      id: editingMeal,
      data
    });
  };

  // Start adding a meal
  const startAddMeal = (mealType: MealTypeValues) => {
    setSelectedMealType(mealType);
    setIsAddingMeal(true);
    setEditingMeal(null);
  };

  // Start editing a meal
  const startEditMeal = (mealId: number) => {
    setEditingMeal(mealId);
    setIsAddingMeal(false);
    setSelectedMealType(null);
  };

  // Delete a meal
  const handleDeleteMeal = (mealId: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta comida?")) {
      deleteMealMutation.mutate(mealId);
    }
  };

  // Cancel form
  const cancelForm = () => {
    setIsAddingMeal(false);
    setEditingMeal(null);
    setSelectedMealType(null);
  };

  // Get the meals for a specific type
  const getMealsByType = (type: MealTypeValues): MealWithComments[] => {
    if (!meals) return [];
    return meals[type] || [];
  };

  // Get a meal by ID
  const getMealById = (id: number) => {
    if (!meals) return null;
    
    for (const mealType of Object.values(MealType)) {
      const mealsList = meals[mealType] || [];
      for (const meal of mealsList) {
        if (meal && meal.id === id) {
          return meal;
        }
      }
    }
    
    return null;
  };

  // Helper function para ir a la comida del día seleccionado en vista semanal
  const goToSelectedDayMeal = (date: Date) => {
    setSelectedDate(date);
    setViewMode("daily");
  };
  
  // Función para descargar las comidas registradas como PDF
  const downloadMealsAsPDF = () => {
    try {
      // Verificar que tenemos datos
      if (!weeklyData || !weeklyData.meals) {
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
      doc.text(`Semana del ${format(weekDays[0], "d 'de' MMMM", { locale: es })} al ${format(weekDays[6], "d 'de' MMMM yyyy", { locale: es })}`, 14, 30);
      
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
          // Usamos type como clave para acceder a las comidas del día
          const meals = weeklyData.meals[dayStr]?.[type as keyof typeof MealType];
          
          if (meals && meals.length > 0) {
            const mealDescriptions = meals.map((meal: any) => meal.description).join("\n\n");
            row.push(mealDescriptions);
          } else {
            row.push(""); // Celda vacía en lugar de un guión
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
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Generado el ' + format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }), 
               14, doc.internal.pageSize.height - 10);
      }
      
      // Nombre del archivo
      const fileName = `mis-comidas-${format(weekDays[0], "dd-MM-yyyy")}`;
      
      // Guardar PDF
      doc.save(`${fileName}.pdf`);
      
      // Notificar al usuario
      toast({
        title: "PDF Generado",
        description: "El registro de comidas se ha descargado correctamente.",
        duration: 3000
      });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Intente de nuevo.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header con título y selector de vista */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registro de Comidas</h1>
      </div>
      
      {/* Dialog modal for adding/editing meal */}
      <Dialog open={isAddingMeal || editingMeal !== null} onOpenChange={(open) => {
        if (!open) cancelForm();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isAddingMeal ? `Añadir ${selectedMealType}` : 'Editar comida'}
            </DialogTitle>
            <DialogDescription>
              {isAddingMeal 
                ? 'Registra los detalles de tu comida' 
                : 'Modifica los detalles de esta comida'}
            </DialogDescription>
          </DialogHeader>
          <MealForm 
            initialData={editingMeal ? getMealById(editingMeal) || undefined : undefined}
            mealType={selectedMealType}
            onSubmit={(data) => {
              if (isAddingMeal) {
                handleAddMeal(data as InsertMeal);
              } else {
                handleUpdateMeal(data);
              }
            }}
            onCancel={cancelForm}
            isSubmitting={createMealMutation.isPending || updateMealMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* View selector and content */}
      <div className="mb-6">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "daily" | "weekly")} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto mb-6 grid-cols-2">
            <TabsTrigger value="daily" className="flex items-center justify-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Vista Diaria</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center justify-center gap-1">
              <CalendarRange className="h-4 w-4" />
              <span>Vista Semanal</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Daily view content */}
          <TabsContent value="daily" className="m-0">
            {/* Daily view navigation */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-500">
                {format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={goToPreviousDay}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={goToToday}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Hoy
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={goToNextDay}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              // Loading state
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary border-r-2"></div>
              </div>
            ) : (
              <>
                {/* Meal sections */}
                {Object.values(MealType).map((mealType) => {
                  const mealsList = getMealsByType(mealType);
                  
                  return (
                    <Card key={mealType} className="border border-gray-200 mb-6">
                      <CardHeader className="flex flex-row items-center justify-between py-4 px-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{mealType}</h3>
                          {mealType === MealType.BREAKFAST && <span className="text-sm text-gray-500">8:00 AM</span>}
                          {mealType === MealType.MORNING_SNACK && <span className="text-sm text-gray-500">11:00 AM</span>}
                          {mealType === MealType.LUNCH && <span className="text-sm text-gray-500">2:00 PM</span>}
                          {mealType === MealType.AFTERNOON_SNACK && <span className="text-sm text-gray-500">5:00 PM</span>}
                          {mealType === MealType.DINNER && <span className="text-sm text-gray-500">9:00 PM</span>}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => startAddMeal(mealType)}
                          className="text-primary hover:text-primary/90 hover:bg-primary-50"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {mealsList.length > 0 ? 'Añadir otro' : 'Añadir'}
                        </Button>
                      </CardHeader>
                      <CardContent className="px-6 py-4">
                        {mealsList.length > 0 ? (
                          <div className="space-y-6">
                            {mealsList.map((meal) => (
                              <div key={meal.id} className="space-y-4 border-b pb-4 last:border-b-0 last:pb-0">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-gray-800 font-medium">{meal.name}</p>
                                    {meal.description && (
                                      <p className="text-sm text-gray-500">{meal.description}</p>
                                    )}
                                    <div className="text-sm text-gray-500 mt-1 space-y-1">
                                      {meal.calories && (
                                        <p>{meal.calories} kcal</p>
                                      )}
                                      {meal.time && (
                                        <p>Hora: {meal.time}</p>
                                      )}
                                      {meal.duration && (
                                        <p>Duración: {meal.duration} minutos</p>
                                      )}
                                      {meal.waterIntake && (
                                        <p>Agua: {meal.waterIntake} litros</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => startEditMeal(meal.id)} 
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Comments section */}
                                {meal.comments && meal.comments.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Comentarios</h4>
                                    {meal.comments.map((comment) => (
                                      <div key={comment.id} className="bg-gray-50 p-3 rounded-md text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium">Nutricionista</span>
                                          <span className="text-xs text-gray-500">
                                            {format(new Date(comment.createdAt), "d MMM, yyyy", { locale: es })}
                                          </span>
                                        </div>
                                        <p className="text-gray-700">{comment.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-sm">No has registrado {mealType.toLowerCase()} para este día</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2" 
                              onClick={() => startAddMeal(mealType)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Añadir {mealType.toLowerCase()}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* Weekly view */}
          <TabsContent value="weekly" className="m-0">
            {/* Weekly view navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="text-sm text-gray-500">
                Semana del {format(weekDays[0], "d 'de' MMMM", { locale: es })} al {format(weekDays[6], "d 'de' MMMM, yyyy", { locale: es })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={goToPreviousWeek}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={goToCurrentWeek}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Esta Semana
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={goToNextWeek}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={downloadMealsAsPDF}
                  className="flex items-center gap-2"
                  disabled={!weeklyData?.meals || Object.keys(weeklyData.meals).length === 0}
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar PDF</span>
                </Button>
              </div>
            </div>

            {/* Weekly view content - Meal table */}
            {isLoadingWeekly ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary border-r-2"></div>
              </div>
            ) : weeklyData?.meals ? (
              <Card>
                <CardContent className="p-4">
                  <MealTable 
                    weekDays={weekDays}
                    meals={weeklyData.meals}
                    summaries={weeklyData.summaries || []}
                    onAddMeal={(day, mealType) => {
                      const date = new Date(day);
                      goToSelectedDayMeal(date);
                    }}
                    onEditMeal={(meal) => {
                      const date = new Date(meal.date);
                      goToSelectedDayMeal(date);
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-10 border rounded-lg bg-gray-50">
                <p className="text-gray-500">No hay comidas registradas para esta semana</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}