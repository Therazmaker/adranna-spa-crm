// Helpers para formatear horas en formato 12 horas (AM/PM)

export function formatTime12(timeStr?: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return clean;

  const h = parseInt(match[1], 10);
  const m = match[2];
  if (isNaN(h)) return clean;

  const period = h >= 12 ? 'p. m.' : 'a. m.';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
}

export function formatHourSlot12(hourStr?: string): string {
  if (!hourStr) return '';
  const clean = hourStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return clean;

  const h = parseInt(match[1], 10);
  if (isNaN(h)) return clean;

  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

// Genera las opciones estándar de horarios de spa para el selector (08:00 AM a 09:00 PM cada 15 o 30 min)
export function getTimeOptions12(): { value24: string; label12: string }[] {
  const options: { value24: string; label12: string }[] = [];
  // De 08:00 a 21:00 cada 15 min
  for (let h = 8; h <= 21; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 21 && m > 0) break;
      const h24 = String(h).padStart(2, '0');
      const mStr = String(m).padStart(2, '0');
      const val = `${h24}:${mStr}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const label = `${h12}:${mStr} ${period}`;
      options.push({ value24: val, label12: label });
    }
  }
  return options;
}
