import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MealTypeValues, MealPlanWithDetails, InsertMealPlanDetail } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, ChevronRight, Calendar, Plus, Edit, Trash, Eye, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const mealTypes = {
  BREAKFAST: "Desayuno",
  MORNING_SNACK: "Media Mañana",
  LUNCH: "Almuerzo",
  AFTERNOON_SNACK: "Merienda",
  DINNER: "Cena",
  OTHER: "Otra",
};

const createPlanSchema = z.object({
  userId: z.coerce.number(),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres"),
  published: z.boolean().default(false),
});

const createPlanDetailSchema = z.object({
  mealType: z.string(),
  day: z.string(),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres"),
  image: z.string().optional(),
});

type CreatePlanFormValues = z.infer<typeof createPlanSchema>;
type CreatePlanDetailFormValues = z.infer<typeof createPlanDetailSchema>;

export default function MealPlanManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [isCreatingPlan, setIsCreatingPlan] = useState<boolean>(false);
  const [isAddingDetail, setIsAddingDetail] = useState<boolean>(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlanWithDetails | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Calculate week range for the selected week
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  
  // Generate array of dates for the selected week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Form for creating a new meal plan
  const createPlanForm = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      description: "",
      published: false,
    },
  });
  
  // Form for adding a meal plan detail
  const createDetailForm = useForm<CreatePlanDetailFormValues>({
    resolver: zodResolver(createPlanDetailSchema),
    defaultValues: {
      mealType: "BREAKFAST",
      description: "",
      day: format(new Date(), "yyyy-MM-dd"),
    },
  });
  
  // Fetch clients for the nutritionist
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    enabled: user?.role === "nutritionist",
  });
  
  // Fetch meal plans created by the nutritionist
  const { data: mealPlans = [], isLoading: isLoadingMealPlans } = useQuery({
    queryKey: ["/api/meal-plans/nutritionist"],
    enabled: user?.role === "nutritionist",
  });
  
  // Create new meal plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (planData: CreatePlanFormValues) => {
      const weekStartDate = startOfWeek(selectedWeek, { weekStartsOn: 1 });
      const weekEndDate = endOfWeek(selectedWeek, { weekStartsOn: 1 });
      
      const res = await apiRequest("POST", "/api/meal-plans", {
        ...planData,
        weekStart: weekStartDate.toISOString(),
        weekEnd: weekEndDate.toISOString(),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/nutritionist"] });
      setIsCreatingPlan(false);
      createPlanForm.reset();
      toast({
        title: "Plan de comidas creado",
        description: "El plan se ha creado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudo crear el plan de comidas",
        variant: "destructive",
      });
    },
  });
  
  // Add detail to meal plan mutation
  const addDetailMutation = useMutation({
    mutationFn: async (data: { planId: number; detailData: CreatePlanDetailFormValues }) => {
      const res = await apiRequest("POST", `/api/meal-plans/${data.planId}/details`, data.detailData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/nutritionist"] });
      setIsAddingDetail(false);
      createDetailForm.reset();
      toast({
        title: "Detalle añadido",
        description: "El detalle se ha añadido correctamente al plan",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudo añadir el detalle al plan",
        variant: "destructive",
      });
    },
  });
  
  // Toggle plan publish status mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: number; published: boolean }) => {
      const res = await apiRequest("POST", `/api/meal-plans/${id}/publish`, { published });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/nutritionist"] });
      toast({
        title: data.published ? "Plan publicado" : "Plan despublicado",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudo cambiar el estado de publicación",
        variant: "destructive",
      });
    },
  });
  
  // Deactivate meal plan mutation
  const deactivatePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const res = await apiRequest("POST", `/api/meal-plans/${planId}/deactivate`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/nutritionist"] });
      toast({
        title: "Plan desactivado",
        description: "El plan ha sido desactivado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudo desactivar el plan",
        variant: "destructive",
      });
    },
  });
  
  // Navigate to previous week
  const goToPreviousWeek = () => {
    setSelectedWeek(prev => subWeeks(prev, 1));
  };
  
  // Navigate to next week
  const goToNextWeek = () => {
    setSelectedWeek(prev => addWeeks(prev, 1));
  };
  
  // Reset to current week
  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };
  
  // Handle create plan form submission
  const onCreatePlan = (values: CreatePlanFormValues) => {
    createPlanMutation.mutate(values);
  };
  
  // Handle adding detail to a meal plan
  const onAddDetail = (values: CreatePlanDetailFormValues) => {
    if (!selectedMealPlan) return;
    
    addDetailMutation.mutate({
      planId: selectedMealPlan.id,
      detailData: values,
    });
  };
  
  // Initialize the add detail dialog
  const startAddDetail = (mealPlan: MealPlanWithDetails, day: string) => {
    setSelectedMealPlan(mealPlan);
    setSelectedDay(day);
    createDetailForm.setValue("day", day);
    setIsAddingDetail(true);
  };
  
  // Toggle plan publication status
  const togglePlanPublish = (plan: MealPlanWithDetails) => {
    togglePublishMutation.mutate({
      id: plan.id,
      published: !plan.published,
    });
  };
  
  // Filter plans for the selected week
  const filteredPlans = mealPlans.filter((plan: MealPlanWithDetails) => {
    const planStartDate = new Date(plan.weekStart);
    const planEndDate = new Date(plan.weekEnd);
    return (
      planStartDate <= weekEnd && planEndDate >= weekStart && plan.active
    );
  });
  
  // Get plan detail for a specific day and meal type
  const getPlanDetail = (plan: MealPlanWithDetails, day: string, mealType: string) => {
    return plan.details.find(
      detail => format(new Date(detail.day), "yyyy-MM-dd") === day && detail.mealType === mealType
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header with title and create button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Planes de Comidas</h1>
        <Button onClick={() => setIsCreatingPlan(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Plan
        </Button>
      </div>
      
      {/* Week navigation */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Semana del {format(weekStart, "d 'de' MMMM", { locale: es })} al {format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToCurrentWeek}>
            <Calendar className="mr-2 h-4 w-4" />
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* List of meal plans for the week */}
      {isLoadingMealPlans ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary border-r-2"></div>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-500">No hay planes de comida para esta semana</p>
          <Button onClick={() => setIsCreatingPlan(true)} variant="outline" className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Crear Plan
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPlans.map((plan: MealPlanWithDetails) => (
            <Card key={plan.id} className={plan.published ? "border-green-300" : "border-amber-300"}>
              <CardHeader className="flex-row justify-between items-center space-y-0 pb-2">
                <div>
                  <CardTitle>
                    Plan para{" "}
                    {clients.find((c: any) => c.id === plan.userId)?.name || "Cliente"}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`publish-${plan.id}`}
                      checked={plan.published}
                      onCheckedChange={() => togglePlanPublish(plan)}
                    />
                    <Label htmlFor={`publish-${plan.id}`}>
                      {plan.published ? "Publicado" : "Borrador"}
                    </Label>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deactivatePlanMutation.mutate(plan.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
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
                      {Object.entries(mealTypes).map(([type, label]) => (
                        <tr key={type} className="border-b">
                          <td className="text-left p-2 text-sm font-medium">{label}</td>
                          {weekDays.map((day) => {
                            const dayStr = format(day, "yyyy-MM-dd");
                            const detail = getPlanDetail(plan, dayStr, type);
                            
                            return (
                              <td key={dayStr} className="text-center p-2">
                                {detail ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="p-2 rounded bg-gray-50 text-xs text-left w-full">
                                      {detail.description.length > 50
                                        ? `${detail.description.slice(0, 50)}...`
                                        : detail.description}
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startAddDetail(plan, dayStr)}
                                    className="h-8 w-8"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
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
          ))}
        </div>
      )}
      
      {/* Dialog for creating a new meal plan */}
      <Dialog open={isCreatingPlan} onOpenChange={setIsCreatingPlan}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Plan de Comidas</DialogTitle>
            <DialogDescription>
              Crea un plan para la semana del {format(weekStart, "d MMM", { locale: es })} al {format(weekEnd, "d MMM yyyy", { locale: es })}.
            </DialogDescription>
          </DialogHeader>
          <Form {...createPlanForm}>
            <form onSubmit={createPlanForm.handleSubmit(onCreatePlan)} className="space-y-4">
              <FormField
                control={createPlanForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createPlanForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe una descripción para este plan de comidas"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createPlanForm.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Publicar ahora</FormLabel>
                      <FormDescription>
                        El cliente podrá ver este plan inmediatamente
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreatingPlan(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPlanMutation.isPending}>
                  {createPlanMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                      Creando...
                    </span>
                  ) : (
                    "Crear Plan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for adding details to a meal plan */}
      <Dialog open={isAddingDetail} onOpenChange={setIsAddingDetail}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Añadir Comida al Plan</DialogTitle>
            <DialogDescription>
              {selectedDay && (
                <span>
                  Añade una comida para el{" "}
                  {format(parseISO(selectedDay), "EEEE d 'de' MMMM", { locale: es })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...createDetailForm}>
            <form onSubmit={createDetailForm.handleSubmit(onAddDetail)} className="space-y-4">
              <FormField
                control={createDetailForm.control}
                name="mealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Comida</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo de comida" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(mealTypes).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createDetailForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe la comida en detalle (ingredientes, preparación, etc.)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createDetailForm.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagen (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="URL de la imagen"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Introduce la URL de una imagen para esta comida
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddingDetail(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addDetailMutation.isPending}>
                  {addDetailMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                      Añadiendo...
                    </span>
                  ) : (
                    "Añadir"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}