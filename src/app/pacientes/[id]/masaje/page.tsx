'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_CAMILA_MASSAGE_RECORD, INITIAL_CLIENTS } from '@/lib/mockData';
import { MassageRecord } from '@/types/database';
import BodyMap from '@/components/BodyMap';

export default function MasajeRecordPage() {
  const params = useParams();
  const clientId = params.id as string;

  const client = INITIAL_CLIENTS.find((c) => c.id === clientId) || INITIAL_CLIENTS[2];
  const [record, setRecord] = useState<MassageRecord>(INITIAL_CAMILA_MASSAGE_RECORD);
  const [selectedZones, setSelectedZones] = useState<string[]>(record.tensionZones);
  const [pressure, setPressure] = useState(record.preferredPressure);
  const [oil, setOil] = useState(record.aromatherapyOil);
  const [notes, setNotes] = useState(record.sessionNotes);
  const [isSaved, setIsSaved] = useState(false);

  const handleToggleZone = (zoneId: string) => {
    if (selectedZones.includes(zoneId)) {
      setSelectedZones(selectedZones.filter((z) => z !== zoneId));
    } else {
      setSelectedZones([...selectedZones, zoneId]);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col w-full pb-12 space-y-5">
      {isSaved && (
        <div className="fixed top-20 right-4 z-50 bg-secondary text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Ficha de Masoterapia y Zonas de Tensión Guardada</span>
        </div>
      )}

      {/* Cabecera del Paciente */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={client.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={client.name}
              className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-secondary/20"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-secondary-container/40 text-secondary px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider font-bold">
                  Ficha Terapéutica Spa
                </span>
                <span className="bg-surface-container-high text-on-surface-variant text-xs px-2 py-0.5 rounded-full font-bold">
                  {client.totalVisits} Sesiones Realizadas
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl text-on-surface font-bold truncate mt-0.5">
                {client.name}
              </h2>
              <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5 font-medium">
                <span className="material-symbols-outlined text-sm text-secondary">phone_iphone</span>
                <span>{client.phone}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación de la Ficha */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <Link
            href={`/pacientes/${clientId}`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors whitespace-nowrap"
          >
            Resumen General
          </Link>
          <Link
            href={`/pacientes/${clientId}/podologia`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">footprint</span>
            <span>Ficha Podológica</span>
          </Link>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-secondary shadow-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">spa</span>
            <span>Ficha Masajes</span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
          </button>
        </div>
      </section>

      {/* 1. MAPA CORPORAL Y PREFERENCIAS */}
      <BodyMap
        selectedZones={selectedZones}
        onToggleZone={handleToggleZone}
        preferredPressure={pressure}
        onSelectPressure={setPressure}
        aromatherapyOil={oil}
        onSelectAromatherapy={setOil}
      />

      {/* 2. CONTRAINDICACIONES Y LESIONES */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">healing</span>
            <h3 className="font-serif text-lg text-on-surface font-bold">
              Contraindicaciones & Lesiones Previas
            </h3>
          </div>
          <span className="text-xs bg-secondary-container/50 text-secondary px-2.5 py-1 rounded-full font-bold">
            Protocolo de Cuidado
          </span>
        </div>

        <div className="bg-surface-container-low p-4 rounded-xl space-y-2.5 border border-surface-container-high">
          <div className="p-3 bg-surface-container-lowest rounded-xl border border-surface-container-high flex items-center gap-2.5 text-xs">
            <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
            <span className="font-semibold text-on-surface">
              Antecedente de lumbalgia mecánica por sedentarismo. Evitar maniobras de tracción lumbar brusca.
            </span>
          </div>

          <div className="p-3 bg-surface-container-lowest rounded-xl border border-surface-container-high flex items-center gap-2.5 text-xs">
            <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
            <span className="font-semibold text-on-surface">
              Sin varices profundas ni procesos infecciosos cutáneos activos.
            </span>
          </div>
        </div>
      </section>

      {/* 3. NOTAS DE EVOLUCIÓN DE SESIÓN */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">description</span>
            <h3 className="font-serif text-lg text-on-surface font-bold">
              Notas Terapéuticas por Sesión
            </h3>
          </div>
          <span className="text-xs text-outline font-medium">Sesión de 60 min</span>
        </div>

        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs leading-relaxed font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          placeholder="Anotar evolución miofascial, respuesta muscular y recomendaciones de estiramiento..."
        />

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Guardar Ficha de Masoterapia</span>
          </button>
        </div>
      </section>
    </div>
  );
}
