'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_CLIENTS } from '@/lib/mockData';

export default function PacienteGeneralPage() {
  const params = useParams();
  const clientId = params.id as string;

  const client = INITIAL_CLIENTS.find((c) => c.id === clientId) || INITIAL_CLIENTS[0];

  return (
    <div className="flex flex-col w-full pb-12 space-y-5">
      {/* Cabecera del Paciente */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={client.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
              alt={client.name}
              className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-primary/20"
            />
            <div className="min-w-0">
              <h1 className="font-serif text-2xl text-on-surface font-bold truncate">
                {client.name}
              </h1>
              <p className="text-xs text-on-surface-variant flex items-center gap-2 mt-0.5">
                <span className="material-symbols-outlined text-sm text-secondary">phone_iphone</span>
                <span>{client.phone}</span>
                <span>•</span>
                <span>{client.email}</span>
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary-container/10 text-primary-container">
            {client.totalVisits} visitas registradas
          </span>
        </div>

        {/* Alerta Médica si aplica */}
        {client.hasMedicalAlert && (
          <div className="bg-error-container/40 border border-error/20 p-3.5 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-lg flex-shrink-0 mt-0.5">
              warning
            </span>
            <div>
              <span className="text-xs font-bold text-on-error-container block">
                Condición Médica de Cuidado
              </span>
              <p className="text-xs text-on-surface font-semibold mt-0.5">
                {client.medicalAlertDescription}
              </p>
            </div>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-primary shadow-xs whitespace-nowrap"
          >
            Resumen General
          </button>
          <Link
            href={`/pacientes/${clientId}/podologia`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">footprint</span>
            <span>Ficha Podológica</span>
          </Link>
          <Link
            href={`/pacientes/${clientId}/masaje`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">spa</span>
            <span>Ficha Masajes</span>
          </Link>
        </div>
      </section>

      {/* Tarjetas de Acceso a Fichas Clínicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ficha Podológica Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-primary-container/30 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">footprint</span>
              </span>
              <h3 className="font-serif text-lg">Ficha Podológica</h3>
            </div>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              Mapeo anatómico podológico con marcadores visuales, protocolo para pie diabético,
              historial evolutivo de onicocriptosis/hiperqueratosis y consentimiento informado biométrico.
            </p>
          </div>
          <Link
            href={`/pacientes/${clientId}/podologia`}
            className="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold text-center hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>Abrir Ficha Podológica Completa</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {/* Ficha Masajes Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-secondary/30 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-secondary font-bold">
              <span className="w-8 h-8 rounded-full bg-secondary-container/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">spa</span>
              </span>
              <h3 className="font-serif text-lg">Ficha de Masoterapia</h3>
            </div>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              Mapa corporal interactivo de tensión (cervical, dorsal, lumbar), escala de presión
              preferida, selección de aromaterapia y registro de contraindicaciones.
            </p>
          </div>
          <Link
            href={`/pacientes/${clientId}/masaje`}
            className="w-full py-3 rounded-xl bg-secondary text-white text-xs font-bold text-center hover:bg-secondary/90 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>Abrir Ficha de Masajes Completa</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Acciones de Fidelización y Retorno WhatsApp */}
      <section className="bg-surface-container-low p-4 sm:p-5 rounded-2xl border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-serif text-base font-bold text-primary">
            Recordatorio de Retorno Podológico (Cada 6-8 semanas)
          </h4>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Última visita registrada el {client.lastVisit || 'hace 3 semanas'}. Envía un mensaje
            personalizado para agendar su próxima sesión preventiva.
          </p>
        </div>
        <a
          href={`https://wa.me/?text=Hola%20${encodeURIComponent(
            client.name
          )},%20te%20saludamos%20de%20Adranna%20Spa.%20Te%20toca%20tu%20sesión%20preventiva%20de%20podología%20para%20mantener%20la%20salud%20de%20tus%20pies.%20¿Te%20agendamos%20esta%20semana?`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 rounded-xl bg-tertiary text-white text-xs font-bold hover:bg-tertiary-container transition-all flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          <span>Enviar WhatsApp de Retorno</span>
        </a>
      </section>
    </div>
  );
}
