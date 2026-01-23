/**
 * Formata horas de forma padronizada (ex: 2.5 vira "2h30")
 */
export const formatHours = (decimalHours: number): string => {
  const hours = Math.floor(Math.abs(decimalHours));
  const minutes = Math.round((Math.abs(decimalHours) - hours) * 60);
  const sign = decimalHours < 0 ? '-' : '';

  // Trata o caso onde o arredondamento chega a 60 minutos
  if (minutes === 60) {
    return `${sign}${hours + 1}h`;
  }

  if (minutes === 0) {
    return `${sign}${hours}h`;
  }

  // Formato compacto: 2h30 em vez de 2h 30min
  return `${sign}${hours}h${minutes}`;
};

/**
 * Mantido por compatibilidade, agora usando o novo formato compacto
 */
export const formatHoursDetailed = formatHours;

/**
 * Formata como decimal (ex: 2.5h) - Mantido sem alterações
 */
export const formatHoursDecimal = (hours: number): string => {
  if (hours === 0) return '0h';
  const roundedHours = Math.round(hours * 10) / 10;
  return Number.isInteger(roundedHours) 
    ? `${roundedHours}h` 
    : `${roundedHours.toFixed(1)}h`;
};
