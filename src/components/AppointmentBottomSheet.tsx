'use client';

import React from 'react';
import Link from 'next/link';
import { Appointment } from '@/types/database';
import { BLOCK_COLOR_PALETTE } from '@/components/NewAppointmentModal';

interface AppointmentBottomSheetProps {
  appointment: Appointment | null;
  onClose: () => void;
  onStatusChange?: (status: Appointment['status']) => void;
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  onColorChange?: (appointment: Appointment, color: string) => void;
}

export default function AppointmentBottomSheet({
  appointment,
  onClose,
  onStatusChange,
  onEdit,
  onDelete,
  onColorChange,
}: AppointmentBottomSheetProps) {
  if (!appointment) return null;

  const isPodology = appointment.discipline === 'podologia';
  const soldProducts = appointment.soldProducts || [];

  const statusConfig: Record<Appointment['status'], { label: string; color: string }> = {
    confirmado: { label: 'Confirmado', color: 'bg-tertiary-fixed text-on-tertiary-fixed' },
    en_curso:   { label: 'En Curso',   color: 'bg-primary-container/20 text-primary-container' },
    completado: { label: 'Completado', color: 'bg-tertiary-container/30 text-tertiary' },
    cancelado:  { label: 'Cancelado',  color: 'bg-error-container/40 text-error' },
  };

  const currentStatus = statusConfig[appointment.status] ?? statusConfig.confirmado;

  return (
    <div className="fixed inset-x-0 bottom-16 z-[80] max-w-7xl mx-auto px-gutter-mobile">
      {/* Backdrop tap to close */}
      <div className="fixed inset-0 bg-transparent z-[-1]" onClick={onClose} />

      <div className="bg-surface-container-lowest rounded-3xl shadow-[0_-8px_32px_rgba(0,52,65,0.22)] p-5 relative overflow-hidden border border-surface-container-high max-h-[82vh] overflow-y-auto">
        {/* Handle */}
        <div
          onClick={onClose}
          className="w-12 h-1.5 rounded-full bg-outline-variant/60 mx-auto mb-3.5 cursor-pointer hover:bg-outline"
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={appointment.blockColor ? { backgroundColor: appointment.blockColor } : undefined}
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
                  !appointment.blockColor ? (isPodology ? 'bg-primary-container' : 'bg-secondary') : ''
                }`}
              >
                {isPodology ? 'Podología Clínica' : 'Terapia Corporal'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
            </div>
            <Link
              href={`/pacientes/${appointment.clientId}`}
              className="font-serif text-2xl text-primary hover:underline font-bold mt-1 tracking-tight truncate block"
            >
              {appointment.clientName}
            </Link>
            <p className="text-sm text-on-surface-variant font-medium">{appointment.serviceName}</p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Edit */}
            {onEdit && (
              <button
                onClick={() => onEdit(appointment)}
                aria-label="Editar cita"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-container/10 text-primary hover:bg-primary-container/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            )}
            {/* Delete */}
            {onDelete && (
              <button
                onClick={() => onDelete(appointment)}
                aria-label="Eliminar cita"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-error-container/20 text-error hover:bg-error-container/40 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            )}
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">medical_information</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-outline font-medium">Profesional</span>
              <span className="text-xs font-bold text-on-surface truncate block">{appointment.professionalName}</span>
              <span className="text-[10px] text-primary font-semibold">{appointment.professionalRole}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-secondary flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-outline font-medium">Fecha / Hora</span>
              <span className="text-xs font-bold text-on-surface block">
                {appointment.date || 'Hoy'} · {appointment.time}
              </span>
              <span className="text-[10px] text-secondary font-semibold">
                {appointment.durationMinutes} min · {appointment.cabinName}
              </span>
            </div>
          </div>
        </div>

        {/* Motivo / Notas si existen */}
        {appointment.notes && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 text-xs">
            <span className="text-[10px] uppercase tracking-wider font-bold text-outline block">
              Motivo / Observaciones
            </span>
            <p className="text-on-surface font-medium mt-0.5">{appointment.notes}</p>
          </div>
        )}

        {/* Selector rápido de color del bloque */}
        {onColorChange && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-primary">palette</span>
              <span>Color del bloque:</span>
            </span>
            <div className="flex items-center gap-1.5">
              {BLOCK_COLOR_PALETTE.map((col) => {
                const active = (appointment.blockColor || BLOCK_COLOR_PALETTE[0].id) === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => onColorChange(appointment, col.id)}
                    title={col.label}
                    style={{ backgroundColor: col.id }}
                    className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center text-white ${
                      active ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {active && <span className="material-symbols-outlined text-[12px]">check</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Precio + Productos Vendidos */}
        <div className="mt-2.5 p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[22px] text-tertiary-container">payments</span>
              <div>
                <span className="text-sm font-bold text-on-surface">Total: S/ {appointment.price} PEN</span>
                <span className="text-[11px] text-outline block">
                  {soldProducts.length > 0
                    ? `Servicio S/ ${appointment.servicePrice ?? appointment.price - (appointment.productsTotal || 0)} + Productos S/ ${appointment.productsTotal || 0}`
                    : 'Tarifa de sesión'}
                </span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
          </div>

          {soldProducts.length > 0 && (
            <div className="pt-2 border-t border-surface-container-high/60 flex flex-wrap gap-1.5">
              {soldProducts.map((p, i) => (
                <span
                  key={`${p.productId}-${i}`}
                  className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-900"
                >
                  {p.quantity}x {p.name} ({p.presentation}) · S/ {p.subtotal ?? p.unitPrice * p.quantity}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Alerta médica */}
        {appointment.hasMedicalAlert && (
          <div className="mt-2.5 p-3 rounded-xl bg-error-container/40 flex items-start gap-2.5 border border-error/20">
            <span className="material-symbols-outlined text-[20px] text-error flex-shrink-0 mt-0.5">warning</span>
            <div>
              <span className="text-xs font-bold text-on-error-container block">Alertas Clínicas Críticas</span>
              <p className="text-xs text-error font-medium mt-0.5">
                {appointment.medicalAlertText || 'Condición de riesgo registrada en ficha'}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href={`/pacientes/${appointment.clientId}`}
              className="w-full py-3 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              <span>Perfil & Visitas</span>
            </Link>

            <Link
              href={`/pacientes/${appointment.clientId}/${isPodology ? 'podologia' : 'masaje'}`}
              className="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">clinical_notes</span>
              <span>Ficha Clínica</span>
            </Link>

            {appointment.status !== 'completado' ? (
              <button
                type="button"
                onClick={() => onStatusChange?.('completado')}
                className="w-full py-3 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-md hover:bg-emerald-800 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                <span>Finalizar Sesión</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStatusChange?.('confirmado')}
                className="w-full py-3 rounded-xl bg-surface-container-high text-primary text-xs font-bold hover:bg-surface-variant transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span>Reabrir Cita</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/${(appointment.clientPhone || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(appointment.clientName)},%20te%20recordamos%20tu%20cita%20en%20Adranna%20Spa%20el%20${appointment.date}%20a%20las%20${appointment.time}.`}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-variant transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">chat</span>
              WhatsApp
            </a>

            {appointment.status === 'confirmado' ? (
              <button
                type="button"
                onClick={() => onStatusChange?.('en_curso')}
                className="py-2.5 rounded-xl bg-surface-container-high text-primary text-xs font-bold hover:bg-surface-variant transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                Marcar En Curso
              </button>
            ) : appointment.status === 'en_curso' ? (
              <button
                type="button"
                onClick={() => onStatusChange?.('confirmado')}
                className="py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-bold hover:bg-surface-variant transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                Volver a Confirmada
              </button>
            ) : (
              <span className="py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Sesión Finalizada
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
