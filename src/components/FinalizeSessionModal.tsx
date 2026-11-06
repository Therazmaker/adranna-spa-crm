'use client';

import React, { useState, useEffect } from 'react';
import { Appointment, InventoryProduct, PaymentMethod, PaymentSplit, SoldProductItem } from '@/types/database';
import { dbService } from '@/lib/dbService';
import { getLocalDateStr } from '@/lib/dateUtils';
import { getPrimaryMethod } from '@/lib/payments';

const PAYMENT_OPTIONS: { label: string; value: PaymentMethod; icon: string }[] = [
  { label: 'Efectivo', value: 'efectivo', icon: 'payments' },
  { label: 'Yape / Plin', value: 'yape_plin', icon: 'qr_code_2' },
  { label: 'Tarjeta / POS', value: 'tarjeta', icon: 'credit_card' },
  { label: 'Transferencia', value: 'transferencia', icon: 'account_balance' },
];

interface FinalizeSessionModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onFinalized: (updated: Appointment) => void;
}

export default function FinalizeSessionModal({
  appointment,
  onClose,
  onFinalized,
}: FinalizeSessionModalProps) {
  const [wantsProducts, setWantsProducts] = useState<boolean>(false);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionProcedure, setSessionProcedure] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  // Pago mixto: el cliente paga una parte con un método y otra parte con otro
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<PaymentMethod, string>>({
    efectivo: '',
    yape_plin: '',
    tarjeta: '',
    transferencia: '',
  });
  const [servicePriceInput, setServicePriceInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick product creation inline
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPres, setNewProdPres] = useState('30 ml');
  const [newProdPrice, setNewProdPrice] = useState<string>('35');

  useEffect(() => {
    if (appointment) {
      setWantsProducts(false);
      setCart({});
      setSearchQuery('');
      setSessionNotes(appointment.notes || '');
      setSessionProcedure(appointment.procedure || '');
      setPaymentMethod(appointment.paymentMethod || 'efectivo');
      const prevSplits = (appointment.payments || []).filter((p) => Number(p.amount) > 0);
      if (prevSplits.length > 1) {
        setIsSplitPayment(true);
        const next: Record<PaymentMethod, string> = { efectivo: '', yape_plin: '', tarjeta: '', transferencia: '' };
        prevSplits.forEach((p) => {
          next[p.method] = String(p.amount);
        });
        setSplitAmounts(next);
      } else {
        setIsSplitPayment(false);
        setSplitAmounts({ efectivo: '', yape_plin: '', tarjeta: '', transferencia: '' });
      }
      setShowQuickCreate(false);
      dbService.getInventory().then(setInventory);

      // Calcular precio base del servicio de forma inteligente:
      // Si appointment.servicePrice > 0, tomarlo. De lo contrario, usar appointment.price
      const rawPrice =
        appointment.servicePrice && appointment.servicePrice > 0
          ? appointment.servicePrice
          : Number(appointment.price) || 0;
      setServicePriceInput(rawPrice > 0 ? String(rawPrice) : '');
    }
  }, [appointment]);

  if (!appointment) return null;

  const baseServicePrice = Number(servicePriceInput) || 0;

  const soldProducts: SoldProductItem[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([prodId, qty]) => {
      const p = inventory.find((item) => item.id === prodId);
      if (!p) return null;
      return {
        productId: p.id,
        name: p.name,
        presentation: p.presentation,
        unitPrice: p.price,
        quantity: qty,
      };
    })
    .filter(Boolean) as SoldProductItem[];

  const productsTotal = soldProducts.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const finalTotal = baseServicePrice + productsTotal;

  // Adelanto previo registrado
  const depositPaid = Number(appointment.depositAmount) || 0;
  const depositMethod = appointment.depositPaymentMethod || 'yape_plin';
  const depositOption = PAYMENT_OPTIONS.find((o) => o.value === depositMethod) || PAYMENT_OPTIONS[1];

  // Total de la sesión según si lleva productos o no
  const sessionTotal = wantsProducts ? finalTotal : baseServicePrice;

  // Saldo restante a cobrar hoy en cabina tras deducir el adelanto previo
  const amountDue = Math.max(0, Math.round((sessionTotal - depositPaid) * 100) / 100);

  const splitAssigned = PAYMENT_OPTIONS.reduce(
    (s, opt) => s + (Number(splitAmounts[opt.value]) || 0),
    0
  );
  const splitRemaining = Math.round((amountDue - splitAssigned) * 100) / 100;
  const splitIsValid = amountDue === 0 || !isSplitPayment || Math.abs(splitRemaining) < 0.01;

  const fillRemaining = (method: PaymentMethod) => {
    const current = Number(splitAmounts[method]) || 0;
    const next = Math.max(0, Math.round((current + splitRemaining) * 100) / 100);
    setSplitAmounts((prev) => ({ ...prev, [method]: next > 0 ? String(next) : '' }));
  };

  const buildPayments = (total: number): PaymentSplit[] => {
    const todayPayments: PaymentSplit[] = [];
    if (amountDue > 0) {
      if (!isSplitPayment) {
        todayPayments.push({ method: paymentMethod, amount: amountDue });
      } else {
        const parts = PAYMENT_OPTIONS.map((opt) => ({
          method: opt.value,
          amount: Math.round((Number(splitAmounts[opt.value]) || 0) * 100) / 100,
        })).filter((p) => p.amount > 0);
        todayPayments.push(...(parts.length > 0 ? parts : [{ method: paymentMethod, amount: amountDue }]));
      }
    }

    if (depositPaid > 0) {
      // Agrupar adelanto + cobro de hoy por método
      const combinedMap = new Map<PaymentMethod, number>();
      combinedMap.set(depositMethod, depositPaid);
      for (const p of todayPayments) {
        combinedMap.set(p.method, (combinedMap.get(p.method) || 0) + p.amount);
      }
      return Array.from(combinedMap.entries()).map(([method, amount]) => ({
        method,
        amount: Math.round(amount * 100) / 100,
      }));
    }

    return todayPayments.length > 0 ? todayPayments : [{ method: paymentMethod, amount: total }];
  };

  const updateQty = (prodId: string, delta: number) => {
    setCart((prev) => {
      const next = (prev[prodId] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[prodId];
        return copy;
      }
      return { ...prev, [prodId]: next };
    });
  };

  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    const created = await dbService.createInventoryProduct({
      name: newProdName.trim(),
      presentation: newProdPres.trim() || 'Unidad',
      price: Number(newProdPrice) || 0,
      stock: 10,
      category: 'General',
    });
    setInventory((prev) => [created, ...prev]);
    setCart((prev) => ({ ...prev, [created.id]: 1 }));
    setNewProdName('');
    setShowQuickCreate(false);
  };

  const handleConfirmFinalize = async (withProducts: boolean) => {
    if (isSaving) return;
    if (!splitIsValid) return;
    setIsSaving(true);

    const itemsToSave = withProducts ? soldProducts : [];
    const prodSum = withProducts ? productsTotal : 0;
    const totalPrice = baseServicePrice + prodSum;
    const payments = buildPayments(totalPrice);

    // 1. Descontar stock de los productos vendidos
    if (itemsToSave.length > 0) {
      for (const sold of itemsToSave) {
        const found = inventory.find((p) => p.id === sold.productId);
        if (found && found.stock !== undefined) {
          const nextStock = Math.max(0, found.stock - sold.quantity);
          await dbService.updateInventoryProduct(found.id, { stock: nextStock });
        }
      }
    }

    // 2. Actualizar cita como completada con el desglose de productos, medio de pago, observaciones y procedimiento
    const updates: Partial<Appointment> = {
      status: 'completado',
      servicePrice: baseServicePrice,
      soldProducts: itemsToSave,
      productsTotal: prodSum,
      price: totalPrice,
      paymentMethod: getPrimaryMethod(payments, paymentMethod),
      payments,
      notes: sessionNotes.trim() || undefined,
      procedure: sessionProcedure.trim() || undefined,
    };

    await dbService.updateAppointment(appointment.id, updates);

    // 3. Actualizar fecha de última visita y contador del paciente en su perfil
    if (appointment.clientId) {
      const clients = await dbService.getClients();
      const client = clients.find((c) => c.id === appointment.clientId);
      if (client) {
        const completedCount = (await dbService.getAppointments()).filter(
          (a) =>
            (a.clientId === client.id ||
              a.clientName.toLowerCase() === client.name.toLowerCase()) &&
            a.status === 'completado'
        ).length;
        await dbService.updateClient(client.id, {
          lastVisit: appointment.date || getLocalDateStr(),
          totalVisits: Math.max(client.totalVisits || 1, completedCount),
        });
      }
    }

    setIsSaving(false);
    onFinalized({
      ...appointment,
      ...updates,
    });
  };

  const filteredInventory = inventory.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.presentation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-2xl p-5 pb-8 sm:pb-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
            </span>
            <div>
              <h3 className="font-serif text-xl font-bold text-primary">
                Finalizar Sesión
              </h3>
              <p className="text-xs text-on-surface-variant">
                {appointment.clientName} · {appointment.serviceName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Resumen Servicio + Ficha Clínica (FECHA | OBSERVACIONES | PROCEDIMIENTO) */}
        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-on-surface-variant font-medium">
              Atendido por: <strong className="text-on-surface">{appointment.professionalName}</strong> ({appointment.date} · {appointment.time})
            </span>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-[11px] font-bold text-on-surface-variant">Precio del Servicio:</span>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs font-bold text-primary">S/</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={servicePriceInput}
                  onChange={(e) => setServicePriceInput(e.target.value)}
                  placeholder="0.00"
                  title="Puedes ajustar el precio del servicio si es necesario"
                  className="w-24 pl-7 pr-2.5 py-1 rounded-xl bg-surface-container-lowest border-2 border-primary/40 focus:border-primary text-xs font-bold font-serif text-primary text-right focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Tabla Estilo Ficha Clínica Física: FECHA | OBSERVACIONES | PROCEDIMIENTO */}
          <div className="rounded-xl border-2 border-on-surface/20 overflow-hidden bg-surface-container-lowest shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 bg-surface-container-high/80 border-b-2 border-on-surface/20 text-[11px] font-extrabold uppercase tracking-wider text-on-surface text-center">
              <div className="sm:col-span-2 py-2 px-2 border-b sm:border-b-0 sm:border-r border-on-surface/20 flex items-center justify-center">
                FECHA
              </div>
              <div className="sm:col-span-5 py-2 px-3 border-b sm:border-b-0 sm:border-r border-on-surface/20 flex items-center justify-center">
                OBSERVACIONES
              </div>
              <div className="sm:col-span-5 py-2 px-3 flex items-center justify-center">
                PROCEDIMIENTO
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x divide-on-surface/20">
              {/* Columna FECHA */}
              <div className="sm:col-span-2 p-2.5 flex sm:flex-col items-center justify-center text-center bg-surface-container-low/40">
                <span className="font-mono text-xs font-bold text-primary">
                  {appointment.date
                    ? appointment.date.split('-').reverse().join('/')
                    : new Date().toLocaleDateString('es-PE')}
                </span>
                <span className="text-[10px] text-outline ml-2 sm:ml-0 sm:mt-1 font-semibold">
                  {appointment.time}
                </span>
              </div>

              {/* Columna OBSERVACIONES */}
              <div className="sm:col-span-5 p-2.5 space-y-1.5">
                <textarea
                  rows={4}
                  placeholder={'• Onicomicosis ambos 1er dedo\n• Helomas sobre los 4to y 5to dedo\n• Helomas en metatarso y talón.'}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-y leading-relaxed"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    '• Onicomicosis 1er dedo',
                    '• Helomas en dedos/metatarso',
                    '• Hiperqueratosis plantar',
                    '• Onicocriptosis',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setSessionNotes((prev) =>
                          prev.trim() ? `${prev.trim()}\n${tag}` : tag
                        )
                      }
                      className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-primary/15 text-[10px] font-semibold text-on-surface-variant hover:text-primary transition-colors"
                    >
                      + {tag.replace('• ', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Columna PROCEDIMIENTO */}
              <div className="sm:col-span-5 p-2.5 space-y-1.5">
                <textarea
                  rows={4}
                  placeholder={'- Profilaxis\n- Se le recomendó ortésicos\n- Des. calzado, antisudoral, ciclopirox'}
                  value={sessionProcedure}
                  onChange={(e) => setSessionProcedure(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-y leading-relaxed"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    '- Profilaxis',
                    '- Se le recomendó ortésicos',
                    '- Des. calzado, antisudoral',
                    '- Deslaminado hiperqueratosis',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setSessionProcedure((prev) =>
                          prev.trim() ? `${prev.trim()}\n${tag}` : tag
                        )
                      }
                      className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-primary/15 text-[10px] font-semibold text-on-surface-variant hover:text-primary transition-colors"
                    >
                      + {tag.replace('- ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Si hay un adelanto previo registrado */}
          {depositPaid > 0 && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[18px]">savings</span>
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-emerald-950">
                      Adelanto Previo Registrado:
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-300">
                      S/ {depositPaid.toFixed(2)} ({depositOption.label})
                    </span>
                  </div>
                  {appointment.depositNotes && (
                    <span className="text-[11px] text-emerald-700 block truncate mt-0.5">
                      Nota / Op: {appointment.depositNotes}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right sm:text-right pl-10 sm:pl-0 flex-shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-emerald-200/60">
                <span className="text-[10px] font-semibold text-emerald-800 block">
                  Total {wantsProducts ? 'con productos' : 'servicio'}: S/ {sessionTotal.toFixed(2)} - S/ {depositPaid.toFixed(2)}
                </span>
                <span className="text-sm font-black text-emerald-950">
                  Saldo Restante: S/ {amountDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {amountDue === 0 && depositPaid > 0 ? (
            <div className="p-3.5 rounded-2xl bg-emerald-100/80 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[22px] text-emerald-700 flex-shrink-0">task_alt</span>
              <div>
                <p className="font-extrabold text-emerald-950">¡Cita 100% cubierta por el adelanto!</p>
                <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  El cliente ya pagó S/ {depositPaid.toFixed(2)} por {depositOption.label}. No se requiere cobrar ningún saldo adicional.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-[11px] font-bold text-on-surface-variant block">
                  {depositPaid > 0
                    ? `Método de cobro para el Saldo Restante (S/ ${amountDue.toFixed(2)}):`
                    : 'Método de Pago recibido (para el Cuadre de Caja):'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsSplitPayment((v) => {
                      const next = !v;
                      if (next) {
                        // Precarga el saldo restante en el método seleccionado
                        setSplitAmounts({
                          efectivo: '',
                          yape_plin: '',
                          tarjeta: '',
                          transferencia: '',
                          [paymentMethod]: amountDue > 0 ? String(amountDue) : '',
                        } as Record<PaymentMethod, string>);
                      }
                      return next;
                    });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all ${
                    isSplitPayment
                      ? 'bg-secondary text-white border-secondary shadow-2xs'
                      : 'bg-surface-container-lowest text-secondary border-secondary/40 hover:bg-secondary/10'
                  }`}
                  title="El cliente paga el saldo con más de un método (ej. parte efectivo y parte Yape)"
                >
                  <span className="material-symbols-outlined text-[14px]">call_split</span>
                  {isSplitPayment ? 'Pago mixto activado' : 'Pago mixto'}
                </button>
              </div>

              {!isSplitPayment ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        paymentMethod === opt.value
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high hover:border-primary/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 p-2.5 rounded-xl bg-surface-container-lowest border border-secondary/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {PAYMENT_OPTIONS.map((opt) => {
                      const val = splitAmounts[opt.value];
                      const hasValue = (Number(val) || 0) > 0;
                      return (
                        <div
                          key={opt.value}
                          className={`flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border transition-all ${
                            hasValue
                              ? 'border-primary bg-primary-container/10'
                              : 'border-surface-container-high bg-surface-container-low/50'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[16px] ${hasValue ? 'text-primary' : 'text-outline'}`}>
                            {opt.icon}
                          </span>
                          <span className={`text-[11px] font-bold flex-1 ${hasValue ? 'text-primary' : 'text-on-surface-variant'}`}>
                            {opt.label}
                          </span>
                          <div className="relative flex items-center">
                            <span className="absolute left-2 text-[11px] font-bold text-outline">S/</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              inputMode="decimal"
                              value={val}
                              placeholder="0"
                              onChange={(e) =>
                                setSplitAmounts((prev) => ({ ...prev, [opt.value]: e.target.value }))
                              }
                              className="w-20 pl-6 pr-2 py-1 rounded-lg bg-surface-container-lowest border border-surface-container-high focus:border-primary text-xs font-bold text-primary text-right focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          {splitRemaining > 0.009 && (
                            <button
                              type="button"
                              onClick={() => fillRemaining(opt.value)}
                              title={`Asignar el resto (S/ ${splitRemaining.toFixed(2)}) a ${opt.label}`}
                              className="w-6 h-6 rounded-lg bg-secondary/15 text-secondary hover:bg-secondary hover:text-white flex items-center justify-center transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                      Math.abs(splitRemaining) < 0.01
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : splitRemaining > 0
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        {Math.abs(splitRemaining) < 0.01 ? 'check_circle' : 'error'}
                      </span>
                      Asignado S/ {splitAssigned.toFixed(2)} de S/ {amountDue.toFixed(2)}
                    </span>
                    <span>
                      {Math.abs(splitRemaining) < 0.01
                        ? 'Cuadra ✓'
                        : splitRemaining > 0
                        ? `Falta S/ ${splitRemaining.toFixed(2)}`
                        : `Sobra S/ ${Math.abs(splitRemaining).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pregunta de Venta de Productos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">shopping_bag</span>
              ¿El cliente va a comprar algún producto?
            </span>
          </div>

          {!wantsProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isSaving || !splitIsValid}
                title={!splitIsValid ? 'El pago mixto no cuadra con el saldo restante' : undefined}
                onClick={() => handleConfirmFinalize(false)}
                className="py-3.5 px-4 rounded-2xl bg-emerald-700 text-white text-xs font-bold shadow-md hover:bg-emerald-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>
                  {depositPaid > 0
                    ? amountDue > 0
                      ? `No, finalizar solo sesión (Cobrar Saldo S/ ${amountDue.toFixed(2)})`
                      : 'No, finalizar solo sesión (Cubierto por adelanto)'
                    : `No, finalizar solo sesión (S/ ${baseServicePrice.toFixed(2)})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWantsProducts(true)}
                className="py-3.5 px-4 rounded-2xl bg-secondary text-white text-xs font-bold shadow-sm hover:bg-secondary/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>Sí, seleccionar productos</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 border border-secondary/30 bg-secondary-container/10 rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary">
                  Selecciona los productos vendidos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickCreate((v) => !v)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                    <span>{showQuickCreate ? 'Cerrar' : '+ Crear Producto'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWantsProducts(false);
                      setCart({});
                    }}
                    className="text-[11px] text-outline hover:text-error font-semibold"
                  >
                    Sin productos
                  </button>
                </div>
              </div>

              {/* Crear producto rápido si no existe aún */}
              {showQuickCreate && (
                <form
                  onSubmit={handleQuickCreateProduct}
                  className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-2"
                >
                  <span className="text-[10px] uppercase tracking-wider font-bold text-secondary block">
                    Agregar nuevo producto al inventario
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Nombre..."
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="col-span-2 bg-surface-container-low border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface"
                    />
                    <input
                      type="text"
                      placeholder="Ej. 30 ml"
                      value={newProdPres}
                      onChange={(e) => setNewProdPres(e.target.value)}
                      className="bg-surface-container-low border border-surface-container-high rounded-lg px-2 py-1.5 text-xs font-semibold text-on-surface"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-xs font-bold text-on-surface-variant">Precio S/</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                        className="w-24 bg-surface-container-low border border-surface-container-high rounded-lg px-2 py-1 text-xs font-bold text-primary"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold"
                    >
                      Guardar y Agregar
                    </button>
                  </div>
                </form>
              )}

              {/* Buscador de productos */}
              {inventory.length > 3 && (
                <input
                  type="text"
                  placeholder="Buscar producto en inventario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}

              {/* Lista de productos del inventario */}
              {filteredInventory.length === 0 ? (
                <div className="py-4 text-center text-xs text-on-surface-variant">
                  No hay productos registrados en el inventario todavía. Usa <strong>+ Crear Producto</strong> arriba para registrar el primero.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredInventory.map((prod) => {
                    const qty = cart[prod.id] || 0;
                    return (
                      <div
                        key={prod.id}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-colors ${
                          qty > 0
                            ? 'bg-surface-container-lowest border-primary shadow-2xs'
                            : 'bg-surface-container-lowest/70 border-surface-container-high'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">
                            {prod.name}{' '}
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary-container/50 text-secondary ml-1">
                              {prod.presentation}
                            </span>
                          </p>
                          <p className="text-[11px] font-bold text-primary">
                            S/ {prod.price.toFixed(2)}
                            {prod.stock !== undefined && (
                              <span className="text-[10px] text-outline font-normal ml-2">
                                (Stock: {prod.stock})
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {qty > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => updateQty(prod.id, -1)}
                                className="w-7 h-7 rounded-lg bg-surface-container-high text-on-surface font-bold text-sm flex items-center justify-center hover:bg-surface-variant"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-primary">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(prod.id, 1)}
                                className="w-7 h-7 rounded-lg bg-primary text-white font-bold text-sm flex items-center justify-center hover:bg-primary-container"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateQty(prod.id, 1)}
                              className="px-2.5 py-1 rounded-lg bg-primary-container/15 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors"
                            >
                              + Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Desglose de Totales */}
              <div className="pt-2 border-t border-surface-container-high space-y-1 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Servicio ({appointment.serviceName}):</span>
                  <span className="font-semibold">S/ {baseServicePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-secondary font-semibold">
                  <span>Productos ({soldProducts.reduce((s, i) => s + i.quantity, 0)} unid.):</span>
                  <span>+ S/ {productsTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-primary pt-1 border-t border-surface-container-high/60">
                  <span>Total Sesión + Productos:</span>
                  <span className="font-serif text-base">S/ {finalTotal.toFixed(2)}</span>
                </div>
                {depositPaid > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-emerald-800 font-bold">
                      <span>Adelanto previo deducido ({depositOption.label}):</span>
                      <span>- S/ {depositPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-emerald-950 pt-1 border-t border-emerald-200">
                      <span>Saldo Restante a Cobrar Hoy:</span>
                      <span className="font-serif text-base text-emerald-700">S/ {amountDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                disabled={isSaving || !splitIsValid}
                title={!splitIsValid ? 'El pago mixto no cuadra con el saldo restante' : undefined}
                onClick={() => handleConfirmFinalize(true)}
                className="w-full py-3.5 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-md hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                <span>
                  {isSaving
                    ? 'Guardando...'
                    : depositPaid > 0
                    ? amountDue > 0
                      ? `Confirmar y Cobrar Saldo (S/ ${amountDue.toFixed(2)})`
                      : 'Confirmar y Finalizar (Cubierto por adelanto)'
                    : `Confirmar y Finalizar Sesión (S/ ${finalTotal.toFixed(2)})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
