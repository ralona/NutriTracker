import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DailyMeals, MealType, MealTypeValues, MealWithComments, InsertMeal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
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

  // Create meal mutation
  const createMealMutation = useMutation({
    mutationFn: async (mealData: InsertMeal) => {
      const res = await apiRequest("POST", "/api/meals", mealData);
      return await res.json();
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
        title: "Error",
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
  const handleAddMeal = (mealData: InsertMeal) => {
    if (!user || !selectedDay) return;
    
    createMealMutation.mutate({
      ...mealData,
      userId: user.id,
      date: parseISO(selectedDay)
    });
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

  return (
    <div className="space-y-6">
      {/* Header with date navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plan Semanal</h1>
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
        <DialogContent className="sm:max-w-[600px]">
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
        <DialogContent className="sm:max-w-[600px]">
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
