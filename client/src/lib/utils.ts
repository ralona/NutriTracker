import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number to a fixed number of decimal places
 */
export function formatNumber(num: number, decimals = 0): string {
  return num.toFixed(decimals);
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to a maximum length and adds an ellipsis
 */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max) + '...' : str;
}

/**
 * Maps a value from one range to another
 */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Gets a status color based on a progress value
 */
export function getStatusColor(progress: number): 'green' | 'yellow' | 'red' {
  if (progress >= 70) return 'green';
  if (progress >= 40) return 'yellow';
  return 'red';
}

/**
 * Gets a progress label based on a progress value
 */
export function getProgressLabel(progress: number): 'Bien' | 'Regular' | 'Insuficiente' {
  if (progress >= 70) return 'Bien';
  if (progress >= 40) return 'Regular';
  return 'Insuficiente';
}

/**
 * Gets a CSS class for a badge based on status
 */
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Bien':
    case 'Activo':
      return 'variant-success';
    case 'Regular':
    case 'Pendiente':
      return 'variant-warning';
    case 'Insuficiente':
    case 'Atención':
      return 'variant-danger';
    default:
      return '';
  }
}
