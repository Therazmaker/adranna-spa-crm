/**
 * Utilidades de fecha en horario local (sin desfase UTC).
 * Evita que después de las 7:00 p. m. (UTC-5) la fecha se adelante al día siguiente.
 */

export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartOfWeekLocal(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Lunes como primer día de la semana
  d.setDate(d.getDate() + diff);
  return getLocalDateStr(d);
}

export function getStartOfMonthLocal(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return getLocalDateStr(d);
}

export function addDaysLocal(days: number, fromDate: Date = new Date()): string {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return getLocalDateStr(d);
}
