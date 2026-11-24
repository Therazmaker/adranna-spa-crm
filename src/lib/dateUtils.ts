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

/** Quincena actual: del 1 al 15, o del 16 al último día del mes. */
export function getQuincenaRangeLocal(date: Date = new Date()): { start: string; end: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (date.getDate() <= 15) {
    return { start: getLocalDateStr(new Date(y, m, 1)), end: getLocalDateStr(new Date(y, m, 15)) };
  }
  return { start: getLocalDateStr(new Date(y, m, 16)), end: getLocalDateStr(new Date(y, m + 1, 0)) };
}

export function addDaysLocal(days: number, fromDate: Date = new Date()): string {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return getLocalDateStr(d);
}
