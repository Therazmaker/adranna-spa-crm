'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { dbService } from '@/lib/dbService';
import { Appointment, Expense, PaymentMethod } from '@/types/database';
import { exportCashReconciliationExcel } from '@/lib/excelExport';

const EXPENSE_CATEGORIES = [
  { label: 'Insumos Clínicos & Descartables', value: 'insumos' },
  { label: 'Alquiler & Local', value: 'alquiler' },
  { label: 'Servicios (Luz, Agua, Internet)', value: 'servicios' },
  { label: 'Honorarios / Personal', value: 'personal' },
  { label: 'Otros Gastos', value: 'otros' },
];

const PAYMENT_METHODS: { label: string; value: PaymentMethod; icon: string }[] = [
  { label: 'Efectivo', value: 'efectivo', icon: 'payments' },
  { label: 'Yape / Plin', value: 'yape_plin', icon: 'qr_code_2' },
  { label: 'Tarjeta / POS', value: 'tarjeta', icon: 'credit_card' },
  { label: 'Transferencia', value: 'transferencia', icon: 'account_balance' },
];

const PEN_DENOMINATIONS = [
  { label: 'Billetes S/ 200', value: 200 },
  { label: 'Billetes S/ 100', value: 100 },
  { label: 'Billetes S/ 50', value: 50 },
  { label: 'Billetes S/ 20', value: 20 },
  { label: 'Billetes S/ 10', value: 10 },
  { label: 'Monedas S/ 5', value: 5 },
  { label: 'Monedas S/ 2', value: 2 },
  { label: 'Monedas S/ 1', value: 1 },
  { label: 'Monedas S/ 0.50', value: 0.5 },
  { label: 'Monedas S/ 0.20', value: 0.2 },
  { label: 'Monedas S/ 0.10', value: 0.1 },
];

interface CashBoxSavedState {
  openingCash: number;
  countedCash: string;
  cashierName: string;
  closingNotes: string;
}

const CASH_BOX_STORAGE_KEY = 'adranna_cash_box_state_v1';

