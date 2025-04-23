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
  const [isAddingMeal, setIsAddingMeal] = useState<boolean>(false);
  const [selectedMealType, setSelectedMealType] = useState<MealTypeValues | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealWithComments | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

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

  // Create meal mutation
  const createMealMutation = useMutation({
    mutationFn: async (mealData: InsertMeal) => {
      try {
        const res = await apiRequest("POST", "/api/meals", mealData);
        const data = await res.json();
        
        if (!res.ok) {
          if (data.errors) {
            // Si hay errores de validación, los convertimos a un mensaje amigable
            const errorMessages = data.errors.map((err: any) => {
              const field = err.path?.[0] || "campo";
              return `${field}: ${err.message}`;
            }).join(", ");
            throw new Error(`Errores en el formulario: ${errorMessages}`);
          }
          throw new Error(data.message || "Error al registrar la comida");
        }
        
        return data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals/weekly"] });
      setIsAddingMeal(false);
      setSelectedMealType(null);
      setSelectedDay(null);
      toast({
        title: "Comida registrada",
        description: "Tu comida se ha registrado correctamente"
      });
    },
    onError: (error) => {
      toast({
        title: "Error al registrar comida",
        description: (error as Error).message || "No se pudo registrar la comida",
        variant: "destructive"
      });
    }
  });

  // Update meal mutation
  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertMeal> }) => {
      try {
        const res = await apiRequest("PATCH", `/api/meals/${id}`, data);
        const responseData = await res.json();
        
        if (!res.ok) {
          if (responseData.errors) {
            // Si hay errores de validación, los convertimos a un mensaje amigable
            const errorMessages = responseData.errors.map((err: any) => {
              const field = err.path?.[0] || "campo";
              return `${field}: ${err.message}`;
            }).join(", ");
            throw new Error(`Errores en el formulario: ${errorMessages}`);
          }
          throw new Error(responseData.message || "Error al actualizar la comida");
        }
        
        return responseData;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals/weekly"] });
      setIsEditModalOpen(false);
      setSelectedMeal(null);
      toast({
        title: "Comida actualizada",
        description: "La comida se ha actualizado correctamente"
      });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar comida",
        description: (error as Error).message || "No se pudo actualizar la comida",
        variant: "destructive"
      });
    }
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({ mealId, content }: { mealId: number; content: string }) => {
      const res = await apiRequest("POST", "/api/comments", {
        mealId,
        nutritionistId: user?.id,
        content
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals/weekly"] });
      toast({
        title: "Comentario añadido",
        description: "El comentario se ha añadido correctamente"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudo añadir el comentario",
        variant: "destructive"
      });
    }
  });

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

  // Handle form submission for adding meal
  const handleAddMeal = (mealData: Partial<InsertMeal>) => {
    if (!user || !selectedDay) return;
    
    // Asegurarse de que todos los datos requeridos estén presentes
    const completeData = {
      ...mealData,
      userId: user.id,
      date: parseISO(selectedDay),
      type: mealData.type || selectedMealType || MealType.BREAKFAST,
      name: mealData.name || ""
    };
    
    createMealMutation.mutate(completeData as InsertMeal);
  };

  // Handle form submission for updating meal
  const handleUpdateMeal = (mealData: Partial<InsertMeal>) => {
    if (!selectedMeal) return;
    
    updateMealMutation.mutate({
      id: selectedMeal.id,
      data: mealData
    });
  };

  // Start adding a meal
  const startAddMeal = (day: string, mealType: MealTypeValues) => {
    setSelectedDay(day);
    setSelectedMealType(mealType);
    setIsAddingMeal(true);
  };

  // Open meal edit modal
  const openMealEditModal = (meal: MealWithComments) => {
    setSelectedMeal(meal);
    setIsEditModalOpen(true);
  };

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
              Aquí verás el plan recomendado por tu nutricionista y podrás registrar lo que has comido durante la semana
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

      {/* Weekly Meal Table */}
      {isLoading ? (
        // Loading state
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500 border-r-2"></div>
        </div>
      ) : (
        <MealTable 
          weekDays={weekDays}
          meals={data?.meals || {}}
          summaries={data?.summaries || []}
          onAddMeal={startAddMeal}
          onEditMeal={openMealEditModal}
          isNutritionist={user?.role === "nutritionist"}
        />
      )}

      {/* Add Meal Button */}
      {user?.role !== "nutritionist" && (
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={() => {
              setSelectedDay(format(new Date(), 'yyyy-MM-dd'));
              setSelectedMealType(MealType.BREAKFAST);
              setIsAddingMeal(true);
            }}
            className="inline-flex items-center px-4 py-2 font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Añadir comida
          </Button>
        </div>
      )}
      
      {/* Add Meal Dialog */}
      <Dialog open={isAddingMeal} onOpenChange={setIsAddingMeal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Añadir {selectedMealType} - {selectedDay && format(parseISO(selectedDay), "d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <MealForm 
            mealType={selectedMealType}
            onSubmit={handleAddMeal}
            onCancel={() => setIsAddingMeal(false)}
            isSubmitting={createMealMutation.isPending}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Meal Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Editar {selectedMeal?.type} - {selectedMeal && format(new Date(selectedMeal.date), "d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          {selectedMeal && (
            <MealForm 
              initialData={selectedMeal}
              onSubmit={handleUpdateMeal}
              onCancel={() => setIsEditModalOpen(false)}
              isSubmitting={updateMealMutation.isPending}
              addComment={(content) => {
                if (!user || !selectedMeal) return;
                createCommentMutation.mutate({
                  mealId: selectedMeal.id,
                  content
                });
              }}
              isNutritionist={user?.role === "nutritionist"}
              comments={selectedMeal.comments || []}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
