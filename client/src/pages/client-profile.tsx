import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useParams, useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MealWithComments, MealTypeValues, PhysicalActivityWithExercises } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft,
  CalendarIcon, 
  MessageSquarePlus, 
  Utensils, 
  Activity,
  Clock, 
  Droplets, 
  FileText,
  LayoutDashboard,
  Calendar,
  Check, 
  Info,
  Dumbbell,
  Footprints,
  Heart,
  Timer,
  Bike
} from "lucide-react";

const commentSchema = z.object({
  text: z.string().min(1, "El comentario no puede estar vacío"),
});

type CommentFormValues = z.infer<typeof commentSchema>;

export default function ClientProfile() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [addingCommentToMeal, setAddingCommentToMeal] = useState<MealWithComments | null>(null);

  // Verificar que el usuario es nutricionista
  useEffect(() => {
    if (user && user.role !== 'nutritionist') {
      navigate('/');
    }
  }, [user, navigate]);

  // Obtener información del cliente
  const { 
    data: client,
    isLoading: isLoadingClient 
  } = useQuery({
    queryKey: ['/api/users', clientId],
    queryFn: ({ queryKey }) => fetch(`/api/users/${clientId}`).then(res => res.json()),
    enabled: !!clientId && !!user && user.role === 'nutritionist',
  });

  // Obtener comidas diarias del cliente
  const { 
    data: dailyMeals,
    isLoading: isLoadingMeals 
  } = useQuery({
    queryKey: ['/api/meals/daily', clientId, selectedDate],
    queryFn: ({ queryKey }) => fetch(`/api/meals/daily?userId=${clientId}&date=${selectedDate}`).then(res => res.json()),
    enabled: !!clientId && !!user && user.role === 'nutritionist',
  });

  // Obtener actividad física del cliente
  const { 
    data: physicalActivity,
    isLoading: isLoadingActivity 
  } = useQuery({
    queryKey: ['/api/physical-activity/daily', clientId, selectedDate],
    queryFn: ({ queryKey }) => fetch(`/api/physical-activity/daily?userId=${clientId}&date=${selectedDate}`).then(res => res.json()),
    enabled: !!clientId && !!user && user.role === 'nutritionist',
  });

  // Mutación para añadir comentarios a comidas
  const addCommentMutation = useMutation({
    mutationFn: async (data: { mealId: number, text: string }) => {
      const res = await apiRequest("POST", "/api/comments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meals/daily', clientId, selectedDate] });
      toast({
        title: "Comentario añadido",
        description: "El comentario se ha añadido correctamente",
      });
      setAddingCommentToMeal(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Formulario para comentarios
  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      text: "",
    },
  });

  // Manejar envío de comentario
  function handleSubmitComment(values: CommentFormValues) {
    if (addingCommentToMeal) {
      addCommentMutation.mutate({
        mealId: addingCommentToMeal.id,
        text: values.text,
      });
    }
  }

  // Manejar cambio de fecha
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  // Obtener todos los tipos de comidas que tiene el cliente ese día
  const mealTypes = Object.keys(dailyMeals || {}) as MealTypeValues[];

  // Calcular estadísticas de actividad física
  const totalCaloriesBurned = physicalActivity?.exercises?.reduce(
    (sum: number, exercise: any) => sum + (exercise.caloriesBurned || 0), 
    0
  ) || 0;
  
  const totalExerciseDuration = physicalActivity?.exercises?.reduce(
    (sum: number, exercise: any) => sum + exercise.duration, 
    0
  ) || 0;

  // Formatear un fecha a formato español legible
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "EEEE d 'de' MMMM, yyyy", { locale: es });
  };

  // Obtener icono para el tipo de ejercicio
  const getExerciseIcon = (iconName: string | null | undefined) => {
    switch (iconName) {
      case 'Bike':
        return <Bike className="h-4 w-4" />;
      case 'Footprints':
        return <Footprints className="h-4 w-4" />;
      case 'Heart':
        return <Heart className="h-4 w-4" />;
      case 'Timer':
        return <Timer className="h-4 w-4" />;
      default:
        return <Dumbbell className="h-4 w-4" />;
    }
  };

  if (isLoadingClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudo encontrar al cliente solicitado.
          </AlertDescription>
        </Alert>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/nutritionist-dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <Button variant="ghost" className="mb-2" onClick={() => navigate('/nutritionist-dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al dashboard
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-muted-foreground">{client.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="date-select">Fecha:</Label>
            <Input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
        <Separator className="mt-4" />
      </div>

      <Tabs defaultValue="meals" className="space-y-4">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="meals">
            <Utensils className="mr-2 h-4 w-4" />
            Comidas
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-2 h-4 w-4" />
            Actividad Física
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Comidas del día {formatDate(selectedDate)}
            </h2>
          </div>

          {isLoadingMeals ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : mealTypes.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Sin datos</AlertTitle>
              <AlertDescription>
                No hay comidas registradas para este día.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-6">
              {mealTypes.map((mealType) => (
                <Card key={mealType}>
                  <CardHeader>
                    <CardTitle>{mealType}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dailyMeals[mealType].map((meal: MealWithComments) => (
                        <div key={meal.id} className="bg-card border rounded-md p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{meal.name}</h3>
                              {meal.description && (
                                <p className="text-sm text-muted-foreground">{meal.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {meal.time && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {meal.time}
                                  </Badge>
                                )}
                                {meal.duration && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    {meal.duration} min
                                  </Badge>
                                )}
                                {meal.waterIntake && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Droplets className="h-3 w-3" />
                                    {meal.waterIntake} L
                                  </Badge>
                                )}
                                {meal.calories && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    {meal.calories} kcal
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <DialogTrigger asChild onClick={() => setAddingCommentToMeal(meal)}>
                              <Button variant="ghost" size="icon">
                                <MessageSquarePlus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                          </div>
                          
                          {meal.notes && (
                            <div className="bg-muted p-2 rounded-md">
                              <p className="text-sm italic">{meal.notes}</p>
                            </div>
                          )}
                          
                          {meal.comments && meal.comments.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <h4 className="text-sm font-medium">Comentarios</h4>
                              {meal.comments.map((comment) => (
                                <div key={comment.id} className="bg-primary/10 p-2 rounded-md">
                                  <p className="text-sm">{comment.text}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {comment.user?.name || "Nutricionista"} - {format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Actividad física {formatDate(selectedDate)}
            </h2>
          </div>

          {isLoadingActivity ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !physicalActivity ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Sin datos</AlertTitle>
              <AlertDescription>
                No hay actividad física registrada para este día.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de actividad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col items-center p-3 border rounded-md">
                      <span className="text-2xl font-bold">{physicalActivity.steps || 0}</span>
                      <span className="text-xs text-muted-foreground">Pasos</span>
                    </div>
                    <div className="flex flex-col items-center p-3 border rounded-md">
                      <span className="text-2xl font-bold">{totalCaloriesBurned}</span>
                      <span className="text-xs text-muted-foreground">Calorías</span>
                    </div>
                    <div className="flex flex-col items-center p-3 border rounded-md">
                      <span className="text-2xl font-bold">{physicalActivity.exercises?.length || 0}</span>
                      <span className="text-xs text-muted-foreground">Ejercicios</span>
                    </div>
                    <div className="flex flex-col items-center p-3 border rounded-md">
                      <span className="text-2xl font-bold">{totalExerciseDuration}</span>
                      <span className="text-xs text-muted-foreground">Minutos</span>
                    </div>
                  </div>

                  {physicalActivity.notes && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium">Notas:</h4>
                      <p className="text-sm text-muted-foreground">{physicalActivity.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {physicalActivity.exercises && physicalActivity.exercises.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ejercicios realizados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {physicalActivity.exercises.map((exercise) => (
                        <div key={exercise.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex items-center gap-2">
                            {getExerciseIcon(exercise.exerciseType?.iconName)}
                            <div>
                              <p className="font-medium">{exercise.exerciseType?.name || "Ejercicio"}</p>
                              <p className="text-sm text-muted-foreground">
                                {exercise.duration} minutos • {exercise.caloriesBurned || 0} calorías
                              </p>
                              {exercise.notes && <p className="text-xs italic">{exercise.notes}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogo para añadir comentarios */}
      <Dialog open={!!addingCommentToMeal} onOpenChange={(open) => !open && setAddingCommentToMeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir comentario</DialogTitle>
            <DialogDescription>
              Añade un comentario para la comida "{addingCommentToMeal?.name}".
            </DialogDescription>
          </DialogHeader>
          <Form {...commentForm}>
            <form onSubmit={commentForm.handleSubmit(handleSubmitComment)} className="space-y-4">
              <FormField
                control={commentForm.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentario</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Escribe tu comentario aquí..." 
                        {...field} 
                        className="min-h-[100px]" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAddingCommentToMeal(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={addCommentMutation.isPending}
                >
                  {addCommentMutation.isPending && (
                    <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                  )}
                  Enviar comentario
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}