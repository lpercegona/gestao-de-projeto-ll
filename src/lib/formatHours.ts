/**
 * Format hours in a standardized way across the application
 * Shows hours and minutes (e.g., "2h 30min" instead of "2.5h")
 */
export const formatHours = (hours: number): string => {
  if (hours === 0) return '0h';
  
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  
  // Handle case where rounding brings minutes to 60
  if (m === 60) {
    return `${h + 1}h`;
  }
  
  const sign = hours < 0 ? '-' : '';
  
  if (m === 0) return `${sign}${h}h`;
  if (h === 0) return `${sign}${m}min`;
  
  return `${sign}${h}h ${m}min`;
};

/**
 * Format hours with detailed labels (alias for formatHours for backward compatibility)
 * Example: 2.5 becomes "2h 30min"
 */
export const formatHoursDetailed = formatHours;

/**
 * Format hours as decimal (for cases where decimal format is explicitly needed)
 * Shows hours without decimal places when it's a round number,
 * otherwise shows with one decimal place
 */
export const formatHoursDecimal = (hours: number): string => {
  if (hours === 0) return '0h';
  
  const roundedHours = Math.round(hours * 10) / 10;
  
  if (Number.isInteger(roundedHours)) {
    return `${roundedHours}h`;
  }
  
  return `${roundedHours.toFixed(1)}h`;
};
