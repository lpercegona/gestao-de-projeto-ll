/**
 * Utilitários de cálculo de tempo baseados em minutos inteiros.
 * Toda lógica de negócio (saldo, usado, disponível) deve operar em minutos
 * para eliminar erros de ponto flutuante.
 */

/** Converte horas decimais para minutos inteiros */
export const toMinutes = (hours: number | string): number =>
  Math.round(Number(hours) * 60);

/** Converte minutos inteiros de volta para horas decimais */
export const toHours = (minutes: number): number => minutes / 60;

/** Soma um array de horas decimais retornando minutos inteiros */
export const sumHoursAsMinutes = (hoursArray: (number | string)[]): number =>
  hoursArray.reduce((sum, h) => sum + toMinutes(h), 0);
