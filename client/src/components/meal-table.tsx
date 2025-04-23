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
  // Get meal for a specific day and type
  const getMeal = (day: string, mealType: MealTypeValues): MealWithComments | undefined => {
    return meals[day]?.[mealType];
  };

  // Get calorie summary for a day
  const getCalories = (day: string): number => {
    const summary = summaries.find(s => format(new Date(s.date), 'yyyy-MM-dd') === day);
    return summary?.caloriesTotal || 0;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Comida
              </th>
              {weekDays.map((day) => (
                <th key={day.toISOString()} scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div>{format(day, 'EEEE', { locale: es })}</div>
                  <div className="text-gray-400 font-normal">{format(day, 'd MMM', { locale: es })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Desayuno */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">Desayuno</div>
                <div className="text-xs text-gray-500">8:00 AM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const meal = getMeal(dayStr, MealType.BREAKFAST);
                
                return (
                  <td key={`${dayStr}-breakfast`} className="px-4 py-3">
                    {meal ? (
                      <div 
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => onEditMeal(meal)}
                      >
                        <div className="font-medium">{meal.name}</div>
                        {meal.description && <div className="text-xs text-gray-500">{meal.description}</div>}
                        {meal.comments && meal.comments.length > 0 && (
                          <div className="mt-1 flex items-center">
                            <MessageCircle className="h-3 w-3 text-primary-500 mr-1" />
                            <span className="text-xs text-primary-600">{meal.comments.length} comentario(s)</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 p-2">
                        <div className="italic">No registrado</div>
                        {!isNutritionist && (
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs text-primary-600 hover:text-primary-800"
                            onClick={() => onAddMeal(dayStr, MealType.BREAKFAST)}
                          >
                            + Añadir
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Media Mañana */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">Media Mañana</div>
                <div className="text-xs text-gray-500">11:00 AM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const meal = getMeal(dayStr, MealType.MORNING_SNACK);
                
                return (
                  <td key={`${dayStr}-morning-snack`} className="px-4 py-3">
                    {meal ? (
                      <div 
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => onEditMeal(meal)}
                      >
                        <div className="font-medium">{meal.name}</div>
                        {meal.description && <div className="text-xs text-gray-500">{meal.description}</div>}
                        {meal.comments && meal.comments.length > 0 && (
                          <div className="mt-1 flex items-center">
                            <MessageCircle className="h-3 w-3 text-primary-500 mr-1" />
                            <span className="text-xs text-primary-600">{meal.comments.length} comentario(s)</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 p-2">
                        <div className="italic">No registrado</div>
                        {!isNutritionist && (
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs text-primary-600 hover:text-primary-800"
                            onClick={() => onAddMeal(dayStr, MealType.MORNING_SNACK)}
                          >
                            + Añadir
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Comida */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">Comida</div>
                <div className="text-xs text-gray-500">2:00 PM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const meal = getMeal(dayStr, MealType.LUNCH);
                
                return (
                  <td key={`${dayStr}-lunch`} className="px-4 py-3">
                    {meal ? (
                      <div 
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => onEditMeal(meal)}
                      >
                        <div className="font-medium">{meal.name}</div>
                        {meal.description && <div className="text-xs text-gray-500">{meal.description}</div>}
                        {meal.comments && meal.comments.length > 0 && (
                          <div className="mt-1 flex items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Comentario del nutricionista
                            </span>
                          </div>
                        )}
                        {meal.comments && meal.comments.length > 0 && (
                          <div className="mt-1 text-xs italic text-gray-600 bg-gray-50 p-1 rounded">
                            {meal.comments[0].content}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 p-2">
                        <div className="italic">No registrado</div>
                        {!isNutritionist && (
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs text-primary-600 hover:text-primary-800"
                            onClick={() => onAddMeal(dayStr, MealType.LUNCH)}
                          >
                            + Añadir
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Media Tarde */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">Media Tarde</div>
                <div className="text-xs text-gray-500">5:00 PM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const meal = getMeal(dayStr, MealType.AFTERNOON_SNACK);
                
                return (
                  <td key={`${dayStr}-afternoon-snack`} className="px-4 py-3">
                    {meal ? (
                      <div 
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => onEditMeal(meal)}
                      >
                        <div className="font-medium">{meal.name}</div>
                        {meal.description && <div className="text-xs text-gray-500">{meal.description}</div>}
                        {meal.comments && meal.comments.length > 0 && (
                          <div className="mt-1 flex items-center">
                            <MessageCircle className="h-3 w-3 text-primary-500 mr-1" />
                            <span className="text-xs text-primary-600">{meal.comments.length} comentario(s)</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 p-2">
                        <div className="italic">No registrado</div>
                        {!isNutritionist && (
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs text-primary-600 hover:text-primary-800"
                            onClick={() => onAddMeal(dayStr, MealType.AFTERNOON_SNACK)}
                          >
                            + Añadir
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Cena */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">Cena</div>
                <div className="text-xs text-gray-500">9:00 PM</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const meal = getMeal(dayStr, MealType.DINNER);
                
                return (
                  <td key={`${dayStr}-dinner`} className="px-4 py-3">
                    {meal ? (
                      <div 
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => onEditMeal(meal)}
                      >
                        <div className="font-medium">{meal.name}</div>
                        {meal.description && <div className="text-xs text-gray-500">{meal.description}</div>}
                        {meal.comments && meal.comments.length > 0 && (
                          <div className="mt-1 flex items-center">
                            <MessageCircle className="h-3 w-3 text-primary-500 mr-1" />
                            <span className="text-xs text-primary-600">{meal.comments.length} comentario(s)</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 p-2">
                        <div className="italic">No registrado</div>
                        {!isNutritionist && (
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs text-primary-600 hover:text-primary-800"
                            onClick={() => onAddMeal(dayStr, MealType.DINNER)}
                          >
                            + Añadir
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            
            {/* Calorías */}
            <tr>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">Calorías</div>
              </td>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const calories = getCalories(dayStr);
                
                return (
                  <td key={`${dayStr}-calories`} className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 p-2">
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
