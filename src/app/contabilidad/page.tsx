'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { dbService } from '@/lib/dbService';
import { Appointment, Expense, PaymentMethod } from '@/types/database';
import { getAptAmountForMethod, getAptPayments, getPaymentOption, isMixedPayment } from '@/lib/payments';
import { exportCashReconciliationExcel } from '@/lib/excelExport';
import { getLocalDateStr, getStartOfWeekLocal, getStartOfMonthLocal } from '@/lib/dateUtils';
import { formatTime12 } from '@/lib/timeUtils';

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
  const [customDate, setCustomDate] = useState(() => getLocalDateStr());

  // Filtros interactivos por Especialidad, Especialista y Buscador de Cliente
  const [selectedDiscipline, setSelectedDiscipline] = useState<'todas' | 'podologia' | 'masaje'>('todas');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('todos');
  const [clientSearchFilter, setClientSearchFilter] = useState<string>('');
  const [expandedSpecialist, setExpandedSpecialist] = useState<string | null>(null);

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
  const [expDate, setExpDate] = useState(() => getLocalDateStr());
  const [expNotes, setExpNotes] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const activeBoxKey = period === 'custom_date' ? customDate : getLocalDateStr();

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

  // Helper para disciplina precisa (respeta tratamientos de masaje aunque estuvieran asignados como podología)
  const getDiscipline = (apt: Appointment): 'podologia' | 'masaje' => {
    if (apt.discipline === 'masaje') return 'masaje';
    if (/masaj|corporal|relaj|descontract|piedras|reduct/i.test(apt.serviceName || '')) return 'masaje';
    return 'podologia';
  };

  // Filtrado por período usando fecha local (sin desfase UTC al anochecer)
  const todayStr = getLocalDateStr();
  const startOfWeek = getStartOfWeekLocal();
  const startOfMonth = getStartOfMonthLocal();

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

  // 1. Ingresos y clientes por disciplina (Podología vs Masajes)
  const podoApts = filteredApts.filter((a) => getDiscipline(a) === 'podologia');
  const spaApts = filteredApts.filter((a) => getDiscipline(a) === 'masaje');

  // Clientes únicos atendidos en el período por disciplina
  const podoUniqueClients = new Set(podoApts.map((a) => a.clientName.trim().toLowerCase())).size;
  const spaUniqueClients = new Set(spaApts.map((a) => a.clientName.trim().toLowerCase())).size;

  const totalProductsIncome = filteredApts.reduce(
    (sum, a) => sum + (Number(a.productsTotal) || 0),
    0
  );
  const podoIncome = podoApts.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const spaIncome = spaApts.reduce((s, a) => s + (Number(a.price) || 0), 0);

  // 2. Lista de especialistas para los filtros
  const availableSpecialists = Array.from(
    new Set(
      filteredApts
        .map((a) => a.professionalName?.trim())
        .filter((name): name is string => Boolean(name))
    )
  ).sort();

  // 3. Estructura de rendimiento por especialista
  interface SpecialistClientSummary {
    clientName: string;
    clientId?: string;
    sessionsCount: number;
    services: string[];
    dates: string[];
    totalPaid: number;
  }

  interface SpecialistSummary {
    name: string;
    role: string;
    discipline: 'podologia' | 'masaje';
    sessionsCount: number;
    uniqueClientsCount: number;
    clients: SpecialistClientSummary[];
    totalIncome: number;
    serviceIncome: number;
    productsIncome: number;
  }

  const specialistsMap = new Map<string, SpecialistSummary>();

  for (const apt of filteredApts) {
    const specName = apt.professionalName?.trim() || 'Sin asignar';
    const disc = getDiscipline(apt);
    const curr = specialistsMap.get(specName) || {
      name: specName,
      role: apt.professionalRole || (disc === 'podologia' ? 'Podología' : 'Masoterapia'),
      discipline: disc,
      sessionsCount: 0,
      uniqueClientsCount: 0,
      clients: [],
      totalIncome: 0,
      serviceIncome: 0,
      productsIncome: 0,
    };

    curr.sessionsCount += 1;
    const totalAmt = Number(apt.price) || 0;
    const prodAmt = Number(apt.productsTotal) || 0;
    const srvAmt = apt.servicePrice !== undefined ? Number(apt.servicePrice) : totalAmt - prodAmt;

    curr.totalIncome += totalAmt;
    curr.serviceIncome += srvAmt;
    curr.productsIncome += prodAmt;

    let clientEntry = curr.clients.find(
      (c) => c.clientName.trim().toLowerCase() === apt.clientName.trim().toLowerCase()
    );
    if (!clientEntry) {
      clientEntry = {
        clientName: apt.clientName,
        clientId: apt.clientId,
        sessionsCount: 0,
        services: [],
        dates: [],
        totalPaid: 0,
      };
      curr.clients.push(clientEntry);
    }
    clientEntry.sessionsCount += 1;
    if (apt.serviceName && !clientEntry.services.includes(apt.serviceName)) {
      clientEntry.services.push(apt.serviceName);
    }
    const dateLabel = apt.date ? `${apt.date.split('-').reverse().join('/')} (${formatTime12(apt.time)})` : apt.time;
    if (!clientEntry.dates.includes(dateLabel)) {
      clientEntry.dates.push(dateLabel);
    }
    clientEntry.totalPaid += totalAmt;

    curr.uniqueClientsCount = curr.clients.length;
    specialistsMap.set(specName, curr);
  }

  const specialistsList = Array.from(specialistsMap.values()).sort(
    (a, b) => b.totalIncome - a.totalIncome
  );

  // 4. Filtrado de citas a mostrar en el detalle
  const displayedApts = filteredApts.filter((a) => {
    if (selectedDiscipline !== 'todas' && getDiscipline(a) !== selectedDiscipline) {
      return false;
    }
    if (selectedSpecialist !== 'todos' && a.professionalName?.trim() !== selectedSpecialist) {
      return false;
    }
    if (clientSearchFilter.trim()) {
      const q = clientSearchFilter.toLowerCase().trim();
      const matchClient = a.clientName.toLowerCase().includes(q);
      const matchPhone = a.clientPhone && a.clientPhone.toLowerCase().includes(q);
      const matchService = a.serviceName && a.serviceName.toLowerCase().includes(q);
      if (!matchClient && !matchPhone && !matchService) return false;
    }
    return true;
  });

  const displayedIncome = displayedApts.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const displayedUniqueClients = new Set(displayedApts.map((a) => a.clientName.trim().toLowerCase())).size;
  const isFilteringActive =
    selectedDiscipline !== 'todas' ||
    selectedSpecialist !== 'todos' ||
    Boolean(clientSearchFilter.trim());

  // Desglose por método de pago (para el Cuadre de Caja)
  const paymentBreakdown = PAYMENT_METHODS.map((pm) => {
    // Considera pagos mixtos: una cita puede aportar a varios métodos
    const aptsForMethod = filteredApts.filter(
      (a) => getAptAmountForMethod(a, pm.value) > 0
    );
    const expsForMethod = filteredExps.filter(
      (e) => (e.paymentMethod || 'efectivo') === pm.value
    );
    const income = filteredApts.reduce((s, a) => s + getAptAmountForMethod(a, pm.value), 0);
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
      prev.map((a) =>
        a.id === aptId
          ? { ...a, paymentMethod: newMethod, payments: [{ method: newMethod, amount: Number(a.price) || 0 }] }
          : a
      )
    );
    const apt = appointments.find((a) => a.id === aptId);
    await dbService.updateAppointment(aptId, {
      paymentMethod: newMethod,
      payments: [{ method: newMethod, amount: Number(apt?.price) || 0 }],
    });
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

      {/* ===================================================================== */}
      {/* 1. COMPARATIVA CLÍNICA: PODOLOGÍA vs MASAJES (CLIENTES Y FACTURACIÓN) */}
      {/* ===================================================================== */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">balance</span>
              <h3 className="font-serif text-lg font-bold text-primary">
                Comparativa de Disciplinas: Podología vs Masajes
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant">
              Claridad total de cuántos clientes únicos y cuántas sesiones atiende cada disciplina
            </p>
          </div>
          {isFilteringActive && (
            <button
              type="button"
              onClick={() => {
                setSelectedDiscipline('todas');
                setSelectedSpecialist('todos');
                setClientSearchFilter('');
              }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[15px]">filter_alt_off</span>
              <span>Restablecer Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {/* Tarjeta Podología Clínica */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
              selectedDiscipline === 'podologia'
                ? 'bg-primary/5 border-primary shadow-xs ring-2 ring-primary/20'
                : 'bg-surface-container-low border-surface-container-high hover:border-primary/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">footprint</span>
                  </span>
                  <div>
                    <span className="text-xs font-bold text-on-surface block">Podología Clínica</span>
                    <span className="text-[10px] text-outline font-semibold uppercase tracking-wider">
                      Especialidad de Pies
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {podoApts.length} sesiones
                </span>
              </div>

              <div className="mt-3.5 flex items-baseline justify-between border-t border-surface-container-high/80 pt-2.5">
                <div>
                  <span className="text-2xl sm:text-3xl font-serif font-extrabold text-primary block leading-none">
                    {podoUniqueClients}
                  </span>
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    {podoUniqueClients === 1 ? 'Paciente atendido' : 'Pacientes atendidos'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-serif font-extrabold text-lg text-on-surface block leading-none">
                    S/ {podoIncome.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-outline font-medium">Facturado</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDiscipline(selectedDiscipline === 'podologia' ? 'todas' : 'podologia')}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                selectedDiscipline === 'podologia'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-lowest text-primary hover:bg-primary/10 border border-primary/20'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {selectedDiscipline === 'podologia' ? 'check_circle' : 'filter_list'}
              </span>
              <span>{selectedDiscipline === 'podologia' ? 'Mostrando Podología' : 'Ver solo Podología'}</span>
            </button>
          </div>

          {/* Tarjeta Masajes & Bienestar (Masajista) */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
              selectedDiscipline === 'masaje'
                ? 'bg-secondary/10 border-secondary shadow-xs ring-2 ring-secondary/20'
                : 'bg-surface-container-low border-surface-container-high hover:border-secondary/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">spa</span>
                  </span>
                  <div>
                    <span className="text-xs font-bold text-on-surface block">Masajes & Bienestar</span>
                    <span className="text-[10px] text-outline font-semibold uppercase tracking-wider">
                      Área de Masajista
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                  {spaApts.length} sesiones
                </span>
              </div>

              <div className="mt-3.5 flex items-baseline justify-between border-t border-surface-container-high/80 pt-2.5">
                <div>
                  <span className="text-2xl sm:text-3xl font-serif font-extrabold text-secondary block leading-none">
                    {spaUniqueClients}
                  </span>
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    {spaUniqueClients === 1 ? 'Paciente atendido' : 'Pacientes atendidos'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-serif font-extrabold text-lg text-on-surface block leading-none">
                    S/ {spaIncome.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-outline font-medium">Facturado</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDiscipline(selectedDiscipline === 'masaje' ? 'todas' : 'masaje')}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                selectedDiscipline === 'masaje'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'bg-surface-container-lowest text-secondary hover:bg-secondary/10 border border-secondary/20'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {selectedDiscipline === 'masaje' ? 'check_circle' : 'filter_list'}
              </span>
              <span>{selectedDiscipline === 'masaje' ? 'Mostrando Masajes' : 'Ver solo Masajista'}</span>
            </button>
          </div>

          {/* Tarjeta Productos Vendidos */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-700/15 text-emerald-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                  </span>
                  <div>
                    <span className="text-xs font-bold text-on-surface block">Venta de Productos</span>
                    <span className="text-[10px] text-outline font-semibold uppercase tracking-wider">
                      Cremas, órtesis y sprays
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex items-baseline justify-between border-t border-surface-container-high/80 pt-2.5">
                <div>
                  <span className="text-2xl sm:text-3xl font-serif font-extrabold text-emerald-800 block leading-none">
                    S/ {totalProductsIncome.toFixed(2)}
                  </span>
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    Total productos en sesiones
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-outline italic text-center py-1">
              Descontados de stock de inventario
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. RENDIMIENTO Y LISTADO DE CLIENTES POR CADA ESPECIALISTA            */}
      {/* ===================================================================== */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Rendimiento & Clientes Atendidos por Especialista ({specialistsList.length})
              </h3>
              <p className="text-xs text-on-surface-variant">
                Consulta exacta de qué clientes atendió cada profesional y cuántas sesiones generó
              </p>
            </div>
          </div>
        </div>

        {specialistsList.length === 0 ? (
          <div className="py-8 text-center text-xs text-outline italic">
            No hay atenciones de especialistas en este período.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {specialistsList.map((spec) => {
              const isSelected = selectedSpecialist === spec.name;
              const isExpanded = expandedSpecialist === spec.name;

              return (
                <div
                  key={spec.name}
                  className={`rounded-2xl border-2 transition-all p-4 space-y-3 ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-xs'
                      : 'bg-surface-container-low/70 border-surface-container-high hover:border-primary/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-container/20 text-primary font-bold text-base flex items-center justify-center flex-shrink-0">
                        {spec.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-on-surface">{spec.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              spec.discipline === 'podologia'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-secondary/15 text-secondary border border-secondary/20'
                            }`}
                          >
                            {spec.discipline === 'podologia' ? '🩺 Podología' : '💆 Masajes'}
                          </span>
                          <span className="text-[10px] font-semibold text-outline">
                            {spec.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Atendió a <strong>{spec.uniqueClientsCount} clientes</strong> en{' '}
                          <strong>{spec.sessionsCount} sesiones</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <div className="text-right pr-2">
                        <span className="font-serif font-extrabold text-base text-primary block leading-none">
                          S/ {spec.totalIncome.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-outline font-medium">
                          Servicios: S/ {spec.serviceIncome.toFixed(2)}
                          {spec.productsIncome > 0 ? ` + Prod: S/ ${spec.productsIncome.toFixed(2)}` : ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedSpecialist(isSelected ? 'todos' : spec.name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-surface-container-lowest text-primary hover:bg-primary/10 border border-primary/20'
                        }`}
                        title="Filtrar todas las atenciones de este especialista en la tabla de ingresos"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isSelected ? 'check' : 'filter_alt'}
                        </span>
                        <span>{isSelected ? 'Filtrado' : 'Filtrar Citas'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedSpecialist(isExpanded ? null : spec.name)}
                        className="px-3 py-1.5 rounded-xl bg-surface-container-lowest text-on-surface hover:text-primary border border-surface-container-high text-xs font-bold flex items-center gap-1"
                        title="Ver lista detallada de clientes atendidos"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isExpanded ? 'expand_less' : 'groups'}
                        </span>
                        <span>
                          {isExpanded
                            ? 'Ocultar Pacientes'
                            : `Ver ${spec.uniqueClientsCount} Pacientes`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Lista desplegable de clientes atendidos por este profesional */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-surface-container-high/70 space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant pb-1">
                        <span>Pacientes Atendidos por {spec.name}:</span>
                        <span className="text-[11px] text-outline font-normal">
                          {spec.clients.length} pacientes distintos
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {spec.clients.map((c, idx) => (
                          <div
                            key={`${c.clientName}-${idx}`}
                            className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high flex flex-col justify-between text-xs gap-1.5"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-on-surface truncate">
                                {c.clientName}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant flex-shrink-0">
                                {c.sessionsCount} {c.sessionsCount === 1 ? 'cita' : 'citas'}
                              </span>
                            </div>

                            <p className="text-[11px] text-outline line-clamp-1">
                              {c.services.join(', ')}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/60 text-[10px]">
                              <span className="text-outline">
                                {c.dates[c.dates.length - 1]}
                              </span>
                              <span className="font-bold text-primary">
                                S/ {c.totalPaid.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 3. DETALLE DE INGRESOS CON BARRA DE FILTROS INTERACTIVA               */}
      {/* ===================================================================== */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Detalle de Ingresos Cobrados en el Período
              </h3>
              <p className="text-[11px] text-on-surface-variant">
                Verifica cobros, medios de pago y atenciones con filtros por especialista y cliente
              </p>
            </div>
          </div>
          <span className="text-xs text-outline font-medium">
            {displayedApts.length} de {filteredApts.length} sesiones
          </span>
        </div>

        {/* Barra de Filtros Interactivos: Disciplina, Especialista y Buscador de Cliente */}
        <div className="p-3 bg-surface-container-low rounded-2xl border border-surface-container-high space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span>Filtros de Búsqueda:</span>
            </span>

            {isFilteringActive && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDiscipline('todas');
                  setSelectedSpecialist('todos');
                  setClientSearchFilter('');
                }}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">clear</span>
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            {/* Píldoras de Disciplina */}
            <div className="sm:col-span-5 flex rounded-xl bg-surface-container-lowest p-1 border border-surface-container-high">
              <button
                type="button"
                onClick={() => setSelectedDiscipline('todas')}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                  selectedDiscipline === 'todas'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Todas ({filteredApts.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDiscipline('podologia')}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                  selectedDiscipline === 'podologia'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                🩺 Podología ({podoApts.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDiscipline('masaje')}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                  selectedDiscipline === 'masaje'
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-secondary'
                }`}
              >
                💆 Masajes ({spaApts.length})
              </button>
            </div>

            {/* Selector de Especialista */}
            <div className="sm:col-span-4">
              <select
                value={selectedSpecialist}
                onChange={(e) => setSelectedSpecialist(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl py-2 px-2.5 text-xs font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="todos">-- Todos los Especialistas ({availableSpecialists.length}) --</option>
                {specialistsList.map((spec) => (
                  <option key={spec.name} value={spec.name}>
                    {spec.name} ({spec.sessionsCount} sesiones · {spec.uniqueClientsCount} clientes)
                  </option>
                ))}
              </select>
            </div>

            {/* Buscador de Cliente */}
            <div className="sm:col-span-3 relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientSearchFilter}
                onChange={(e) => setClientSearchFilter(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl pl-8 pr-7 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {clientSearchFilter && (
                <button
                  type="button"
                  onClick={() => setClientSearchFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs w-4 h-4 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Banner resumen del filtro activo */}
          {isFilteringActive && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-primary font-semibold">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="material-symbols-outlined text-[15px]">filter_alt</span>
                <span>
                  Filtrando: {selectedDiscipline !== 'todas' ? (selectedDiscipline === 'podologia' ? '🩺 Podología' : '💆 Masajes') : ''}
                  {selectedSpecialist !== 'todos' ? ` • ${selectedSpecialist}` : ''}
                  {clientSearchFilter ? ` • "${clientSearchFilter}"` : ''}
                </span>
                <span className="font-bold">• {displayedApts.length} atenciones ({displayedUniqueClients} clientes)</span>
              </div>
              <span className="font-serif font-bold text-sm">
                S/ {displayedIncome.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-on-surface-variant">
            Cargando ingresos del período...
          </div>
        ) : displayedApts.length === 0 ? (
          <div className="py-6 text-center text-xs text-on-surface-variant">
            No hay atenciones que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {displayedApts.map((apt) => (
              <div
                key={apt.id}
                className="p-3 bg-surface-container-low rounded-xl border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-on-surface">
                      {apt.clientName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        apt.status === 'completado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apt.depositAmount && Number(apt.depositAmount) > 0
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {apt.status === 'completado'
                        ? 'Cobrada'
                        : apt.depositAmount && Number(apt.depositAmount) > 0
                        ? 'Adelanto cobrado'
                        : 'Por cobrar'}
                    </span>
                    {apt.depositAmount && Number(apt.depositAmount) > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Adelanto: S/ {Number(apt.depositAmount).toFixed(2)}
                        {apt.status !== 'completado' &&
                          ` (Resta S/ ${(Math.max(0, (Number(apt.price) || 0) - Number(apt.depositAmount))).toFixed(2)})`}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        getDiscipline(apt) === 'podologia'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {getDiscipline(apt) === 'podologia' ? '🩺 Podología' : '💆 Masaje'}
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
                    {apt.date} · {formatTime12(apt.time)} • {apt.professionalName} ({apt.cabinName})
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                  {isMixedPayment(apt) ? (
                    <div className="flex items-center gap-1 flex-wrap justify-end" title="Pago mixto">
                      <span className="material-symbols-outlined text-[14px] text-secondary">call_split</span>
                      {getAptPayments(apt).map((p) => {
                        const opt = getPaymentOption(p.method);
                        return (
                          <span
                            key={p.method}
                            className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-0.5 ${opt.badgeClass}`}
                          >
                            <span className="material-symbols-outlined text-[12px]">{opt.icon}</span>
                            {opt.shortLabel} S/{Number(p.amount).toFixed(2)}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
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
                  )}

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
