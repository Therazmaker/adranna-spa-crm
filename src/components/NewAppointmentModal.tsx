'use client';

import React, { useState } from 'react';
import { Appointment, Client } from '@/types/database';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onAddAppointment: (appointment: Appointment) => void;
}

export default function NewAppointmentModal({
  isOpen,
  onClose,
  clients,
  onAddAppointment,
}: NewAppointmentModalProps) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [discipline, setDiscipline] = useState<'podologia' | 'masaje'>('podologia');
  const [serviceName, setServiceName] = useState('Quiropodia Integral Clínica');
  const [time, setTime] = useState('14:00');
  const [date, setDate] = useState('2024-10-24');
  const [cabin, setCabin] = useState('Cabina 1 (Podología)');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === selectedClientId) || clients[0];

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      professionalName: discipline === 'podologia' ? 'Dra. Elena Valdés' : 'Lic. Claudia Nájera',
      professionalRole: discipline === 'podologia' ? 'Podóloga Titular' : 'Terapeuta Spa',
      discipline,
      cabinId: 'cab-1',
      cabinName: cabin,
      serviceName,
      durationMinutes: 45,
      price: discipline === 'podologia' ? 850 : 950,
      status: 'confirmado',
      date,
      time,
      hasMedicalAlert: client.hasMedicalAlert,
      medicalAlertText: client.medicalAlertDescription,
      hasPendingConsent: client.hasMedicalAlert,
    };

    onAddAppointment(newApt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
            </span>
            <h3 className="font-serif text-xl font-bold text-primary">
              Agendar en 3 Toques
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Cliente */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-secondary block">
              1. Selecciona Paciente / Cliente
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.hasMedicalAlert ? '⚠️ (Alerta Médica)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Disciplina & Servicio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-secondary block">
              2. Disciplina & Cabina
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDiscipline('podologia');
                  setServiceName('Quiropodia Integral Clínica');
                  setCabin('Cabina 1 (Podología)');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  discipline === 'podologia'
                    ? 'bg-primary-container text-white border-primary-container shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">footprint</span>
                Podología Clínica
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscipline('masaje');
                  setServiceName('Masaje Descontracturante');
                  setCabin('Cabina 2 (Spa / Aromaterapia)');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  discipline === 'masaje'
                    ? 'bg-secondary text-white border-secondary shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">spa</span>
                Terapias de Masaje
              </button>
            </div>
          </div>

          {/* Servicio selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant block">
              Tratamiento Específico
            </label>
            <select
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {discipline === 'podologia' ? (
                <>
                  <option value="Quiropodia Integral Clínica">Quiropodia Integral Clínica (45 min)</option>
                  <option value="Onicocriptosis Láser + Reconstrucción">Onicocriptosis Láser + Reconstrucción (50 min)</option>
                  <option value="Tratamiento de Helomas & Hiperqueratosis">Tratamiento de Helomas & Hiperqueratosis (40 min)</option>
                  <option value="Valoración Preventiva Pie Diabético">Valoración Preventiva Pie Diabético (45 min)</option>
                </>
              ) : (
                <>
                  <option value="Masaje Descontracturante Tejido Profundo">Masaje Descontracturante Tejido Profundo (60 min)</option>
                  <option value="Ritual Spa de Relajación & Aromaterapia">Ritual Spa de Relajación & Aromaterapia (50 min)</option>
                  <option value="Drenaje Linfático Manual">Drenaje Linfático Manual (50 min)</option>
                </>
              )}
            </select>
          </div>

          {/* 3. Horario */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-secondary block">
              3. Fecha y Hora en Cabina
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Confirmar Cita & Bloquear Cabina
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
