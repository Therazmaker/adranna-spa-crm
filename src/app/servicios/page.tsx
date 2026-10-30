'use client';

import React, { useState } from 'react';
import { INITIAL_SERVICES } from '@/lib/mockData';
import { ServicePackage } from '@/types/database';

export default function ServiciosPage() {
  const [services] = useState<ServicePackage[]>(INITIAL_SERVICES);
  const [filterCategory, setFilterCategory] = useState<'all' | 'podologia' | 'masaje' | 'paquete'>('all');

  const filtered = services.filter((s) => {
    if (filterCategory === 'all') return true;
    return s.category === filterCategory;
  });

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
            Servicios & Paquetes de Sesiones
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Tarifario, duración de cabina y bonos fidelización
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-gutter-mobile px-gutter-mobile">
        {(['all', 'podologia', 'masaje', 'paquete'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              filterCategory === cat
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high hover:bg-surface-container'
            }`}
          >
            {cat === 'all'
              ? 'Todos los Servicios'
              : cat === 'podologia'
              ? 'Podología Clínica'
              : cat === 'masaje'
              ? 'Terapias de Masaje'
              : 'Bonos & Paquetes'}
          </button>
        ))}
      </div>

      {/* Grid de Servicios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {filtered.map((srv) => (
          <div
            key={srv.id}
            className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    srv.category === 'podologia'
                      ? 'bg-primary-container/10 text-primary-container'
                      : srv.category === 'masaje'
                      ? 'bg-secondary-container/40 text-secondary'
                      : 'bg-tertiary-fixed text-on-tertiary-fixed'
                  }`}
                >
                  {srv.category === 'podologia'
                    ? 'Podología'
                    : srv.category === 'masaje'
                    ? 'Masoterapia'
                    : 'Bono Multi-Sesión'}
                </span>

                <span className="text-xs text-outline font-semibold">
                  {srv.durationMinutes} min en cabina
                </span>
              </div>

              <h3 className="font-serif text-lg font-bold text-on-surface mt-2">
                {srv.name}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                {srv.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-container-high">
              <span className="font-serif text-xl font-bold text-primary">
                S/ {srv.price} PEN
              </span>
              <button
                type="button"
                onClick={() => alert(`Servicio ${srv.name} seleccionado para agendar`)}
                className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-all"
              >
                Agendar Cita
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
