'use client';

import React from 'react';
import { INITIAL_CLIENTS } from '@/lib/mockData';

export default function ReportesPage() {
  const inactiveClients = INITIAL_CLIENTS.slice(0, 3);

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      <div className="pt-2">
        <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
          Caja, Rendimiento & Recordatorios
        </h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Ingresos del día, servicios top y automatización de retornos por WhatsApp
        </p>
      </div>

      {/* Resumen de Caja */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high/60 shadow-xs">
          <span className="text-xs text-on-surface-variant font-medium">Ingresos Totales Hoy</span>
          <div className="my-1.5">
            <span className="font-serif text-3xl font-bold text-primary">S/ 2,450</span>
            <span className="text-xs text-outline ml-1 font-semibold">PEN</span>
          </div>
          <span className="text-[11px] text-tertiary font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            8 citas cobradas
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high/60 shadow-xs">
          <span className="text-xs text-on-surface-variant font-medium">Ocupación de Cabinas</span>
          <div className="my-1.5">
            <span className="font-serif text-3xl font-bold text-secondary">84%</span>
          </div>
          <span className="text-[11px] text-on-surface-variant font-medium">
            3 cabinas activas simultáneamente
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high/60 shadow-xs">
          <span className="text-xs text-on-surface-variant font-medium">Retornos Agendados</span>
          <div className="my-1.5">
            <span className="font-serif text-3xl font-bold text-tertiary">92%</span>
          </div>
          <span className="text-[11px] text-tertiary font-bold">
            Tasa de re-agendamiento a 6 semanas
          </span>
        </div>
      </section>

      {/* Servicios Top */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-3">
        <h3 className="font-serif text-lg font-bold text-primary">
          Tratamientos Más Demandados del Mes
        </h3>

        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span>Onicocriptosis Láser + Reconstrucción</span>
              <span className="text-primary">42% (S/ 8,400)</span>
            </div>
            <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
              <div className="bg-primary-container h-full rounded-full" style={{ width: '42%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span>Masaje Descontracturante & Tejido Profundo</span>
              <span className="text-secondary">35% (S/ 7,000)</span>
            </div>
            <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: '35%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span>Quiropodia Integral Preventiva</span>
              <span className="text-tertiary">23% (S/ 4,600)</span>
            </div>
            <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
              <div className="bg-tertiary h-full rounded-full" style={{ width: '23%' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Módulo de Recordatorios de Retorno por WhatsApp */}
      <section className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-xl">chat</span>
            <h3 className="font-serif text-lg font-bold text-primary">
              Pacientes con Retorno Pendiente (&gt; 6 semanas)
            </h3>
          </div>
          <span className="text-xs bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-0.5 rounded-full font-bold">
            Retención Activa
          </span>
        </div>

        <p className="text-xs text-on-surface-variant">
          En podología y masoterapia, el retorno periódico cada 6 u 8 semanas previene complicaciones
          en pies diabéticos y recidivas de contracturas.
        </p>

        <div className="space-y-2.5 pt-1">
          {inactiveClients.map((client) => (
            <div
              key={client.id}
              className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <h4 className="font-bold text-sm text-on-surface">{client.name}</h4>
                <p className="text-xs text-outline mt-0.5">
                  Última visita: {client.lastVisit || 'Hace 6 semanas'} • {client.tags.join(', ')}
                </p>
              </div>

              <a
                href={`https://wa.me/?text=Hola%20${encodeURIComponent(
                  client.name
                )},%20te%20saludamos%20desde%20Adranna%20Spa.%20Han%20pasado%206%20semanas%20desde%20tu%20última%20sesión%20y%20toca%20tu%20revisión%20de%20mantenimiento%20para%20cuidar%20tu%20salud.%20¿Te%20gustaría%20agendar%20esta%20semana?`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-tertiary text-white text-xs font-bold hover:bg-tertiary-container transition-all flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Enviar Recordatorio</span>
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