export default function ContabilidadPage() {
  const { role, isAdmin, user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'custom_date' | 'week' | 'month' | 'all'>('today');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Estado del Cuadre / Arqueo de Caja
  const [openingCash, setOpeningCash] = useState<number>(100);
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [cashierName, setCashierName] = useState<string>('Administración');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [showBillCounter, setShowBillCounter] = useState<boolean>(false);
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({});

  // Modal Gasto State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expCategory, setExpCategory] = useState<Expense['category']>('insumos');
  const [expPaymentMethod, setExpPaymentMethod] = useState<Expense['paymentMethod']>('efectivo');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expNotes, setExpNotes] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const activeBoxKey = period === 'custom_date' ? customDate : new Date().toISOString().slice(0, 10);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const defaultCashier =
      (user?.user_metadata?.full_name as string | undefined) ||
      user?.email ||
      'Administración';
    try {
      const raw = localStorage.getItem(CASH_BOX_STORAGE_KEY);
      const allSaved = raw ? (JSON.parse(raw) as Record<string, CashBoxSavedState>) : {};
      const forDate = allSaved[activeBoxKey];
      if (forDate) {
        setOpeningCash(forDate.openingCash ?? 100);
        setCountedCashInput(forDate.countedCash ?? '');
        setCashierName(forDate.cashierName || defaultCashier);
        setClosingNotes(forDate.closingNotes ?? '');
      } else {
        setCashierName(defaultCashier);
      }
    } catch {
      // ignore localStorage read errors
    }
  }, [activeBoxKey, user]);

  const persistCashBoxState = (next: Partial<CashBoxSavedState>) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CASH_BOX_STORAGE_KEY);
      const allSaved = raw ? (JSON.parse(raw) as Record<string, CashBoxSavedState>) : {};
      allSaved[activeBoxKey] = {
        openingCash: next.openingCash !== undefined ? next.openingCash : openingCash,
        countedCash: next.countedCash !== undefined ? next.countedCash : countedCashInput,
        cashierName: next.cashierName !== undefined ? next.cashierName : cashierName,
        closingNotes: next.closingNotes !== undefined ? next.closingNotes : closingNotes,
      };
      localStorage.setItem(CASH_BOX_STORAGE_KEY, JSON.stringify(allSaved));
    } catch {
      // ignore
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    const [apts, exps] = await Promise.all([
      dbService.getAppointments(),
      dbService.getExpenses(),
    ]);
    setAppointments(apts);
    setExpenses(exps);
    setIsLoading(false);
  };

  // Si no es Administrador, bloquear la pantalla por completo
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-20 h-20 rounded-full bg-error-container/30 border-2 border-error/20 flex items-center justify-center text-error">
          <span className="material-symbols-outlined text-4xl">lock</span>
        </div>
        <div className="max-w-md space-y-2">
          <span className="text-xs uppercase tracking-widest text-error font-bold font-sans">
            Acceso Restringido
          </span>
          <h2 className="font-serif text-2xl font-bold text-on-surface">
            Módulo Confidencial de Contabilidad
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Tu usuario actual tiene rol de <strong>{role === 'terapeuta' ? 'Terapeuta / Especialista' : 'Recepción'}</strong>.
            La información financiera, ingresos de caja y balance del spa están reservados exclusivamente para la <strong>Administración</strong>.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-colors shadow-sm"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  // Filtrado por período
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)
  )
    .toISOString()
    .slice(0, 10);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const filterByDate = (dateStr?: string) => {
    if (!dateStr) return period === 'all';
    if (period === 'today') return dateStr === todayStr;
    if (period === 'custom_date') return dateStr === customDate;
    if (period === 'week') return dateStr >= startOfWeek;
    if (period === 'month') return dateStr >= startOfMonth;
    return true;
  };

  // Excluir citas canceladas del cuadre contable
  const filteredApts = appointments.filter(
    (a) => a.status !== 'cancelado' && filterByDate(a.date)
  );
  const filteredExps = expenses.filter((e) => filterByDate(e.date));

  const totalIncome = filteredApts.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const totalExpenses = filteredExps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const avgTicket = filteredApts.length > 0 ? Math.round(totalIncome / filteredApts.length) : 0;

  // Ingresos por disciplina y venta de productos
  const totalProductsIncome = filteredApts.reduce(
    (sum, a) => sum + (Number(a.productsTotal) || 0),
    0
  );
  const podoIncome = filteredApts
    .filter((a) => a.discipline === 'podologia')
    .reduce((s, a) => s + (Number(a.price) || 0), 0);
  const spaIncome = filteredApts
    .filter((a) => a.discipline === 'masaje')
    .reduce((s, a) => s + (Number(a.price) || 0), 0);

  // Desglose por método de pago (para el Cuadre de Caja)
  const paymentBreakdown = PAYMENT_METHODS.map((pm) => {
    const aptsForMethod = filteredApts.filter(
      (a) => (a.paymentMethod || 'efectivo') === pm.value
    );
    const expsForMethod = filteredExps.filter(
      (e) => (e.paymentMethod || 'efectivo') === pm.value
    );
    const income = aptsForMethod.reduce((s, a) => s + (Number(a.price) || 0), 0);
    const expense = expsForMethod.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return {
      ...pm,
      incomeCount: aptsForMethod.length,
      income,
      expenseCount: expsForMethod.length,
      expense,
      net: income - expense,
    };
  });

  const cashChannel = paymentBreakdown.find((p) => p.value === 'efectivo')!;
  const expectedCashInDrawer = (Number(openingCash) || 0) + cashChannel.income - cashChannel.expense;
  const hasCountedCash = countedCashInput.trim() !== '' && !Number.isNaN(Number(countedCashInput));
  const countedCashNum = hasCountedCash ? Number(countedCashInput) : null;
  const cashDifference = countedCashNum !== null ? countedCashNum - expectedCashInDrawer : 0;

  const periodLabels: Record<typeof period, { label: string; range: string }> = {
    today: { label: 'Hoy', range: todayStr },
    custom_date: { label: `Día ${customDate}`, range: customDate },
    week: { label: 'Esta Semana', range: `${startOfWeek} al ${todayStr}` },
    month: { label: 'Este Mes', range: `${startOfMonth} al ${todayStr}` },
    all: { label: 'Todo el Historial', range: 'Histórico Completo' },
  };

  const handleUpdateDenom = (denomValue: number, qty: number) => {
    const safeQty = Math.max(0, Math.floor(qty));
    const nextDenoms = { ...denomCounts, [denomValue]: safeQty };
    setDenomCounts(nextDenoms);

    const sum = PEN_DENOMINATIONS.reduce(
      (acc, d) => acc + d.value * (nextDenoms[d.value] || 0),
      0
    );
    const formatted = sum > 0 ? sum.toFixed(2) : '0';
    setCountedCashInput(formatted);
    persistCashBoxState({ countedCash: formatted });
  };

  const handleChangeAppointmentPaymentMethod = async (
    aptId: string,
    newMethod: PaymentMethod
  ) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, paymentMethod: newMethod } : a))
    );
    await dbService.updateAppointment(aptId, { paymentMethod: newMethod });
  };

  const handleExportExcel = () => {
    const info = periodLabels[period];
    exportCashReconciliationExcel({
      periodLabel: info.label,
      dateRangeLabel: info.range,
      openingCash: Number(openingCash) || 0,
      countedPhysicalCash: countedCashNum,
      cashierName: cashierName.trim() || 'Administración',
      closingNotes: closingNotes.trim(),
      appointments: filteredApts,
      expenses: filteredExps,
    });
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDescription.trim() || expAmount <= 0 || isSavingExpense) return;
    setIsSavingExpense(true);

    await dbService.createExpense({
      description: expDescription.trim(),
      amount: expAmount,
      category: expCategory,
      paymentMethod: expPaymentMethod,
      date: expDate,
      notes: expNotes.trim() || undefined,
    });

    await loadData();
    setIsSavingExpense(false);
    setIsExpenseModalOpen(false);
    setExpDescription('');
    setExpAmount(0);
    setExpNotes('');
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este registro de gasto?')) return;
    await dbService.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="flex flex-col w-full pb-12 space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </span>
            <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
              Contabilidad & Cuadre de Caja
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Arqueo de efectivo, control por medio de pago, egresos y reporte contable en Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 active:scale-95 transition-all shadow-sm"
            title="Descargar libro de Excel con 4 pestañas: Cuadre de Caja, Ingresos, Egresos y Especialistas"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Descargar Cuadre en Excel (.xls)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-error text-white text-xs font-bold hover:bg-error/90 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">remove_circle</span>
            <span>+ Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Selector de Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-container p-1.5 rounded-2xl border border-surface-container-high/60">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs font-bold text-on-surface-variant">
            Período del Cuadre:
          </span>
          {period === 'custom_date' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1 text-xs font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </div>
        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          {(
            [
              { label: 'Hoy', value: 'today' },
              { label: 'Elegir Día', value: 'custom_date' },
              { label: 'Esta Semana', value: 'week' },
              { label: 'Este Mes', value: 'month' },
              { label: 'Todo el Historial', value: 'all' },
            ] as const
          ).map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === p.value
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bento Financiero: Ingresos vs Egresos vs Margen */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Ingresos */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">Ingresos Totales</span>
            <div className="w-8 h-8 rounded-full bg-primary-container/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-primary">
              S/ {totalIncome.toFixed(2)}
            </span>
            <span className="text-xs text-outline block font-medium">PEN recaudados</span>
          </div>
          <span className="text-[11px] text-primary font-bold">
            {filteredApts.length} sesiones{totalProductsIncome > 0 ? ` (incl. S/ ${totalProductsIncome} prod.)` : ''}
          </span>
        </div>

        {/* Total Egresos */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">Gastos / Egresos</span>
            <div className="w-8 h-8 rounded-full bg-error-container/30 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">trending_down</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-error">
              S/ {totalExpenses.toFixed(2)}
            </span>
            <span className="text-xs text-outline block font-medium">PEN egresados</span>
          </div>
          <span className="text-[11px] text-error font-bold">
            {filteredExps.length} compras / gastos
          </span>
        </div>

        {/* Utilidad Neta */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">Utilidad Neta</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${netProfit >= 0 ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-error text-white'}`}>
              <span className="material-symbols-outlined text-[18px]">
                {netProfit >= 0 ? 'attach_money' : 'priority_high'}
              </span>
            </div>
          </div>
          <div className="my-2">
            <span className={`font-serif text-2xl sm:text-3xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-error'}`}>
              S/ {netProfit.toFixed(2)}
            </span>
            <span className="text-xs text-outline block font-medium">Margen neto del spa</span>
          </div>
          <span className="text-[11px] font-bold text-tertiary">
            {totalIncome > 0 ? `${Math.round((netProfit / totalIncome) * 100)}% de margen` : 'Sin datos'}
          </span>
        </div>

        {/* Ticket Promedio */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">Ticket Promedio</span>
            <div className="w-8 h-8 rounded-full bg-secondary-container/40 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-secondary">
              S/ {avgTicket}
            </span>
            <span className="text-xs text-outline block font-medium">Promedio por paciente</span>
          </div>
          <span className="text-[11px] text-on-surface-variant font-medium">
            Por sesión atendida
          </span>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MÓDULO DE CUADRE Y ARQUEO DE CAJA (EFECTIVO vs DIGITALES + EXCEL)     */}
      {/* ===================================================================== */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-700/15 text-emerald-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Cuadre y Arqueo de Caja ({periodLabels[period].label})
              </h3>
              <p className="text-xs text-on-surface-variant">
                Verifica el efectivo físico en el cajón frente a los cobros por Yape/Plin, POS y Transferencia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBillCounter((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-variant transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">calculate</span>
              <span>{showBillCounter ? 'Ocultar Contador de Billetes' : 'Contar Billetes y Monedas'}</span>
            </button>
          </div>
        </div>

        {/* Tarjetas por Método de Pago */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {paymentBreakdown.map((pm) => (
            <div
              key={pm.value}
              className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    {pm.icon}
                  </span>
                  {pm.label}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                  {pm.incomeCount} cobros
                </span>
              </div>

              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between text-on-surface-variant">
                  <span>(+) Ingresos:</span>
                  <span className="font-bold text-primary">S/ {pm.income.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>(-) Gastos:</span>
                  <span className="font-bold text-error">- S/ {pm.expense.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-surface-container-high flex items-center justify-between">
                <span className="text-[11px] font-bold text-on-surface">Saldo Neto:</span>
                <span className="font-serif text-base font-bold text-primary">
                  S/ {pm.net.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bloque de Arqueo Físico del Cajón de Efectivo */}
        <div className="p-4 rounded-2xl bg-emerald-950/5 border border-emerald-800/20 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            {/* 1. Fondo Inicial */}
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                1. Fondo Inicial (Sencillo en Caja S/)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={openingCash}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setOpeningCash(val);
                  persistCashBoxState({ openingCash: val });
                }}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 2. Efectivo Esperado según Sistema */}
            <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high">
              <span className="text-[11px] font-bold text-on-surface-variant block">
                2. Efectivo Esperado en Cajón
              </span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="font-serif text-xl font-bold text-primary">
                  S/ {expectedCashInDrawer.toFixed(2)}
                </span>
                <span className="text-[10px] text-outline">
                  ({openingCash} + {cashChannel.income} - {cashChannel.expense})
                </span>
              </div>
            </div>

            {/* 3. Efectivo Físico Contado */}
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                3. Efectivo Físico Contado (S/)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Ej. 450.00"
                value={countedCashInput}
                onChange={(e) => {
                  setCountedCashInput(e.target.value);
                  persistCashBoxState({ countedCash: e.target.value });
                }}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2.5 text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 4. Resultado del Arqueo (Diferencia) */}
            <div
              className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                !hasCountedCash
                  ? 'bg-surface-container-lowest border-surface-container-high text-on-surface-variant'
                  : Math.abs(cashDifference) < 0.01
                  ? 'bg-emerald-700 text-white border-emerald-800'
                  : cashDifference > 0
                  ? 'bg-sky-700 text-white border-sky-800'
                  : 'bg-error text-white border-error'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-90">
                4. Estado del Cuadre
              </span>
              <span className="font-serif text-base font-bold truncate">
                {!hasCountedCash
                  ? 'Ingresa efectivo contado'
                  : Math.abs(cashDifference) < 0.01
                  ? '✓ Caja Cuadrada (S/ 0.00)'
                  : cashDifference > 0
                  ? `Sobrante: + S/ ${cashDifference.toFixed(2)}`
                  : `Faltante: - S/ ${Math.abs(cashDifference).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Contador interactivo de Billetes y Monedas */}
          {showBillCounter && (
            <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">payments</span>
                  Calculadora de Billetes y Monedas (Soles PEN)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDenomCounts({});
                    setCountedCashInput('');
                    persistCashBoxState({ countedCash: '' });
                  }}
                  className="text-[11px] font-bold text-error hover:underline"
                >
                  Limpiar conteo
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {PEN_DENOMINATIONS.map((d) => {
                  const qty = denomCounts[d.value] || 0;
                  return (
                    <div
                      key={d.value}
                      className="p-2 rounded-lg bg-surface-container-low border border-surface-container-high flex flex-col gap-1"
                    >
                      <span className="text-[11px] font-bold text-on-surface">{d.label}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={qty || ''}
                          placeholder="0"
                          onChange={(e) => handleUpdateDenom(d.value, Number(e.target.value))}
                          className="w-16 bg-surface-container-lowest border border-surface-container-high rounded px-2 py-1 text-xs font-bold text-primary"
                        />
                        <span className="text-[11px] text-outline font-semibold">
                          = S/ {(qty * d.value).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Responsable y Observaciones para el Excel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                Responsable de Caja / Turno
              </label>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => {
                  setCashierName(e.target.value);
                  persistCashBoxState({ cashierName: e.target.value });
                }}
                placeholder="Ej. Recepción Turno Tarde / Dra. Adranna"
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                Observaciones del Cierre de Caja (se incluyen en el Excel)
              </label>
              <input
                type="text"
                value={closingNotes}
                onChange={(e) => {
                  setClosingNotes(e.target.value);
                  persistCashBoxState({ closingNotes: e.target.value });
                }}
                placeholder="Ej. Se dejó S/ 100 de sencillo para mañana, depósito BCP realizado..."
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Desglose por Servicio y Productos */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-3">
        <h3 className="font-serif text-lg font-bold text-primary">
          Ingresos por Especialidad Clínica y Productos
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <div>
                <span className="text-xs font-bold text-on-surface block">Podología Clínica</span>
                <span className="text-[11px] text-outline font-medium">
                  {filteredApts.filter((a) => a.discipline === 'podologia').length} sesiones
                </span>
              </div>
            </div>
            <span className="font-serif font-bold text-lg text-primary">S/ {podoIncome}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-secondary"></span>
              <div>
                <span className="text-xs font-bold text-on-surface block">Masajes / Spa</span>
                <span className="text-[11px] text-outline font-medium">
                  {filteredApts.filter((a) => a.discipline === 'masaje').length} sesiones
                </span>
              </div>
            </div>
            <span className="font-serif font-bold text-lg text-secondary">S/ {spaIncome}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
              <div>
                <span className="text-xs font-bold text-on-surface block">Productos Vendidos</span>
                <span className="text-[11px] text-outline font-medium">
                  Incluidos en sesiones
                </span>
              </div>
            </div>
            <span className="font-serif font-bold text-lg text-emerald-700">
              S/ {totalProductsIncome}
            </span>
          </div>
        </div>
      </section>

      {/* Detalle de Ingresos (Citas y Ventas) con Selector Rápido de Método de Pago */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Detalle de Ingresos Cobrados en el Período
              </h3>
              <p className="text-[11px] text-on-surface-variant">
                Puedes verificar o cambiar el medio de pago de cada sesión para que el cuadre salga exacto
              </p>
            </div>
          </div>
          <span className="text-xs text-outline font-medium">
            {filteredApts.length} sesiones
          </span>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-on-surface-variant">
            Cargando ingresos del período...
          </div>
        ) : filteredApts.length === 0 ? (
          <div className="py-6 text-center text-xs text-on-surface-variant">
            No hay sesiones registradas en este período.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredApts.map((apt) => (
              <div
                key={apt.id}
                className="p-3 bg-surface-container-low rounded-xl border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-on-surface">
                      {apt.clientName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-container/15 text-primary">
                      {apt.serviceName}
                    </span>
                    {apt.soldProducts && apt.soldProducts.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container/50 text-secondary">
                        + {apt.soldProducts.reduce((s, p) => s + p.quantity, 0)} prod. (S/ {apt.productsTotal})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-outline mt-0.5">
                    {apt.date} · {apt.time} • {apt.professionalName} ({apt.cabinName})
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                  <select
                    value={apt.paymentMethod || 'efectivo'}
                    onChange={(e) =>
                      handleChangeAppointmentPaymentMethod(
                        apt.id,
                        e.target.value as PaymentMethod
                      )
                    }
                    className="bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    title="Cambiar método de pago"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <span className="font-serif font-bold text-base text-primary min-w-[72px] text-right">
                    + S/ {Number(apt.price || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Registro de Egresos & Compras del Spa */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error">receipt</span>
            <h3 className="font-serif text-lg font-bold text-primary">
              Registro de Egresos & Gastos Operativos
            </h3>
          </div>
          <span className="text-xs text-outline font-medium">
            {filteredExps.length} registros
          </span>
        </div>

        {filteredExps.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-on-surface-variant text-center">
            <span className="material-symbols-outlined text-3xl text-outline">check_circle</span>
            <p className="text-xs font-medium">
              No hay egresos registrados en este período. Pulsa &quot;+ Registrar Gasto&quot; para añadir compras de insumos.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExps.map((exp) => (
              <div
                key={exp.id}
                className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-on-surface truncate">
                      {exp.description}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant capitalize">
                      {exp.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-outline mt-0.5">
                    {exp.date} • Pago: {exp.paymentMethod.replace('_', ' ')} {exp.notes ? `• ${exp.notes}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-serif font-bold text-base text-error">
                    - S/ {exp.amount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-error-container/40 text-error transition-colors"
                    title="Eliminar gasto"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Registrar Gasto */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 pb-8 sm:pb-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-error text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                </span>
                <h3 className="font-serif text-xl font-bold text-primary">
                  Registrar Gasto / Egreso
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Concepto / Descripción del Gasto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Compra de bisturís podológicos nº 15 y gasas estériles"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Monto (S/ PEN) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={0.5}
                    value={expAmount || ''}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Fecha del Gasto
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Categoría del Gasto
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as Expense['category'])}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Método de Pago
                </label>
                <select
                  value={expPaymentMethod}
                  onChange={(e) => setExpPaymentMethod(e.target.value as Expense['paymentMethod'])}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Notas / Proveedor (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Farmacia Especializada, Factura F001-284..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingExpense}
                className="w-full py-3.5 rounded-xl bg-error text-white font-bold text-xs shadow-md hover:bg-error/90 transition-all mt-2 flex items-center justify-center gap-2"
              >
                {isSavingExpense ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>Guardando gasto...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Guardar Egreso en Caja</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
