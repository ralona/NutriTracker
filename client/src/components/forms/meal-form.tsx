import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InsertMeal, MealType, MealTypeValues, MealWithComments, Comment } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";

// Schema for the form
const mealFormSchema = z.object({
  type: z.string().refine(val => Object.values(MealType).includes(val as MealTypeValues), {
    message: "Tipo de comida no válido"
  }),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional().nullable(),
  calories: z.coerce.number().min(0, "Las calorías no pueden ser negativas").optional().nullable(),
  time: z.string().optional().nullable(),
  duration: z.coerce.number().min(1, "La duración debe ser mayor a 0").optional().nullable(),
  waterIntake: z.coerce.number().min(0, "La cantidad de agua no puede ser negativa").optional().nullable(),
  notes: z.string().optional().nullable()
});

type MealFormValues = z.infer<typeof mealFormSchema>;

interface MealFormProps {
  initialData?: MealWithComments;
  mealType?: MealTypeValues | null;
  onSubmit: (data: InsertMeal | Partial<InsertMeal>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  addComment?: (content: string) => void;
  isNutritionist?: boolean;
  comments?: Comment[];
}

export default function MealForm({ 
  initialData, 
  mealType, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  addComment,
  isNutritionist = false,
  comments = []
}: MealFormProps) {
  const [newComment, setNewComment] = useState("");
  
  // Default values for the form
  const defaultValues: MealFormValues = {
    type: initialData?.type || mealType || MealType.BREAKFAST,
    name: initialData?.name || "",
    description: initialData?.description || "",
    calories: initialData?.calories || undefined,
    time: initialData?.time || "",
    duration: initialData?.duration || undefined,
    waterIntake: initialData?.waterIntake || undefined,
    notes: initialData?.notes || ""
  };

  // Form setup
  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema),
    defaultValues
  });

  // Submit handler
  const handleSubmit = (values: MealFormValues) => {
    onSubmit(values);
  };

  // Add comment handler
  const handleAddComment = () => {
    if (newComment.trim() && addComment) {
      addComment(newComment.trim());
      setNewComment("");
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de comida</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value} 
                  disabled={!!mealType || isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de comida" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(MealType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la comida</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Pollo con verduras" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (opcional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe los ingredientes o proceso de preparación" 
                    {...field} 
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="calories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calorías (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 300" 
                      {...field}
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="time" 
                      {...field}
                      value={field.value || ""}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración (minutos) (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 15" 
                      {...field}
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="waterIntake"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agua consumida (litros) (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      placeholder="Ej: 0.5" 
                      {...field}
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas personales (opcional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Añade notas personales sobre cómo te sentiste con esta comida" 
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : initialData ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Comments section */}
      {initialData && (
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Comentarios</h3>
          
          {comments.length > 0 ? (
            <div className="space-y-3 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600 italic">{comment.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(comment.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic mb-4">No hay comentarios</p>
          )}
          
          {isNutritionist && addComment && (
            <div className="space-y-2">
              <Textarea
                placeholder="Añade un comentario profesional..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="text-sm"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Añadir comentario
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
