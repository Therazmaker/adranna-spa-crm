'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { dbService } from '@/lib/dbService';
import { Appointment, Expense } from '@/types/database';

const EXPENSE_CATEGORIES = [
  { label: 'Insumos Clínicos & Descartables', value: 'insumos' },
  { label: 'Alquiler & Local', value: 'alquiler' },
  { label: 'Servicios (Luz, Agua, Internet)', value: 'servicios' },
  { label: 'Honorarios / Personal', value: 'personal' },
  { label: 'Otros Gastos', value: 'otros' },
];

const PAYMENT_METHODS = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Yape / Plin', value: 'yape_plin' },
  { label: 'Transferencia Bancaria', value: 'transferencia' },
  { label: 'Tarjeta / POS', value: 'tarjeta' },
];

export default function ContabilidadPage() {
  const { role, setRole, isAdmin } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Modal Gasto State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expCategory, setExpCategory] = useState<Expense['category']>('insumos');
  const [expPaymentMethod, setExpPaymentMethod] = useState<Expense['paymentMethod']>('efectivo');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expNotes, setExpNotes] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
          <button
            type="button"
            onClick={() => setRole('admin')}
            className="px-4 py-2.5 rounded-xl bg-surface-container-high text-xs font-bold text-on-surface hover:bg-surface-container transition-colors"
          >
            Cambiar a Administrador (Modo Prueba)
          </button>
        </div>
      </div>
    );
  }

  // Filtrado por período
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))).toISOString().slice(0, 10);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const filterByDate = (dateStr?: string) => {
    if (!dateStr) return period === 'all';
    if (period === 'today') return dateStr === todayStr;
    if (period === 'week') return dateStr >= startOfWeek;
    if (period === 'month') return dateStr >= startOfMonth;
    return true;
  };

  const filteredApts = appointments.filter((a) => filterByDate(a.date));
  const filteredExps = expenses.filter((e) => filterByDate(e.date));

  const totalIncome = filteredApts.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const totalExpenses = filteredExps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const avgTicket = filteredApts.length > 0 ? Math.round(totalIncome / filteredApts.length) : 0;

  // Ingresos por disciplina
  const podoIncome = filteredApts.filter((a) => a.discipline === 'podologia').reduce((s, a) => s + (Number(a.price) || 0), 0);
  const spaIncome = filteredApts.filter((a) => a.discipline === 'masaje').reduce((s, a) => s + (Number(a.price) || 0), 0);

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
              Contabilidad & Finanzas
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Balance general, control de caja, ingresos por citas y registro de egresos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-error text-white text-xs font-bold hover:bg-error/90 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">remove_circle</span>
            <span>+ Registrar Gasto / Egreso</span>
          </button>
        </div>
      </div>

      {/* Selector de Período */}
      <div className="flex items-center justify-between bg-surface-container p-1 rounded-2xl border border-surface-container-high/60">
        <span className="text-xs font-bold text-on-surface-variant px-3 hidden sm:block">
          Período Contable:
        </span>
        <div className="flex gap-1 w-full sm:w-auto">
          {(
            [
              { label: 'Hoy', value: 'today' },
              { label: 'Esta Semana', value: 'week' },
              { label: 'Este Mes', value: 'month' },
              { label: 'Todo el Historial', value: 'all' },
            ] as const
          ).map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
            <span className="text-xs font-bold text-on-surface-variant">Ingresos por Citas</span>
            <div className="w-8 h-8 rounded-full bg-primary-container/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-primary">
              S/ {totalIncome}
            </span>
            <span className="text-xs text-outline block font-medium">PEN recaudados</span>
          </div>
          <span className="text-[11px] text-primary font-bold">
            {filteredApts.length} sesiones registradas
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
              S/ {totalExpenses}
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
              S/ {netProfit}
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
            Por sesión completada
          </span>
        </div>
      </section>

      {/* Desglose por Servicio */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-3">
        <h3 className="font-serif text-lg font-bold text-primary">
          Ingresos por Especialidad Clínica
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
        </div>
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

      {/* Simulador de Rol (Para que el Admin pruebe la restricción) */}
      <section className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-secondary font-bold block">
            Control de Permisos & Prueba de Roles
          </span>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Actualmente estás navegando con rol <strong>{role.toUpperCase()}</strong>. Puedes cambiar de rol para comprobar que las terapeutas o recepción no tienen acceso a esta pantalla.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRole('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              role === 'admin' ? 'bg-primary text-white border-primary shadow-xs' : 'bg-surface-container-lowest text-on-surface border-surface-container-high'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => setRole('recepcion')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              role === 'recepcion' ? 'bg-primary text-white border-primary shadow-xs' : 'bg-surface-container-lowest text-on-surface border-surface-container-high'
            }`}
          >
            Recepción
          </button>
          <button
            onClick={() => setRole('terapeuta')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              role === 'terapeuta' ? 'bg-primary text-white border-primary shadow-xs' : 'bg-surface-container-lowest text-on-surface border-surface-container-high'
            }`}
          >
            Terapeuta
          </button>
        </div>
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
