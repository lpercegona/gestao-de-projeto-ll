/**
 * Format hours in a standardized way across the application
 * Shows hours without decimal places when it's a round number,
 * otherwise shows with one decimal place
 */
export const formatHours = (hours: number): string => {
  if (hours === 0) return '0h';
  
  const roundedHours = Math.round(hours * 10) / 10;
  
  if (Number.isInteger(roundedHours)) {
    return `${roundedHours}h`;
  }
  
  return `${roundedHours.toFixed(1)}h`;
};

/**
 * Format hours with "horas" and "min" labels
 * Example: 2.5 becomes "2h 30min"
 */
export const formatHoursDetailed = (hours: number): string => {
  if (hours === 0) return '0h';
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}min`;
  
  return `${h}h ${m}min`;
};
