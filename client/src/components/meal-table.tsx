import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, getStatusBadgeClass } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MealType, MealTypeValues, MealWithComments, DailyMeals } from "@shared/schema";
import { Plus, MessageCircle } from "lucide-react";

interface MealTableProps {
  weekDays: Date[];
  meals: Record<string, DailyMeals>;
  summaries: any[];
  onAddMeal: (day: string, mealType: MealTypeValues) => void;
  onEditMeal: (meal: MealWithComments) => void;
  isNutritionist?: boolean;
}

export default function MealTable({
  weekDays,
  meals,
  summaries,
  onAddMeal,
  onEditMeal,
  isNutritionist = false
}: MealTableProps) {
  // Get meals for a specific day and type
  const getMeals = (day: string, mealType: MealTypeValues): MealWithComments[] => {
    return meals[day]?.[mealType] || [];
  };

  // Get calorie summary for a day
  const getCalories = (day: string): number => {
    const summary = summaries.find(s => format(new Date(s.date), 'yyyy-MM-dd') === day);
    return summary?.caloriesTotal || 0;
  };

  return (
    <div className="bg-card rounded-lg shadow overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                Comida
              </th>
              {weekDays.map((day) => (
                <th key={day.toISOString()} scope="col" className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div>{format(day, 'EEEE', { locale: es })}</div>
                  <div className="text-muted-foreground/70 font-normal">{format(day, 'd MMM', { locale: es })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {/* Desayuno */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">Desayuno</div>
                <div className="text-xs text-muted-foreground">8:00 AM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const mealsList = getMeals(dayStr, MealType.BREAKFAST);
                
                return (
                  <td key={`${dayStr}-breakfast`} className="px-4 py-3">
                    {mealsList.length > 0 ? (
                      <div className="space-y-2">
                        {mealsList.map((meal, index) => (
                          <div 
                            key={meal.id || index}
                            className="text-sm text-foreground cursor-pointer hover:bg-accent/10 p-2 rounded transition-colors"
                            onClick={() => onEditMeal(meal)}
                          >
                            <div className="font-medium">{meal.name}</div>
                            {meal.description && <div className="text-xs text-muted-foreground">{meal.description}</div>}
                            {meal.comments && meal.comments.length > 0 && (
                              <div className="mt-1 flex items-center">
                                <MessageCircle className="h-3 w-3 text-primary mr-1" />
                                <span className="text-xs text-primary">{meal.comments.length} comentario(s)</span>
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.BREAKFAST)}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-2">
                        <div className="italic">No registrado</div>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.BREAKFAST)}
                        >
                          Ver día
                        </Button>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Media Mañana */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">Media Mañana</div>
                <div className="text-xs text-muted-foreground">11:00 AM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const mealsList = getMeals(dayStr, MealType.MORNING_SNACK);
                
                return (
                  <td key={`${dayStr}-morning-snack`} className="px-4 py-3">
                    {mealsList.length > 0 ? (
                      <div className="space-y-2">
                        {mealsList.map((meal, index) => (
                          <div 
                            key={meal.id || index}
                            className="text-sm text-foreground cursor-pointer hover:bg-accent/10 p-2 rounded transition-colors"
                            onClick={() => onEditMeal(meal)}
                          >
                            <div className="font-medium">{meal.name}</div>
                            {meal.description && <div className="text-xs text-muted-foreground">{meal.description}</div>}
                            {meal.comments && meal.comments.length > 0 && (
                              <div className="mt-1 flex items-center">
                                <MessageCircle className="h-3 w-3 text-primary mr-1" />
                                <span className="text-xs text-primary">{meal.comments.length} comentario(s)</span>
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.MORNING_SNACK)}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-2">
                        <div className="italic">No registrado</div>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.MORNING_SNACK)}
                        >
                          Ver día
                        </Button>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Comida */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">Comida</div>
                <div className="text-xs text-muted-foreground">2:00 PM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const mealsList = getMeals(dayStr, MealType.LUNCH);
                
                return (
                  <td key={`${dayStr}-lunch`} className="px-4 py-3">
                    {mealsList.length > 0 ? (
                      <div className="space-y-2">
                        {mealsList.map((meal, index) => (
                          <div 
                            key={meal.id || index}
                            className="text-sm text-foreground cursor-pointer hover:bg-accent/10 p-2 rounded transition-colors"
                            onClick={() => onEditMeal(meal)}
                          >
                            <div className="font-medium">{meal.name}</div>
                            {meal.description && <div className="text-xs text-muted-foreground">{meal.description}</div>}
                            {meal.comments && meal.comments.length > 0 && (
                              <div className="mt-1 flex items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                                  Comentario del nutricionista
                                </span>
                              </div>
                            )}
                            {meal.comments && meal.comments.length > 0 && (
                              <div className="mt-1 text-xs italic text-muted-foreground bg-muted/50 p-1 rounded">
                                {meal.comments[0].content}
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.LUNCH)}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-2">
                        <div className="italic">No registrado</div>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.LUNCH)}
                        >
                          Ver día
                        </Button>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Media Tarde */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">Media Tarde</div>
                <div className="text-xs text-muted-foreground">5:00 PM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const mealsList = getMeals(dayStr, MealType.AFTERNOON_SNACK);
                
                return (
                  <td key={`${dayStr}-afternoon-snack`} className="px-4 py-3">
                    {mealsList.length > 0 ? (
                      <div className="space-y-2">
                        {mealsList.map((meal, index) => (
                          <div 
                            key={meal.id || index}
                            className="text-sm text-foreground cursor-pointer hover:bg-accent/10 p-2 rounded transition-colors"
                            onClick={() => onEditMeal(meal)}
                          >
                            <div className="font-medium">{meal.name}</div>
                            {meal.description && <div className="text-xs text-muted-foreground">{meal.description}</div>}
                            {meal.comments && meal.comments.length > 0 && (
                              <div className="mt-1 flex items-center">
                                <MessageCircle className="h-3 w-3 text-primary mr-1" />
                                <span className="text-xs text-primary">{meal.comments.length} comentario(s)</span>
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.AFTERNOON_SNACK)}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-2">
                        <div className="italic">No registrado</div>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.AFTERNOON_SNACK)}
                        >
                          Ver día
                        </Button>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Cena */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">Cena</div>
                <div className="text-xs text-muted-foreground">9:00 PM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const mealsList = getMeals(dayStr, MealType.DINNER);
                
                return (
                  <td key={`${dayStr}-dinner`} className="px-4 py-3">
                    {mealsList.length > 0 ? (
                      <div className="space-y-2">
                        {mealsList.map((meal, index) => (
                          <div 
                            key={meal.id || index}
                            className="text-sm text-foreground cursor-pointer hover:bg-accent/10 p-2 rounded transition-colors"
                            onClick={() => onEditMeal(meal)}
                          >
                            <div className="font-medium">{meal.name}</div>
                            {meal.description && <div className="text-xs text-muted-foreground">{meal.description}</div>}
                            {meal.comments && meal.comments.length > 0 && (
                              <div className="mt-1 flex items-center">
                                <MessageCircle className="h-3 w-3 text-primary mr-1" />
                                <span className="text-xs text-primary">{meal.comments.length} comentario(s)</span>
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.DINNER)}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-2">
                        <div className="italic">No registrado</div>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => onAddMeal(dayStr, MealType.DINNER)}
                        >
                          Ver día
                        </Button>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Calorías */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">Calorías</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const calories = getCalories(dayStr);
                
                return (
                  <td key={`${dayStr}-calories`} className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground p-2">
                      {calories > 0 ? calories.toLocaleString() : '-'}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
