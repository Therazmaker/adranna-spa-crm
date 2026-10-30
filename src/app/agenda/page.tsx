'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/lib/dbService';
import { Appointment, Client, Professional } from '@/types/database';
import AppointmentBottomSheet from '@/components/AppointmentBottomSheet';
import NewAppointmentModal from '@/components/NewAppointmentModal';

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [filterProfessional, setFilterProfessional] = useState<string>('all');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  useEffect(() => {
    dbService.getAppointments().then(setAppointments);
    dbService.getClients().then(setClients);
    dbService.getProfessionals().then(setProfessionals);
  }, []);

  const filteredAppointments = appointments.filter((apt) => {
    if (filterProfessional === 'all') return true;
    return apt.professionalName.toLowerCase().includes(filterProfessional.toLowerCase());
  });

  const handleAddAppointment = (newApt: Appointment) => {
    setAppointments((prev) => [newApt, ...prev]);
  };

  const handleUpdateAppointment = (updated: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelectedAppointment(null);
    setEditingAppointment(null);
  };

  const handleStatusChange = (newStatus: Appointment['status']) => {
    if (!selectedAppointment) return;
    const updated = { ...selectedAppointment, status: newStatus };
    dbService.updateAppointment(selectedAppointment.id, { status: newStatus });
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelectedAppointment(updated);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setSelectedAppointment(null);
    setEditingAppointment(apt);
    setIsNewAppointmentOpen(true);
  };

  const handleDeleteAppointment = async (apt: Appointment) => {
    if (!confirm(`¿Eliminar la cita de ${apt.clientName}?`)) return;
    await dbService.deleteAppointment(apt.id);
    setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
    setSelectedAppointment(null);
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      {/* Header Agenda */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
            Agenda Clínica & Spa
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {appointments.length} citas registradas en total
          </p>
        </div>

        <button
          onClick={() => { setEditingAppointment(null); setIsNewAppointmentOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white shadow-sm hover:bg-primary-container active:scale-95 transition-all text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>+ Nueva Cita</span>
        </button>
      </div>

      {/* Filtro Dinámico de Profesionales */}
      {professionals.length > 0 && (
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

          {professionals.map((prof) => (
            <button
              key={prof.id}
              onClick={() => setFilterProfessional(prof.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                filterProfessional === prof.name
                  ? 'bg-primary-container text-white border-primary-container'
                  : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span>{prof.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Citas listadas */}
      <div className="mt-2 flex flex-col gap-3">
        {filteredAppointments.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 bg-surface-container-lowest rounded-3xl p-8 border border-dashed border-surface-container-high text-center">
            <span className="material-symbols-outlined text-4xl text-outline">event_busy</span>
            <div>
              <span className="text-sm font-bold text-on-surface block">No hay citas en este filtro</span>
              <span className="text-xs text-on-surface-variant block mt-0.5">
                Crea una nueva cita asignando paciente, servicio y profesional.
              </span>
            </div>
            <button
              onClick={() => { setEditingAppointment(null); setIsNewAppointmentOpen(true); }}
              className="mt-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container transition-all"
            >
              + Agendar Cita
            </button>
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const isPodo = apt.discipline === 'podologia';
            return (
              <div key={apt.id} className="flex gap-3 items-start">
                <div className="w-14 flex-shrink-0 text-right pt-2">
                  <span className="text-sm font-bold text-on-surface font-serif block">
                    {apt.time}
                  </span>
                  <span className="text-[10px] text-outline font-semibold">
                    {apt.date?.slice(5) || ''}
                  </span>
                </div>

                <div
                  onClick={() => setSelectedAppointment(apt)}
                  className="flex-1 bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 cursor-pointer transition-all hover:shadow-md relative overflow-hidden"
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
                            badge
                          </span>
                          {apt.professionalName}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-secondary">
                            door_front
                          </span>
                          {apt.cabinName}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold">
                        {apt.status === 'en_curso' ? 'En Curso' : apt.status === 'completado' ? 'Completada' : 'Confirmada'}
                      </span>
                      <span className="text-xs font-bold text-primary mt-2">
                        S/ {apt.price}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Sheet Appointment Detail */}
      <AppointmentBottomSheet
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onStatusChange={handleStatusChange}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
      />

      {/* Modal Nueva / Editar Cita */}
      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => { setIsNewAppointmentOpen(false); setEditingAppointment(null); }}
        clients={clients}
        onAddAppointment={handleAddAppointment}
        onUpdateAppointment={handleUpdateAppointment}
        editingAppointment={editingAppointment}
      />
    </div>
  );
}
