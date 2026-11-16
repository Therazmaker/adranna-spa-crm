'use client';

import React, { useEffect, useState } from 'react';
import { Appointment } from '@/types/database';
import { formatTime12 } from '@/lib/timeUtils';
import {
  DEFAULT_FERGIS_CONFIG,
  FergisConfig,
  calcFergisMassage,
  getFergisConfig,
  getHourlyRate,
  saveFergisConfig,
} from '@/lib/fergis';

interface FergisPayrollCardProps {
  appointments: Appointment[]; // citas del período ya filtradas (sin canceladas)
  periodLabel: string;
  isMonthPeriod: boolean;
}

const money = (n: number) => `S/ ${n.toFixed(2)}`;

export default function FergisPayrollCard({ appointments, periodLabel, isMonthPeriod }: FergisPayrollCardProps) {
  const [config, setConfig] = useState<FergisConfig>(DEFAULT_FERGIS_CONFIG);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [draft, setDraft] = useState({ salary: '', rate: '', percent: '' });

  useEffect(() => {
    setConfig(getFergisConfig());
  }, []);

  const rows = appointments
    .filter((a) => a.fergisMassage)
    .map((a) => ({ apt: a, calc: calcFergisMassage(a, config)! }))
    .sort((x, y) => `${x.apt.date} ${x.apt.time}`.localeCompare(`${y.apt.date} ${y.apt.time}`));

  // Solo los masajes completados cuentan para el pago; el resto se muestra como programado
  const done = rows.filter((r) => r.apt.status === 'completado');
  const pending = rows.filter((r) => r.apt.status !== 'completado');

  const totalMinutes = done.reduce((s, r) => s + r.calc.durationMinutes, 0);
  const totalDeduction = done.reduce((s, r) => s + r.calc.deduction, 0);
  const totalCommission = done.reduce((s, r) => s + r.calc.commission, 0);
  const totalNet = totalCommission - totalDeduction;
  const monthlyPay = config.monthlySalary - totalDeduction + totalCommission;

  const openConfig = () => {
    setDraft({
      salary: String(config.monthlySalary),
      rate: String(config.hourlyRate),
      percent: String(config.defaultPercent),
    });
    setIsEditingConfig(true);
  };

  const handleSaveConfig = () => {
    const next: FergisConfig = {
      monthlySalary: Number(draft.salary) || DEFAULT_FERGIS_CONFIG.monthlySalary,
      hourlyRate: Number(draft.rate) || DEFAULT_FERGIS_CONFIG.hourlyRate,
      defaultPercent: Number(draft.percent) || 0,
    };
    saveFergisConfig(next);
    setConfig(next);
    setIsEditingConfig(false);
  };

  return (
    <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-700">badge</span>
          <div>
            <h3 className="font-serif text-lg font-bold text-primary">Fergis · Recepción y Masajes</h3>
            <p className="text-[11px] text-outline">
              {periodLabel} · Sueldo {money(config.monthlySalary)} · Valor hora {money(getHourlyRate(config))} ·
              Comisión por defecto {config.defaultPercent}%
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => (isEditingConfig ? setIsEditingConfig(false) : openConfig())}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-surface-container-high text-xs font-bold text-on-surface-variant hover:text-primary"
        >
          {isEditingConfig ? 'Cerrar' : 'Ajustes'}
        </button>
      </div>

      {isEditingConfig && (
        <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['salary', 'Sueldo mensual (S/)'],
                ['rate', 'Valor hora (S/)'],
                ['percent', 'Comisión por defecto (%)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant block">{label}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft[key]}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value.replace(/[^0-9.]/g, '') })}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2.5 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-outline">
            Cada masaje guarda el valor hora con el que se agendó, así que cambiar estos ajustes solo afecta a
            los masajes que se agenden desde ahora.
          </p>
          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container"
          >
            Guardar ajustes
          </button>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high">
          <span className="text-[10px] uppercase tracking-wider text-outline font-bold block">Masajes realizados</span>
          <span className="font-serif text-xl font-bold text-on-surface">{done.length}</span>
          <span className="text-[10px] text-outline block">{(totalMinutes / 60).toFixed(2)} h en total</span>
        </div>
        <div className="p-3 rounded-xl bg-error-container/20 border border-error/20">
          <span className="text-[10px] uppercase tracking-wider text-error font-bold block">Descuento por horas</span>
          <span className="font-serif text-xl font-bold text-error">− {money(totalDeduction)}</span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold block">Comisión masajes</span>
          <span className="font-serif text-xl font-bold text-emerald-800">+ {money(totalCommission)}</span>
        </div>
        <div className="p-3 rounded-xl bg-primary-container/10 border border-primary/20">
          {isMonthPeriod ? (
            <>
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold block">Pago del mes</span>
              <span className="font-serif text-xl font-bold text-primary">{money(monthlyPay)}</span>
              <span className="text-[10px] text-outline block">
                {money(config.monthlySalary)} − {money(totalDeduction)} + {money(totalCommission)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold block">Efecto en su pago</span>
              <span className={`font-serif text-xl font-bold ${totalNet >= 0 ? 'text-primary' : 'text-error'}`}>
                {totalNet >= 0 ? '+' : '−'} {money(Math.abs(totalNet))}
              </span>
              <span className="text-[10px] text-outline block">Elige &quot;Este Mes&quot; para ver el pago total</span>
            </>
          )}
        </div>
      </div>

      {/* Lista de masajes */}
      {rows.length === 0 ? (
        <p className="text-xs text-outline text-center py-4">
          No hay masajes de Fergis en este período. Al agendar, elige a Fergis como profesional asignada.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-outline text-left border-b border-surface-container-high">
                <th className="py-2 px-1">Fecha</th>
                <th className="py-2 px-1">Cliente / Servicio</th>
                <th className="py-2 px-1 text-right">Tiempo</th>
                <th className="py-2 px-1 text-right">Precio</th>
                <th className="py-2 px-1 text-right">%</th>
                <th className="py-2 px-1 text-right">Descuento</th>
                <th className="py-2 px-1 text-right">Comisión</th>
                <th className="py-2 px-1 text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {[...done, ...pending].map(({ apt, calc }) => {
                const isDone = apt.status === 'completado';
                return (
                  <tr
                    key={apt.id}
                    className={`border-b border-surface-container-high/60 ${isDone ? '' : 'opacity-50'}`}
                  >
                    <td className="py-2 px-1 whitespace-nowrap">
                      {apt.date?.split('-').reverse().join('/')}
                      <span className="block text-[10px] text-outline">
                        {formatTime12(apt.time)}
                        {!isDone && ' · programado'}
                      </span>
                    </td>
                    <td className="py-2 px-1">
                      <span className="font-semibold text-on-surface">{apt.clientName}</span>
                      <span className="block text-[10px] text-outline">{apt.serviceName}</span>
                    </td>
                    <td className="py-2 px-1 text-right whitespace-nowrap">{calc.durationMinutes} min</td>
                    <td className="py-2 px-1 text-right whitespace-nowrap">{money(calc.price)}</td>
                    <td className="py-2 px-1 text-right">{calc.percent}%</td>
                    <td className="py-2 px-1 text-right whitespace-nowrap text-error">
                      − {money(calc.deduction)}
                      <span className="block text-[10px] text-outline">
                        {calc.hours.toFixed(2)} h × {money(calc.hourlyRate)}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-right whitespace-nowrap text-emerald-700">+ {money(calc.commission)}</td>
                    <td className={`py-2 px-1 text-right whitespace-nowrap font-bold ${calc.net >= 0 ? 'text-on-surface' : 'text-error'}`}>
                      {calc.net >= 0 ? '+' : '−'} {money(Math.abs(calc.net))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pending.length > 0 && (
            <p className="text-[10px] text-outline mt-2">
              Los masajes en gris aún no están finalizados y no se suman al pago hasta completarse.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
