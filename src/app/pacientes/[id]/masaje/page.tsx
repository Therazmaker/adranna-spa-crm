'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_CAMILA_MASSAGE_RECORD, EMPTY_CLIENT } from '@/lib/mockData';
import { dbService } from '@/lib/dbService';
import { MassageRecord, Client } from '@/types/database';
import BodyMap from '@/components/BodyMap';

export default function MasajeRecordPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client>(EMPTY_CLIENT);
  const [record, setRecord] = useState<MassageRecord>(INITIAL_CAMILA_MASSAGE_RECORD);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [pressure, setPressure] = useState<MassageRecord['preferredPressure']>('Media');
  const [oil, setOil] = useState('');
  const [notes, setNotes] = useState('');
  const [contraindications, setContraindications] = useState<string[]>([]);
  const [newContraindication, setNewContraindication] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    dbService.getClients().then((clients) => {
      const found = clients.find((c) => c.id === clientId);
      if (found) {
        setClient(found);
      }
    });

    dbService.getMassageRecord(clientId).then((rec) => {
      if (rec) {
        setRecord(rec);
        setSelectedZones(rec.tensionZones || []);
        setPressure(rec.preferredPressure || 'Media');
        setOil(rec.aromatherapyOil || '');
        setNotes(rec.sessionNotes || '');
        setContraindications(rec.contraindications || []);
      }
    });
  }, [clientId]);

  const handleToggleZone = (zoneId: string) => {
    if (selectedZones.includes(zoneId)) {
      setSelectedZones(selectedZones.filter((z) => z !== zoneId));
    } else {
      setSelectedZones([...selectedZones, zoneId]);
    }
  };

  const handleAddContraindication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContraindication.trim()) return;
    setContraindications([...contraindications, newContraindication.trim()]);
    setNewContraindication('');
  };

  const handleDeleteContraindication = (index: number) => {
    setContraindications(contraindications.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updated: MassageRecord = {
      ...record,
      clientId,
      massageType: 'descontracturante',
      preferredPressure: pressure,
      tensionZones: selectedZones,
      contraindications,
      aromatherapyOil: oil,
      sessionNotes: notes.trim(),
      durationMinutes: record.durationMinutes || 60,
      lastSessionDate: new Date().toISOString().slice(0, 10),
    };

    await dbService.saveMassageRecord(updated);
    setRecord(updated);
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex flex-col w-full pb-12 space-y-5">
      {isSaved && (
        <div className="fixed top-20 right-4 z-50 bg-secondary text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Ficha de Masoterapia y Zonas de Tensión Guardada con Éxito</span>
        </div>
      )}

      {/* Cabecera del Paciente */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {client.avatarUrl ? (
              <img
                src={client.avatarUrl}
                alt={client.name}
                className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-secondary/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-secondary-container/30 border border-secondary/30 text-secondary font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-xs">
                {getInitials(client.name || 'Paciente')}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-secondary-container/40 text-secondary px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider font-bold">
                  Ficha Terapéutica Spa
                </span>
                <span className="bg-surface-container-high text-on-surface-variant text-xs px-2 py-0.5 rounded-full font-bold">
                  {client.totalVisits || 1} {client.totalVisits === 1 ? 'Sesión' : 'Sesiones'}
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl text-on-surface font-bold truncate mt-0.5">
                {client.name}
              </h2>
              <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5 font-medium">
                <span className="material-symbols-outlined text-sm text-secondary">phone_iphone</span>
                <span>{client.phone || 'Sin teléfono'}</span>
                {client.email && (
                  <>
                    <span>•</span>
                    <span className="truncate">{client.email}</span>
                  </>
                )}
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

      {/* 2. CONTRAINDICACIONES Y LESIONES PREVIAS (100% Editable) */}
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

        {/* Formulario para agregar contraindicación */}
        <form onSubmit={handleAddContraindication} className="flex gap-2">
          <input
            type="text"
            placeholder="Ej. Varices profundas en pierna izquierda / Lumbalgia mecánica / No tocar cuello..."
            value={newContraindication}
            onChange={(e) => setNewContraindication(e.target.value)}
            className="flex-1 bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary/90 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Agregar</span>
          </button>
        </form>

        {/* Lista de contraindicaciones activas */}
        <div className="bg-surface-container-low p-3.5 rounded-xl space-y-2 border border-surface-container-high">
          {contraindications.length === 0 ? (
            <p className="text-xs text-outline italic text-center py-2">
              Sin contraindicaciones o lesiones previas registradas para este paciente.
            </p>
          ) : (
            contraindications.map((contra, idx) => (
              <div
                key={idx}
                className="p-3 bg-surface-container-lowest rounded-xl border border-surface-container-high flex items-center justify-between gap-2.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-secondary text-base flex-shrink-0">
                    warning
                  </span>
                  <span className="font-semibold text-on-surface">{contra}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteContraindication(idx)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-error-container/40 text-error flex-shrink-0"
                  title="Eliminar contraindicación"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ))
          )}
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
          <span className="text-xs text-outline font-medium">Sesión de Masaje</span>
        </div>

        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs leading-relaxed font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          placeholder="Anotar evolución miofascial, respuesta muscular, zonas trabajadas y recomendaciones de estiramiento..."
        />

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Guardar Ficha de Masoterapia</span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
