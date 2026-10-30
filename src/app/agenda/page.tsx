'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/lib/dbService';
import { Appointment, Client } from '@/types/database';
import AppointmentBottomSheet from '@/components/AppointmentBottomSheet';
import NewAppointmentModal from '@/components/NewAppointmentModal';

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDay, setSelectedDay] = useState(24);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [filterProfessional, setFilterProfessional] = useState<string>('all');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  useEffect(() => {
    dbService.getAppointments().then(setAppointments);
    dbService.getClients().then(setClients);
  }, []);

  const days = [
    { dayNumber: 21, dayLabel: 'LUN', hasPodology: true },
    { dayNumber: 22, dayLabel: 'MAR', hasPodology: true },
    { dayNumber: 23, dayLabel: 'MIÉ', hasPodology: false },
    { dayNumber: 24, dayLabel: 'JUE', hasPodology: true },
    { dayNumber: 25, dayLabel: 'VIE', hasPodology: true },
    { dayNumber: 26, dayLabel: 'SÁB', hasPodology: false },
  ];

  const filteredAppointments = appointments.filter((apt) => {
    if (filterProfessional === 'all') return true;
    return apt.professionalName.includes(filterProfessional);
  });

  const handleAddAppointment = async (newApt: Appointment) => {
    await dbService.createAppointment(newApt);
    setAppointments((prev) => [newApt, ...prev]);
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      {/* Header Agenda */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
              Agenda Clínica & Spa
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">
              Octubre 2024
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {appointments.length} citas registradas • 3 cabinas activas
          </p>
        </div>

        <button
          onClick={() => setIsNewAppointmentOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white shadow-sm hover:bg-primary-container active:scale-95 transition-all text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>+ Nueva Cita</span>
        </button>
      </div>

      {/* Switch Día / Semana & Navegador */}
      <div className="flex items-center justify-between bg-surface-container p-1 rounded-2xl border border-surface-container-high/60">
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'day'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Día
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'week'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Semana
          </button>
        </div>

        <div className="flex items-center gap-1 text-on-surface-variant px-2">
          <button
            type="button"
            className="p-1 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="text-xs text-on-surface font-bold">Jueves, 24 Oct</span>
          <button
            type="button"
            className="p-1 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Carrusel de Días de la Semana */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-gutter-mobile px-gutter-mobile">
        {days.map((d) => {
          const isSelected = d.dayNumber === selectedDay;
          return (
            <button
              key={d.dayNumber}
              onClick={() => setSelectedDay(d.dayNumber)}
              className={`flex flex-col items-center justify-center min-w-[56px] py-2.5 rounded-2xl transition-all flex-shrink-0 border ${
                isSelected
                  ? 'bg-primary text-white shadow-md border-primary scale-105'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border-surface-container-high/60'
              }`}
            >
              <span className={`text-[10px] font-bold ${isSelected ? 'text-primary-fixed' : 'text-outline'}`}>
                {d.dayLabel}
              </span>
              <span className="font-serif text-lg font-bold mt-0.5">{d.dayNumber}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1 ${
                  isSelected
                    ? 'bg-secondary-fixed'
                    : d.hasPodology
                    ? 'bg-primary-container'
                    : 'bg-secondary'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Filtro de Profesionales */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-gutter-mobile px-gutter-mobile">
        <button
          onClick={() => setFilterProfessional('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-xs transition-all border ${
            filterProfessional === 'all'
              ? 'bg-primary-container text-white border-primary-container'
              : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">groups</span>
          <span>Todos ({appointments.length})</span>
        </button>

        <button
          onClick={() => setFilterProfessional('Elena')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
            filterProfessional === 'Elena'
              ? 'bg-primary-container text-white border-primary-container'
              : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-primary-container" />
          <span>Dra. Elena V. • Podología</span>
        </button>

        <button
          onClick={() => setFilterProfessional('Claudia')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
            filterProfessional === 'Claudia'
              ? 'bg-secondary text-white border-secondary'
              : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span>Lic. Claudia N. • Masoterapia</span>
        </button>
      </div>

      {/* Cronograma Horario de Cabinas */}
      <div className="mt-2 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs uppercase tracking-wider text-outline font-bold">
            Horario en Tiempo Real • Cabinas 1, 2 y 3
          </span>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-container" />
              <span className="text-on-surface-variant">Podología</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-on-surface-variant">Masajes</span>
            </div>
          </div>
        </div>

        {/* Citas listadas por hora */}
        {filteredAppointments.map((apt) => {
          const isPodo = apt.discipline === 'podologia';
          return (
            <div key={apt.id} className="flex gap-3 items-start">
              <div className="w-14 flex-shrink-0 text-right pt-2">
                <span className="text-sm font-bold text-on-surface font-serif block">
                  {apt.time}
                </span>
                <span className="text-[10px] text-outline font-semibold">AM</span>
              </div>

              <div
                onClick={() => setSelectedAppointment(apt)}
                className={`flex-1 bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 cursor-pointer transition-all hover:shadow-md relative overflow-hidden ${
                  apt.hasMedicalAlert
                    ? 'ring-2 ring-primary-container/20 bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-primary-fixed/20'
                    : ''
                }`}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isPodo ? 'bg-primary-container' : 'bg-secondary'
                  }`}
                />
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isPodo
                            ? 'bg-primary-container/10 text-primary-container'
                            : 'bg-secondary-container/50 text-secondary'
                        }`}
                      >
                        {apt.serviceName}
                      </span>
                      <span className="text-xs text-outline">{apt.durationMinutes} min</span>
                    </div>

                    <h3 className="font-serif text-base text-on-surface font-bold mt-1.5 flex items-center gap-1.5">
                      {apt.clientName}
                      {apt.hasMedicalAlert && (
                        <span
                          className="material-symbols-outlined text-[16px] text-error"
                          title="Tiene alerta médica"
                        >
                          warning
                        </span>
                      )}
                    </h3>

                    <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">
                          stethoscope
                        </span>
                        {apt.professionalName}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-secondary">
                          meeting_room
                        </span>
                        {apt.cabinName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold">
                      {apt.status === 'en_curso' ? 'En Sesión' : 'Confirmada'}
                    </span>
                    <span className="text-xs font-bold text-primary mt-2">
                      S/ {apt.price}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet Appointment Detail */}
      <AppointmentBottomSheet
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
      />

      {/* Modal Nueva Cita */}
      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        clients={clients}
        onAddAppointment={handleAddAppointment}
      />
    </div>
  );
}
