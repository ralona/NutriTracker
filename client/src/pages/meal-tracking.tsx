import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  DailyMeals, 
  MealType,
  MealTypeValues,
  InsertMeal
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Edit } from "lucide-react";
import MealForm from "@/components/forms/meal-form";
import { capitalizeFirstLetter } from "@/lib/utils";

export default function MealTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddingMeal, setIsAddingMeal] = useState<boolean>(false);
  const [editingMeal, setEditingMeal] = useState<number | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealTypeValues | null>(null);

  // Fetch meals for the selected date
  const { data: meals, isLoading } = useQuery<DailyMeals>({
    queryKey: ["/api/meals/daily", selectedDate.toISOString()],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(`/api/meals/daily?date=${queryKey[1]}`);
      if (!response.ok) throw new Error("Error fetching meals");
      return response.json();
    }
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

  // Get the meal for a specific type
  const getMealByType = (type: MealTypeValues) => {
    if (!meals) return null;
    return meals[type];
  };

  // Get a meal by ID
  const getMealById = (id: number) => {
    if (!meals) return null;
    
    for (const mealType of Object.values(MealType)) {
      const meal = meals[mealType];
      if (meal && meal.id === id) {
        return meal;
      }
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with date navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comidas de Hoy</h1>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPreviousDay}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="px-3 py-2 text-gray-600 font-medium">
            {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNextDay}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            onClick={goToToday}
          >
            Hoy
          </Button>
        </div>
      </div>

      {/* Meal tracking content */}
      <div className="space-y-6">
        {/* Form for adding/editing meal */}
        {(isAddingMeal || editingMeal !== null) && (
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-lg font-semibold">
                {isAddingMeal ? `Añadir ${selectedMealType}` : 'Editar comida'}
              </h3>
            </CardHeader>
            <CardContent>
              <MealForm 
                initialData={editingMeal ? getMealById(editingMeal) : undefined}
                mealType={selectedMealType}
                onSubmit={isAddingMeal ? handleAddMeal : handleUpdateMeal}
                onCancel={cancelForm}
                isSubmitting={createMealMutation.isPending || updateMealMutation.isPending}
              />
            </CardContent>
          </Card>
        )}

        {/* Meals list */}
        {isLoading ? (
          // Loading state
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-500 border-r-2"></div>
          </div>
        ) : (
          <>
            {/* Meal sections */}
            {Object.values(MealType).map((mealType) => {
              const meal = getMealByType(mealType);
              
              return (
                <Card key={mealType} className="border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between py-4 px-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{mealType}</h3>
                      {mealType === MealType.BREAKFAST && <span className="text-sm text-gray-500">8:00 AM</span>}
                      {mealType === MealType.MORNING_SNACK && <span className="text-sm text-gray-500">11:00 AM</span>}
                      {mealType === MealType.LUNCH && <span className="text-sm text-gray-500">2:00 PM</span>}
                      {mealType === MealType.AFTERNOON_SNACK && <span className="text-sm text-gray-500">5:00 PM</span>}
                      {mealType === MealType.DINNER && <span className="text-sm text-gray-500">9:00 PM</span>}
                    </div>
                    {!meal && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => startAddMeal(mealType)}
                        className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Añadir
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="px-6 py-4">
                    {meal ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-800 font-medium">{meal.name}</p>
                            {meal.description && (
                              <p className="text-sm text-gray-500">{meal.description}</p>
                            )}
                            {meal.calories && (
                              <p className="text-sm text-gray-500 mt-1">{meal.calories} kcal</p>
                            )}
                            {meal.time && (
                              <p className="text-sm text-gray-500">{meal.time}</p>
                            )}
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
                              <div key={comment.id} className="bg-gray-50 p-3 rounded-md text-sm text-gray-600 italic">
                                {comment.content}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Notes section */}
                        {meal.notes && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Notas</h4>
                            <p className="text-sm text-gray-600">{meal.notes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 italic">No hay comida registrada</p>
                        <Button 
                          variant="link" 
                          onClick={() => startAddMeal(mealType)}
                          className="mt-2 text-primary-600"
                        >
                          Registrar {mealType.toLowerCase()}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Add Meal Button */}
            <div className="mt-6">
              <Button 
                className="w-full py-6"
                variant="outline"
                onClick={() => startAddMeal(MealType.BREAKFAST)}
              >
                <Plus className="h-5 w-5 mr-2" />
                Añadir otra comida
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
