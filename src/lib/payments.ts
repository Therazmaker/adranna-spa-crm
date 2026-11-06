import { Appointment, PaymentMethod, PaymentSplit } from '@/types/database';

export const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
}[] = [
  { value: 'efectivo', label: 'Efectivo', shortLabel: 'Efectivo', icon: 'payments', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'yape_plin', label: 'Yape / Plin', shortLabel: 'Yape/Plin', icon: 'qr_code_2', badgeClass: 'bg-violet-50 text-violet-800 border-violet-200' },
  { value: 'tarjeta', label: 'Tarjeta / POS', shortLabel: 'Tarjeta', icon: 'credit_card', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200' },
  { value: 'transferencia', label: 'Transferencia', shortLabel: 'Transf.', icon: 'account_balance', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
];

export function getPaymentOption(method: PaymentMethod) {
  return PAYMENT_METHOD_OPTIONS.find((o) => o.value === method) || PAYMENT_METHOD_OPTIONS[0];
}

/**
 * Devuelve el desglose de pagos de una cita.
 * - Si tiene pago mixto guardado (payments), lo usa.
 * - Si no, asume un único pago por el total con su paymentMethod (compatibilidad con citas antiguas).
 */
export function getAptPayments(
  apt: Pick<Appointment, 'payments' | 'paymentMethod' | 'price'> &
    Partial<Pick<Appointment, 'depositAmount' | 'depositPaymentMethod' | 'status'>>
): PaymentSplit[] {
  if (apt.payments && apt.payments.length > 0) {
    return apt.payments.filter((p) => Number(p.amount) > 0 || apt.payments!.length === 1);
  }
  // Si la cita aún no está completada pero tiene un adelanto cobrado
  if (apt.status !== 'completado' && apt.depositAmount && Number(apt.depositAmount) > 0) {
    return [{ method: apt.depositPaymentMethod || 'yape_plin', amount: Number(apt.depositAmount) }];
  }
  return [{ method: apt.paymentMethod || 'efectivo', amount: Number(apt.price) || 0 }];
}

/** Monto pagado con un método concreto en una cita (considera pagos mixtos y adelantos). */
export function getAptAmountForMethod(
  apt: Pick<Appointment, 'payments' | 'paymentMethod' | 'price'> &
    Partial<Pick<Appointment, 'depositAmount' | 'depositPaymentMethod' | 'status'>>,
  method: PaymentMethod
): number {
  return getAptPayments(apt)
    .filter((p) => p.method === method)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

export function isMixedPayment(apt: Pick<Appointment, 'payments'>): boolean {
  return (apt.payments || []).filter((p) => Number(p.amount) > 0).length > 1;
}

/** Método principal (el de mayor monto), útil para compatibilidad con paymentMethod. */
export function getPrimaryMethod(payments: PaymentSplit[], fallback: PaymentMethod = 'efectivo'): PaymentMethod {
  if (!payments.length) return fallback;
  return [...payments].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))[0].method;
}
