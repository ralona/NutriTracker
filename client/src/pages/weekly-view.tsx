import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DailyMeals, MealType, MealTypeValues, MealWithComments, InsertMeal, MealPlanWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar, CalendarCheck } from "lucide-react";
import MealForm from "@/components/forms/meal-form";
import MealTable from "@/components/meal-table";
import { formatDateToISO } from "@/lib/dates";

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

  return (
    <div className="space-y-6">
      {/* Header with date navigation */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan Semanal</h1>
          {user?.role === "client" && (
            <p className="text-sm text-gray-500 mt-1">
              Aquí verás exclusivamente el plan de alimentación recomendado por tu nutricionista
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
                <div className="text-sm text-gray-500">
                  Semana del {format(new Date(activeMealPlan.weekStart), "d 'de' MMMM", { locale: es })} al {format(new Date(activeMealPlan.weekEnd), "d 'de' MMMM yyyy", { locale: es })}
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
                  Tu nutricionista aún no ha publicado un plan de comidas para ti. 
                  Una vez que lo haga, aparecerá aquí con las recomendaciones personalizadas.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Message about meal logging */}
      <Card className="mb-6 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <CalendarCheck className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Plan Nutricional</h3>
            <p className="text-gray-500 max-w-md mb-4">
              Esta sección muestra exclusivamente el plan nutricional preparado por tu nutricionista.
              Para registrar o ver tus propias comidas, utiliza la sección "Comidas Diarias".
            </p>
            <Button 
              onClick={() => window.location.href = '/?view=daily'}
              className="inline-flex items-center px-4 py-2 font-medium"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Ver Mis Comidas
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* No forms for adding/editing meals in Weekly Plan view */}
    </div>
  );
}
