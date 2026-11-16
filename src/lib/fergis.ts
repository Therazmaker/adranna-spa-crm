import { Appointment } from '@/types/database';

// Fergis trabaja como recepcionista con sueldo fijo. Cuando hace un masaje:
//  - se le descuenta del sueldo el tiempo del masaje (valor hora proporcional al sueldo)
//  - se le paga un porcentaje del precio del masaje
export const FERGIS_NAME = 'Fergis';
export const FERGIS_ROLE = 'Recepción / Masajista';

export interface FergisConfig {
  monthlySalary: number; // S/ mensuales
  monthlyHours: number; // horas que cubre el sueldo (Perú: 30 días × 8 h = 240)
  defaultPercent: number; // % del masaje que se le paga
}

export const DEFAULT_FERGIS_CONFIG: FergisConfig = {
  monthlySalary: 1500,
  monthlyHours: 240,
  defaultPercent: 40,
};

const CONFIG_KEY = 'adranna_fergis_config_v1';

export function getFergisConfig(): FergisConfig {
  if (typeof window === 'undefined') return DEFAULT_FERGIS_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_FERGIS_CONFIG;
    const parsed = JSON.parse(raw) as Partial<FergisConfig>;
    return {
      monthlySalary: Number(parsed.monthlySalary) || DEFAULT_FERGIS_CONFIG.monthlySalary,
      monthlyHours: Number(parsed.monthlyHours) || DEFAULT_FERGIS_CONFIG.monthlyHours,
      defaultPercent:
        parsed.defaultPercent !== undefined && !Number.isNaN(Number(parsed.defaultPercent))
          ? Number(parsed.defaultPercent)
          : DEFAULT_FERGIS_CONFIG.defaultPercent,
    };
  } catch {
    return DEFAULT_FERGIS_CONFIG;
  }
}

export function saveFergisConfig(config: FergisConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export function getHourlyRate(config: FergisConfig): number {
  return config.monthlyHours > 0 ? config.monthlySalary / config.monthlyHours : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface FergisMassageCalc {
  durationMinutes: number;
  price: number;
  percent: number;
  hourlyRate: number;
  hours: number;
  deduction: number; // descuento del sueldo por las horas del masaje
  commission: number; // % del masaje a pagar
  net: number; // comisión − descuento
}

// Precio base del masaje (sin productos vendidos), salvo que se haya fijado otro en la cita
export function getFergisMassagePrice(apt: Appointment): number {
  const fm = apt.fergisMassage;
  if (fm?.price !== undefined) return Number(fm.price) || 0;
  if (apt.servicePrice !== undefined) return Number(apt.servicePrice) || 0;
  return Math.max(0, (Number(apt.price) || 0) - (Number(apt.productsTotal) || 0));
}

export function calcFergisMassage(apt: Appointment, config: FergisConfig): FergisMassageCalc | null {
  const fm = apt.fergisMassage;
  if (!fm) return null;
  const durationMinutes = Number(fm.durationMinutes ?? apt.durationMinutes) || 0;
  const price = getFergisMassagePrice(apt);
  const percent = Number(fm.percent ?? config.defaultPercent) || 0;
  // Tarifa congelada al agendar, para que un cambio de sueldo no altere sesiones pasadas
  const hourlyRate = Number(fm.hourlyRate) || getHourlyRate(config);
  const hours = durationMinutes / 60;
  const deduction = round2(hours * hourlyRate);
  const commission = round2((price * percent) / 100);
  return {
    durationMinutes,
    price,
    percent,
    hourlyRate,
    hours,
    deduction,
    commission,
    net: round2(commission - deduction),
  };
}
