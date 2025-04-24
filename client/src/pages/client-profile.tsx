import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Calendar,
  UserRound,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Utensils,
  Droplets,
  CalendarRange,
  Activity,
  Footprints,
  Send,
  Timer,
  Trophy,
  BarChart4
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ClientWithSummary, 
  MealTypeValues, 
  MealType, 
  DailyMeals, 
  MealWithComments,
  Comment,
  PhysicalActivityWithExercises,
  ExerciseEntry,
  HealthAppIntegration,
  User
} from "@shared/schema";

// Extender el tipo para la vista del nutricionista
interface ExtendedClientProfile extends User {
  latestMeal?: any;
  progress: number;
  pendingComments: number;
  lastWeekStatus: 'Bien' | 'Regular' | 'Insuficiente';
  activePlan?: any;
  latestActivity?: any;
  healthIntegration?: HealthAppIntegration;
}

// Tipo custom para las comidas con propiedades adicionales
interface ExtendedMeal {
  id: number;
  name: string;
  userId: number;
  type: string;
  description: string | null;
  date: Date;
  calories: number | null;
  time: string | null;
  duration: number | null;
  notes: string | null;
  water?: number | null;
  waterIntake?: number | null;
  comments: Comment[];
}

// Tipo custom para ejercicios con propiedades adicionales
interface ExtendedExerciseEntry {
  id: number;
  duration: number;
  notes: string | null;
  activityId: number;
  exerciseTypeId: number;
  caloriesBurned: number | null;
  startTime: Date | null;
  intensity?: 'high' | 'medium' | 'low';
  exerciseType: {
    name: string;
    iconName?: string | null;
  };
}

// Esquema para comentarios de nutricionista
const commentSchema = z.object({
  content: z.string().min(1, "El comentario no puede estar vacío"),
  mealId: z.number()
});

type CommentFormValues = z.infer<typeof commentSchema>;

