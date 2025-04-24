import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, parseISO, startOfDay, addDays } from "date-fns";
import { es } from "date-fns/locale";

import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import OAuthDialog from "@/components/oauth-dialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

import { 
  AlertCircle, 
  Award, 
  Calendar, 
  Dumbbell, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Watch,
  Bike,
  Footprints,
  Music,
  Volleyball,
  Timer,
  Heart,
  PersonStanding,
  Waves,
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Definir los esquemas para los formularios
const activityFormSchema = z.object({
  date: z.preprocess(
    // Convertir string a Date si es necesario
    (arg) => arg instanceof Date ? arg : new Date(arg as string),
    z.date()
  ),
  steps: z.number().min(0).default(0),
  notes: z.string().optional()
});

const exerciseFormSchema = z.object({
  activityId: z.number(),
  exerciseTypeId: z.number(),
  duration: z.number().min(1, "La duración debe ser al menos 1 minuto"),
  caloriesBurned: z.number().min(0, "Las calorías no pueden ser negativas").optional(),
  notes: z.string().optional(),
  startTime: z.string().transform(val => val === "" ? null : val).optional(),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;
type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

// Función para obtener el icono correspondiente según el nombre del icono
const getExerciseIcon = (iconName: string | null | undefined) => {
  switch (iconName) {
    case 'Volleyball':
      return <Volleyball className="h-4 w-4 text-primary" />;
    case 'Bike':
      return <Bike className="h-4 w-4 text-primary" />;
    case 'Footprints':
      return <Footprints className="h-4 w-4 text-primary" />;
    case 'Waves':
      return <Waves className="h-4 w-4 text-primary" />;
    case 'Music':
      return <Music className="h-4 w-4 text-primary" />;
    case 'PersonStanding':
      return <PersonStanding className="h-4 w-4 text-primary" />;
    case 'Dumbbell':
      return <Dumbbell className="h-4 w-4 text-primary" />;
    case 'Timer':
      return <Timer className="h-4 w-4 text-primary" />;
    case 'Heart':
      return <Heart className="h-4 w-4 text-primary" />;
    default:
      return <Dumbbell className="h-4 w-4 text-primary" />;
  }
};

const ExerciseEntry = ({ exercise, onDelete }: { 
  exercise: any, 
  onDelete: () => void 
}) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md mb-2 bg-card">
      <div className="flex items-center gap-2">
        {getExerciseIcon(exercise.exerciseType?.iconName)}
        <div>
          <p className="font-medium">{exercise.exerciseType?.name || "Ejercicio"}</p>
          <p className="text-sm text-muted-foreground">{exercise.duration} minutos • {exercise.caloriesBurned || 0} calorías</p>
          {exercise.notes && <p className="text-xs italic">{exercise.notes}</p>}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
};

export default function ActivityTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isHealthAppDialogOpen, setIsHealthAppDialogOpen] = useState(false);
  const [isOAuthDialogOpen, setIsOAuthDialogOpen] = useState(false);
  const [oAuthProvider, setOAuthProvider] = useState<'google_fit' | 'apple_health'>('apple_health');
  
  // Query para obtener los tipos de ejercicio
  const { data: exerciseTypes = [] } = useQuery({
    queryKey: ['/api/exercise-types'],
    queryFn: getQueryFn(),
  });

  // Query para obtener la actividad del día seleccionado
  const { 
    data: dailyActivity, 
    isLoading: isLoadingActivity,
    refetch: refetchActivity
  } = useQuery({
    queryKey: ['/api/physical-activity/daily', selectedDate],
    queryFn: getQueryFn({ baseURL: `/api/physical-activity/daily?date=${selectedDate}` }),
  });
  
  // Mutation para crear o actualizar actividad física
  const activityMutation = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      // Convertir fecha a formato ISO 8601 para el API
      const formattedData = {
        ...data,
        date: data.date.toISOString()
      };
      
      console.log("Enviando datos al servidor:", formattedData);
      
      const res = await apiRequest('POST', '/api/physical-activity', formattedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/physical-activity/daily', selectedDate] });
      setIsAddingActivity(false);
      toast({
        title: "Actividad registrada",
        description: "Se ha registrado la actividad física correctamente.",
      });
    },
    onError: (error: any) => {
      let errorMessage = error.message;
      // Si hay un error de validación, formatearlo de manera más amigable
      if (error.message && error.message.includes("errors")) {
        try {
          const errorData = JSON.parse(error.message.substring(error.message.indexOf('{')));
          if (errorData.errors && errorData.errors.length > 0) {
            errorMessage = errorData.errors.map((e: any) => e.message).join(", ");
          }
        } catch (e) {
          // Si no puede parsearse, usar el mensaje original
        }
      }
      toast({
        title: "Error al registrar actividad",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para agregar ejercicio
  const exerciseMutation = useMutation({
    mutationFn: async (data: ExerciseFormValues) => {
      // Asegurar que startTime sea null si está vacío
      const modifiedData = {
        ...data,
        startTime: data.startTime === "" ? null : data.startTime
      };
      
      console.log("Enviando ejercicio al servidor:", modifiedData);
      const res = await apiRequest('POST', '/api/exercise-entries', modifiedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/physical-activity/daily', selectedDate] });
      setIsAddingExercise(false);
      toast({
        title: "Ejercicio agregado",
        description: "Se ha agregado el ejercicio correctamente.",
      });
    },
    onError: (error: any) => {
      let errorMessage = error.message;
      // Si hay un error de validación, formatearlo de manera más amigable
      if (error.message && error.message.includes("errors")) {
        try {
          const errorData = JSON.parse(error.message.substring(error.message.indexOf('{')));
          if (errorData.errors && errorData.errors.length > 0) {
            errorMessage = errorData.errors.map((e: any) => e.message).join(", ");
          }
        } catch (e) {
          // Si no puede parsearse, usar el mensaje original
        }
      }
      toast({
        title: "Error al agregar ejercicio",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para eliminar ejercicio
  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: number) => {
      await apiRequest('DELETE', `/api/exercise-entries/${exerciseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/physical-activity/daily', selectedDate] });
      toast({
        title: "Ejercicio eliminado",
        description: "Se ha eliminado el ejercicio correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para sincronizar con Google Fit/Apple Health
  const syncHealthAppMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/health-app-sync');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/physical-activity/daily', selectedDate] });
      toast({
        title: "Datos sincronizados",
        description: "Se han sincronizado los datos con tu aplicación de salud.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de sincronización",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Formulario para actividad física
  const activityForm = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      date: new Date(selectedDate),
      steps: 0,
      notes: "",
    },
  });
  
  // Formulario para ejercicio
  const exerciseForm = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      activityId: 0,
      exerciseTypeId: 0,
      duration: 30,
      caloriesBurned: 0,
      notes: "",
      startTime: ""
    },
  });
  
  // Actualizar el formulario de actividad cuando cambia la fecha seleccionada
  useEffect(() => {
    activityForm.setValue("date", new Date(selectedDate));
  }, [selectedDate, activityForm]);
  
  // Actualizar el formulario de ejercicio cuando se carga la actividad diaria
  useEffect(() => {
    if (dailyActivity?.id) {
      exerciseForm.setValue("activityId", dailyActivity.id);
    }
  }, [dailyActivity, exerciseForm]);
  
  // Función para manejar el envío del formulario de actividad
  function onSubmitActivity(data: ActivityFormValues) {
    activityMutation.mutate(data);
  }
  
  // Función para manejar el envío del formulario de ejercicio
  function onSubmitExercise(data: ExerciseFormValues) {
    exerciseMutation.mutate(data);
  }
  
  // Función para eliminar un ejercicio
  function handleDeleteExercise(exerciseId: number) {
    deleteExerciseMutation.mutate(exerciseId);
  }
  
  // Función para sincronizar con Google Fit/Apple Health
  function handleSyncWithHealthApp() {
    syncHealthAppMutation.mutate();
  }
  
  // Función para formatear la fecha en español
  function formatDateInSpanish(dateString: string) {
    const date = parseISO(dateString);
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  }
  
  // Calcular total de calorías quemadas en ejercicios
  const totalCaloriesBurned = dailyActivity?.exercises?.reduce(
    (sum, exercise) => sum + (exercise.caloriesBurned || 0), 
    0
  ) || 0;
  
  // Calcular duración total de ejercicios
  const totalExerciseDuration = dailyActivity?.exercises?.reduce(
    (sum, exercise) => sum + exercise.duration, 
    0
  ) || 0;
  
  // Determinar el nivel de actividad basado en pasos y ejercicios
  function getActivityLevel() {
    const steps = dailyActivity?.steps || 0;
    const exerciseMinutes = totalExerciseDuration;
    
    if (steps > 10000 || exerciseMinutes > 60) {
      return { level: "Alto", color: "bg-green-500" };
    } else if (steps > 5000 || exerciseMinutes > 30) {
      return { level: "Moderado", color: "bg-yellow-500" };
    } else {
      return { level: "Bajo", color: "bg-red-500" };
    }
  }
  
  const activityLevel = getActivityLevel();
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Actividad Física</h1>
            <p className="text-muted-foreground">
              Registra tu actividad física diaria y tus ejercicios.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="date-select">Fecha:</Label>
              <Input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsHealthAppDialogOpen(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar con App de Salud
            </Button>
          </div>
        </div>
        
        {isLoadingActivity ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Resumen de actividad */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen del día</CardTitle>
                <CardDescription>{formatDateInSpanish(selectedDate)}</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyActivity ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Nivel de actividad:</span>
                      <Badge className={activityLevel.color}>{activityLevel.level}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col items-center p-3 border rounded-md">
                        <span className="text-2xl font-bold">{dailyActivity.steps || 0}</span>
                        <span className="text-xs text-muted-foreground">Pasos</span>
                      </div>
                      <div className="flex flex-col items-center p-3 border rounded-md">
                        <span className="text-2xl font-bold">{totalCaloriesBurned}</span>
                        <span className="text-xs text-muted-foreground">Calorías</span>
                      </div>
                      <div className="flex flex-col items-center p-3 border rounded-md">
                        <span className="text-2xl font-bold">{dailyActivity.exercises?.length || 0}</span>
                        <span className="text-xs text-muted-foreground">Ejercicios</span>
                      </div>
                      <div className="flex flex-col items-center p-3 border rounded-md">
                        <span className="text-2xl font-bold">{totalExerciseDuration}</span>
                        <span className="text-xs text-muted-foreground">Minutos</span>
                      </div>
                    </div>
                    
                    {dailyActivity.notes && (
                      <div>
                        <p className="text-sm font-medium">Notas:</p>
                        <p className="text-sm text-muted-foreground">{dailyActivity.notes}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          activityForm.setValue("steps", dailyActivity.steps || 0);
                          activityForm.setValue("notes", dailyActivity.notes || "");
                          setIsAddingActivity(true);
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert variant="default">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No hay datos de actividad</AlertTitle>
                      <AlertDescription>
                        No se ha registrado ninguna actividad física para este día.
                      </AlertDescription>
                    </Alert>
                    <div className="flex justify-center">
                      <Button onClick={() => setIsAddingActivity(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar actividad
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Lista de ejercicios */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Ejercicios realizados</CardTitle>
                  <CardDescription>Ejercicios registrados para este día</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingExercise(true)}
                  disabled={!dailyActivity}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar ejercicio
                </Button>
              </CardHeader>
              <CardContent>
                {!dailyActivity || !dailyActivity.exercises || dailyActivity.exercises.length === 0 ? (
                  <div className="text-center p-6">
                    <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">No hay ejercicios registrados</h3>
                    <p className="text-sm text-muted-foreground">
                      Agrega ejercicios para llevar un seguimiento de tu actividad física.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dailyActivity.exercises.map((exercise: any) => (
                        <ExerciseEntry 
                          key={exercise.id} 
                          exercise={exercise} 
                          onDelete={() => handleDeleteExercise(exercise.id)} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Sheet para agregar/editar actividad */}
      <Sheet open={isAddingActivity} onOpenChange={setIsAddingActivity}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Registrar actividad física</SheetTitle>
            <SheetDescription>
              Registra tu actividad física para el día {formatDateInSpanish(selectedDate)}.
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <Form {...activityForm}>
              <form onSubmit={activityForm.handleSubmit(onSubmitActivity)} className="space-y-6">
                <FormField
                  control={activityForm.control}
                  name="steps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pasos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Número de pasos realizados en el día.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={activityForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Añade cualquier nota sobre tu actividad física..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingActivity(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={activityMutation.isPending}
                  >
                    {activityMutation.isPending && (
                      <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                    )}
                    Guardar
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Sheet para agregar ejercicio */}
      <Sheet open={isAddingExercise} onOpenChange={setIsAddingExercise}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Agregar ejercicio</SheetTitle>
            <SheetDescription>
              Registra un ejercicio para el día {formatDateInSpanish(selectedDate)}.
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <Form {...exerciseForm}>
              <form onSubmit={exerciseForm.handleSubmit(onSubmitExercise)} className="space-y-6">
                <FormField
                  control={exerciseForm.control}
                  name="exerciseTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de ejercicio</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo de ejercicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {exerciseTypes.map((type: any) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={exerciseForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duración (minutos)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={exerciseForm.control}
                    name="caloriesBurned"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calorías quemadas</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={exerciseForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de inicio (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          onChange={(e) => {
                            // Si está vacío, asignar null explícitamente
                            field.onChange(e.target.value === "" ? null : e.target.value);
                          }}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={exerciseForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Añade cualquier nota sobre este ejercicio..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingExercise(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={exerciseMutation.isPending}
                  >
                    {exerciseMutation.isPending && (
                      <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                    )}
                    Guardar
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Diálogo de integración con aplicaciones de salud */}
      <Dialog open={isHealthAppDialogOpen} onOpenChange={setIsHealthAppDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Conectar con App de Salud</DialogTitle>
            <DialogDescription>
              Conecta tu cuenta con Google Fit o Apple Health para sincronizar automáticamente tus datos de actividad física.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-accent">
                <div className="mr-3 bg-red-100 p-2 rounded-full">
                  <Heart className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Apple Health</h4>
                  <p className="text-sm text-muted-foreground">Sincroniza datos desde tu iPhone o Apple Watch</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setIsHealthAppDialogOpen(false);
                    setOAuthProvider("apple_health");
                    setIsOAuthDialogOpen(true);
                  }}
                >
                  Conectar
                </Button>
              </div>
              
              <div className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-accent">
                <div className="mr-3 bg-blue-100 p-2 rounded-full">
                  <Timer className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Google Fit</h4>
                  <p className="text-sm text-muted-foreground">Sincroniza datos desde tu dispositivo Android o Wear OS</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setIsHealthAppDialogOpen(false);
                    setOAuthProvider("google_fit");
                    setIsOAuthDialogOpen(true);
                  }}
                >
                  Conectar
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium">Sincronización manual</h4>
              <p className="text-sm text-muted-foreground">Puedes sincronizar manualmente tus datos si ya tienes una integración configurada.</p>
              <Button 
                className="w-full" 
                onClick={() => {
                  handleSyncWithHealthApp();
                  setIsHealthAppDialogOpen(false);
                }}
                disabled={syncHealthAppMutation.isPending}
              >
                {syncHealthAppMutation.isPending && (
                  <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                )}
                Sincronizar ahora
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHealthAppDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de OAuth */}
      <OAuthDialog 
        open={isOAuthDialogOpen} 
        onClose={() => setIsOAuthDialogOpen(false)}
        provider={oAuthProvider}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/health-app-integration'] });
          toast({
            title: "Conexión exitosa",
            description: `Se ha conectado correctamente con ${oAuthProvider === 'google_fit' ? 'Google Fit' : 'Apple Health'}.`,
          });
        }}
      />
    </div>
  );
}

// Helper function for query
function getQueryFn(options: { baseURL?: string; on401?: 'throw' | 'returnNull' } = {}) {
  return async ({ queryKey }: { queryKey: string[] }) => {
    const path = options.baseURL || queryKey[0];
    try {
      const res = await fetch(path);
      
      if (res.status === 404) {
        return null;
      }
      
      if (res.status === 401) {
        if (options.on401 === 'returnNull') {
          return null;
        }
        throw new Error('Unauthorized');
      }
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  };
}