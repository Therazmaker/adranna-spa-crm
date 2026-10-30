'use client';

import React from 'react';
import Link from 'next/link';
import { Appointment } from '@/types/database';

interface AppointmentBottomSheetProps {
  appointment: Appointment | null;
  onClose: () => void;
  onStatusChange?: (status: Appointment['status']) => void;
}

export default function AppointmentBottomSheet({
  appointment,
  onClose,
  onStatusChange,
}: AppointmentBottomSheetProps) {
  if (!appointment) return null;

  const isPodology = appointment.discipline === 'podologia';

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 max-w-7xl mx-auto px-gutter-mobile transition-all duration-300">
      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_-8px_32px_rgba(0,52,65,0.22)] p-5 relative overflow-hidden border border-surface-container-high">
        {/* Top Handle */}
        <div
          onClick={onClose}
          className="w-12 h-1.5 rounded-full bg-outline-variant/60 mx-auto mb-3.5 cursor-pointer hover:bg-outline"
        ></div>

        {/* Header & Patient Details */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
                  isPodology ? 'bg-primary-container' : 'bg-secondary'
                }`}
              >
                {isPodology ? 'Podología Clínica' : 'Terapia Corporal'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold">
                {appointment.time} ({appointment.durationMinutes} min)
              </span>
            </div>
            <h2 className="font-serif text-2xl text-primary font-bold mt-1 tracking-tight">
              {appointment.clientName}
            </h2>
            <p className="text-sm text-on-surface-variant font-medium">
              {appointment.serviceName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Quick Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">medical_information</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-outline font-medium">Profesional</span>
              <span className="text-xs font-bold text-on-surface truncate block">
                {appointment.professionalName}
              </span>
              <span className="text-[10px] text-primary font-semibold">
                {appointment.professionalRole}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-secondary flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">door_front</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-outline font-medium">Ubicación</span>
              <span className="text-xs font-bold text-on-surface truncate block">
                {appointment.cabinName}
              </span>
              <span className="text-[10px] text-secondary font-semibold">Esterilizada</span>
            </div>
          </div>
        </div>

        {/* Cost & Billing */}
        <div className="mt-2.5 p-3 rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container-high/60">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[22px] text-tertiary-container">
              payments
            </span>
            <div>
              <span className="text-sm font-bold text-on-surface">
                S/ {appointment.price} PEN
              </span>
              <span className="text-[11px] text-outline block">Tarifa de sesión confirmada</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            {appointment.status === 'completado' ? 'Liquidado' : 'Confirmado'}
          </span>
        </div>

        {/* Medical Alerts Banner */}
        {appointment.hasMedicalAlert && (
          <div className="mt-2.5 p-3 rounded-xl bg-error-container/40 flex items-start gap-2.5 border border-error/20">
            <span className="material-symbols-outlined text-[20px] text-error flex-shrink-0 mt-0.5">
              warning
            </span>
            <div className="flex-1">
              <span className="text-xs font-bold text-on-error-container block">
                Alertas Clínicas Críticas
              </span>
              <p className="text-xs text-error font-medium mt-0.5">
                {appointment.medicalAlertText || 'Condición de riesgo registrada en ficha'}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/pacientes/${appointment.clientId}/${isPodology ? 'podologia' : 'masaje'}`}
            className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">clinical_notes</span>
            <span>Abrir Ficha Clínica Especializada</span>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=Hola%20${encodeURIComponent(
                appointment.clientName
              )},%20te%20recordamos%20tu%20cita%20en%20Adranna%20Spa%20para%20el%20día%20${
                appointment.date
              }%20a%20las%20${appointment.time}.`}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-variant transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">chat</span>
              <span>WhatsApp Cita</span>
            </a>

            <button
              type="button"
              onClick={() => {
                if (onStatusChange) {
                  onStatusChange(appointment.status === 'en_curso' ? 'completado' : 'en_curso');
                }
              }}
              className="py-2.5 rounded-xl bg-surface-container-high text-primary text-xs font-bold hover:bg-surface-variant transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">
                {appointment.status === 'en_curso' ? 'done_all' : 'play_circle'}
              </span>
              <span>
                {appointment.status === 'en_curso' ? 'Finalizar Sesión' : 'Iniciar Sesión'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