export default function ClientProfile() {
  const [, navigate] = useLocation();
  const { clientId } = useParams();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"meals" | "activities">("meals");
  
  // Consultar datos del cliente
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/nutritionist/clients/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/nutritionist/clients/${clientId}`);
      return res.json();
    }
  });
  
  // Consultar comidas del cliente para la fecha seleccionada
  const { 
    data: dailyMeals = {}, 
    isLoading: isLoadingMeals 
  } = useQuery({
    queryKey: [`/api/nutritionist/clients/${clientId}/meals/daily`, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const res = await apiRequest(
        "GET", 
        `/api/nutritionist/clients/${clientId}/meals/daily?date=${format(selectedDate, 'yyyy-MM-dd')}`
      );
      return res.json();
    },
    enabled: activeTab === "meals" && !!clientId
  });
  
  // Consultar actividad física del cliente para la fecha seleccionada
  const { 
    data: activity, 
    isLoading: isLoadingActivity 
  } = useQuery({
    queryKey: [`/api/nutritionist/clients/${clientId}/activities`, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const res = await apiRequest(
        "GET", 
        `/api/nutritionist/clients/${clientId}/activities?date=${format(selectedDate, 'yyyy-MM-dd')}`
      );
      return res.json();
    },
    enabled: activeTab === "activities" && !!clientId
  });
  
  // Formulario para añadir comentarios
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
      mealId: 0
    }
  });
  
  // Mutación para agregar comentarios
  const commentMutation = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      const res = await apiRequest("POST", "/api/comments", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Comentario añadido",
        description: "Se ha añadido el comentario correctamente"
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/nutritionist/clients/${clientId}/meals/daily`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al añadir comentario",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  function handleSubmitComment(values: CommentFormValues) {
    commentMutation.mutate(values);
  }
  
  function handleDateChange(newDate: Date | null) {
    if (newDate) {
      setSelectedDate(newDate);
    }
  }
  
  // Si está cargando, mostrar skeleton
  if (isLoadingClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
        <Tabs defaultValue="meals">
          <TabsList className="w-full md:w-auto">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </TabsList>
          <div className="mt-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </Tabs>
      </div>
    );
  }
  
  // Si no se encuentra el cliente, mostrar error
  if (!client) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Cliente no encontrado</CardTitle>
          <CardDescription>
            No se ha podido encontrar el cliente solicitado o no tienes permiso para acceder.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate("/nutritionist")}>
            Volver al panel
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Preparar los datos para mostrar
  const clientData = client as ExtendedClientProfile;
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Perfil del Paciente</h1>
          <p className="text-muted-foreground">
            Visualiza y gestiona la información nutricional de tu paciente
          </p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => navigate("/nutritionist")}
        >
          <UserRound className="size-4" />
          <span>Volver a pacientes</span>
        </Button>
      </div>
      
      {/* Tarjeta de información del cliente */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="size-16 bg-primary">
              <AvatarFallback className="text-lg">
                {getInitials(clientData.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {clientData.name}
                {clientData.active ? (
                  <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-200">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full bg-red-50 text-red-700 border-red-200">
                    Inactivo
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                <span>{clientData.email}</span>
              </div>
              {clientData.latestMeal && (
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Utensils className="size-4" />
                  <span>Última comida: {format(new Date(clientData.latestMeal.date), 'dd/MM/yyyy')}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Progreso */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart4 className="size-5 text-primary" />
                  Progreso general
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0">
                <div className="flex flex-col items-center py-4">
                  <div className="relative w-24 h-24 mb-4">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-3xl font-bold">{clientData.progress}%</div>
                    </div>
                    <svg
                      className="w-24 h-24 transform -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        className="text-muted stroke-current"
                        strokeWidth="10"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className="text-primary stroke-current"
                        strokeWidth="10"
                        strokeDasharray={`${clientData.progress * 2.51} 251`}
                        strokeLinecap="round"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                    </svg>
                  </div>
                  <Badge className={
                    clientData.lastWeekStatus === 'Bien' 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                      : clientData.lastWeekStatus === 'Regular'
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }>
                    {clientData.lastWeekStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {/* Comentarios pendientes */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="size-5 text-primary" />
                  Comentarios pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0">
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="text-4xl font-bold mb-2">
                    {clientData.pendingComments}
                  </div>
                  <span className="text-sm text-muted-foreground">comentarios sin leer</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Estado de la app de salud */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="size-5 text-primary" />
                  Integración con app de salud
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0">
                <div className="flex flex-col items-center justify-center py-6">
                  {clientData.healthIntegration ? (
                    <>
                      <div className="bg-green-100 text-green-800 p-2 rounded-full mb-2">
                        <CheckCircle2 className="size-8" />
                      </div>
                      <span className="text-sm font-medium">Conectado a {
                        clientData.healthIntegration.provider === 'google_fit' 
                          ? 'Google Fit' 
                          : 'Apple Health'
                      }</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Última sincronización: {
                          clientData.healthIntegration.lastSynced
                            ? format(new Date(clientData.healthIntegration.lastSynced), 'dd/MM/yyyy HH:mm')
                            : 'Nunca'
                        }
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="bg-amber-100 text-amber-800 p-2 rounded-full mb-2">
                        <AlertCircle className="size-8" />
                      </div>
                      <span className="text-sm font-medium">No conectado</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        El paciente no ha conectado ninguna app de salud
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {/* Pestañas para comidas y actividades */}
      <Tabs defaultValue="meals" value={activeTab} onValueChange={(value) => setActiveTab(value as "meals" | "activities")}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="meals" className="flex gap-2 items-center">
              <Utensils className="size-4" />
              <span>Comidas</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex gap-2 items-center">
              <Activity className="size-4" />
              <span>Actividad física</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateChange(new Date(selectedDate.getTime() - 86400000))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-w-32"
              onClick={() => setSelectedDate(new Date())}
            >
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateChange(new Date(selectedDate.getTime() + 86400000))}
            >
              Siguiente
            </Button>
          </div>
        </div>
        
        {/* Contenido de pestañas */}
        <TabsContent value="meals" className="mt-0">
          {isLoadingMeals ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center gap-2">
                    <Utensils className="size-10 text-muted-foreground animate-pulse" />
                    <p className="text-muted-foreground">Cargando comidas del día...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : Object.keys(dailyMeals).length === 0 ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="size-10 text-muted-foreground" />
                    <p className="text-muted-foreground">No hay comidas registradas para este día</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Mostrar comidas por tipo */}
              {Object.entries(MealType).map(([key, mealType]) => {
                const meals = dailyMeals[mealType as MealTypeValues];
                if (!meals || meals.length === 0) return null;
                
                return (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <CardTitle>{mealType}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {meals.map((meal: ExtendedMeal) => (
                        <div key={meal.id} className="border rounded-md p-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                            <h4 className="font-medium">{meal.name}</h4>
                            <div className="flex items-center gap-2">
                              {meal.duration && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Clock className="size-3.5" />
                                  <span>{meal.duration} min</span>
                                </Badge>
                              )}
                              {meal.water && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Droplets className="size-3.5" />
                                  <span>{meal.water} L</span>
                                </Badge>
                              )}
                              {meal.calories && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Trophy className="size-3.5" />
                                  <span>{meal.calories} kcal</span>
                                </Badge>
                              )}
                            </div>
                          </div>
                          {meal.description && (
                            <p className="text-sm text-muted-foreground mb-3">{meal.description}</p>
                          )}
                          
                          {/* Comentarios */}
                          {meal.comments && meal.comments.length > 0 && (
                            <div className="mt-4 space-y-3 bg-muted/50 p-3 rounded-md">
                              <h5 className="text-sm font-medium">Comentarios</h5>
                              <div className="space-y-3">
                                {meal.comments.map((comment: Comment) => (
                                  <div key={comment.id} className="flex gap-3">
                                    <Avatar className="size-8">
                                      <AvatarFallback className="text-xs bg-primary">
                                        {comment.nutritionistId ? "N" : "P"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="text-sm">
                                        {comment.content}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm')}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Formulario para añadir comentarios */}
                          <div className="mt-4">
                            <Form {...form}>
                              <form 
                                onSubmit={form.handleSubmit((values) => {
                                  handleSubmitComment({
                                    ...values,
                                    mealId: meal.id
                                  });
                                })} 
                                className="flex gap-2"
                              >
                                <FormField
                                  control={form.control}
                                  name="content"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input 
                                          placeholder="Añadir comentario..." 
                                          {...field} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button 
                                  type="submit" 
                                  size="sm"
                                  disabled={commentMutation.isPending}
                                >
                                  {commentMutation.isPending ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  ) : (
                                    <Send className="size-4" />
                                  )}
                                </Button>
                              </form>
                            </Form>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="activities" className="mt-0">
          {isLoadingActivity ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="size-10 text-muted-foreground animate-pulse" />
                    <p className="text-muted-foreground">Cargando actividad física...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : !activity ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="size-10 text-muted-foreground" />
                    <p className="text-muted-foreground">No hay actividad física registrada para este día</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Actividad Física</CardTitle>
                <CardDescription>
                  {format(parseISO(activity.date.toString()), "EEEE d 'de' MMMM", { locale: es })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resumen diario */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Footprints className="size-5 text-primary" />
                      <h4 className="font-medium">Pasos</h4>
                    </div>
                    <div className="text-3xl font-bold">{activity.steps}</div>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Timer className="size-5 text-primary" />
                      <h4 className="font-medium">Tiempo activo</h4>
                    </div>
                    <div className="text-3xl font-bold">{activity.activeMinutes} min</div>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="size-5 text-primary" />
                      <h4 className="font-medium">Calorías quemadas</h4>
                    </div>
                    <div className="text-3xl font-bold">{activity.caloriesBurned} kcal</div>
                  </div>
                </div>
                
                {/* Ejercicios realizados */}
                {(activity as PhysicalActivityWithExercises).exercises && (activity as PhysicalActivityWithExercises).exercises.length > 0 ? (
                  <div>
                    <h4 className="font-medium mb-3">Ejercicios realizados</h4>
                    <div className="space-y-3">
                      {(activity as PhysicalActivityWithExercises).exercises.map((exercise: ExtendedExerciseEntry) => (
                        <div key={exercise.id} className="flex items-center gap-3 border rounded-md p-3">
                          <div className="bg-primary/10 rounded-full p-2">
                            <Activity className="size-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{exercise.exerciseType.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {exercise.duration} min {exercise.intensity ? `• ${exercise.intensity === 'high' ? 'Alta intensidad' : exercise.intensity === 'medium' ? 'Intensidad media' : 'Baja intensidad'}` : ''}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {exercise.caloriesBurned} kcal
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/20 rounded-lg p-4 text-center text-muted-foreground">
                    No se han registrado ejercicios específicos este día
                  </div>
                )}
                
                {/* Nota o comentario */}
                {activity.notes && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Notas</h4>
                    <div className="bg-muted/20 rounded-lg p-4 text-sm">
                      {activity.notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}