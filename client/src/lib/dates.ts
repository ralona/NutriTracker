import { 
  format, 
  parseISO, 
  isValid, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  formatISO,
  addWeeks,
  subWeeks
} from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formats a date to a specific format with Spanish locale
 */
export function formatDate(date: Date | string, formatString: string = 'dd MMM yyyy'): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) {
    return 'Fecha inválida';
  }
  
  return format(parsedDate, formatString, { locale: es });
}

/**
 * Returns the day name from a date
 */
export function getDayName(date: Date | string, abbreviated: boolean = false): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) {
    return 'Día inválido';
  }
  
  return format(parsedDate, abbreviated ? 'EEE' : 'EEEE', { locale: es });
}

/**
 * Returns a formatted month and year
 */
export function getMonthAndYear(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) {
    return 'Fecha inválida';
  }
  
  return format(parsedDate, 'MMMM yyyy', { locale: es });
}

/**
 * Returns a week range as string
 */
export function getWeekRangeText(date: Date): string {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  
  return `${format(weekStart, 'd', { locale: es })}-${format(weekEnd, 'd MMM, yyyy', { locale: es })}`;
}

/**
 * Returns array of dates for a week
 */
export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

/**
 * Returns the ISO string for a date (YYYY-MM-DD)
 */
export function formatDateToISO(date: Date): string {
  return formatISO(date, { representation: 'date' });
}

/**
 * Returns the start and end of a given day
 */
export function getDayBounds(date: Date): { start: Date; end: Date } {
  return {
    start: startOfDay(date),
    end: endOfDay(date)
  };
}

/**
 * Generates navigation functions for week navigation
 */
export function useWeekNavigation(currentWeek: Date, setWeek: (date: Date) => void) {
  return {
    goToPreviousWeek: () => setWeek(subWeeks(currentWeek, 1)),
    goToNextWeek: () => setWeek(addWeeks(currentWeek, 1)),
    goToCurrentWeek: () => setWeek(new Date())
  };
}

/**
 * Generates navigation functions for day navigation
 */
export function useDayNavigation(currentDay: Date, setDay: (date: Date) => void) {
  return {
    goToPreviousDay: () => setDay(subDays(currentDay, 1)),
    goToNextDay: () => setDay(addDays(currentDay, 1)),
    goToToday: () => setDay(new Date())
  };
}
