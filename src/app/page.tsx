'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dbService } from '@/lib/dbService';
import { Appointment, Client, Professional, ServicePackage } from '@/types/database';
import AppointmentBottomSheet from '@/components/AppointmentBottomSheet';
import NewAppointmentModal from '@/components/NewAppointmentModal';
import FinalizeSessionModal from '@/components/FinalizeSessionModal';
import { formatTime12 } from '@/lib/timeUtils';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Equipo Adranna';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [finalizingAppointment, setFinalizingAppointment] = useState<Appointment | null>(null);
  const [filterDiscipline, setFilterDiscipline] = useState<'all' | 'podologia' | 'masaje'>('all');
  const [statusTab, setStatusTab] = useState<'activas' | 'finalizadas'>('activas');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [deletingAptId, setDeletingAptId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      dbService.getAppointments(),
      dbService.getClients(),
      dbService.getProfessionals(),
      dbService.getServices(),
    ]).then(([apts, cls, profs, srvs]) => {
      if (mounted) {
        setAppointments(apts);
        setClients(cls);
        setProfessionals(profs);
        setServices(srvs);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayApts = appointments.filter((a) => a.date === todayStr || !a.date);

  const byDiscipline = appointments.filter((apt) => {
    if (filterDiscipline === 'all') return true;
    return apt.discipline === filterDiscipline;
  });

  const activeAppointments = byDiscipline.filter(
    (apt) => apt.status !== 'completado' && apt.status !== 'cancelado'
  );
  const completedAppointments = byDiscipline.filter(
    (apt) => apt.status === 'completado' || apt.status === 'cancelado'
  );
  const filteredAppointments =
    statusTab === 'activas' ? activeAppointments : completedAppointments;

  const todayRevenue = todayApts.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const podoCount = todayApts.filter((a) => a.discipline === 'podologia').length;
  const masajeCount = todayApts.filter((a) => a.discipline === 'masaje').length;

  const handleAddAppointment = (newApt: Appointment) => {
    setAppointments((prev) => [newApt, ...prev]);
    setStatusTab('activas');
  };

  const handleUpdateAppointment = (updated: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelectedAppointment(null);
    setEditingAppointment(null);
  };

  const applyStatusChange = (apt: Appointment, newStatus: Appointment['status']) => {
    if (newStatus === 'completado') {
      setSelectedAppointment(null);
      setFinalizingAppointment(apt);
      return;
    }

    const updated = { ...apt, status: newStatus };
    dbService.updateAppointment(apt.id, { status: newStatus });
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

    if (apt.status === 'completado' && newStatus === 'confirmado') {
      setSelectedAppointment(null);
    } else if (selectedAppointment?.id === apt.id) {
      setSelectedAppointment(updated);
    }
  };

  const handleStatusChange = (newStatus: Appointment['status']) => {
    if (!selectedAppointment) return;
    applyStatusChange(selectedAppointment, newStatus);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setSelectedAppointment(null);
    setEditingAppointment(apt);
    setIsNewAppointmentOpen(true);
  };

  const handleDeleteAppointment = async (apt: Appointment) => {
    if (deletingAptId === apt.id) return;
    if (!confirm(`¿Eliminar la cita de ${apt.clientName}?`)) return;
    setDeletingAptId(apt.id);
    await dbService.deleteAppointment(apt.id);
    setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
    setSelectedAppointment(null);
    setDeletingAptId(null);
  };

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="flex flex-col w-full gap-space-md pb-8">
      {/* Saludo Personalizado */}
      <section className="flex flex-col gap-1.5 px-0.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant shadow-xs border border-surface-container-highest">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              spa
            </span>
            <span className="text-xs font-semibold tracking-wide">
              Adranna Spa & Clínica
            </span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant text-xs font-medium">
            <span className="material-symbols-outlined text-[16px] text-tertiary">
              calendar_month
            </span>
            <span>{todayCapitalized}</span>
          </div>
        </div>

        <div className="mt-1 flex flex-col">
          <span className="text-xs text-secondary uppercase tracking-widest font-bold font-sans">
            Panel de Control
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-primary font-bold tracking-tight">
            {isLoading ? 'Cargando...' : `Hola, ${displayName}`}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            {isLoading
              ? 'Conectando con Supabase...'
              : `${appointments.length} citas en total · ${clients.length} pacientes registrados · ${professionals.length} especialistas en el equipo`}
          </p>
        </div>
      </section>

      {/* Banner de Consentimientos Pendientes si los hay */}
      {appointments.some((a) => a.hasPendingConsent) && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary-container/40 text-on-secondary-container shadow-xs border border-secondary/20 transition-all">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shadow-xs">
            <span className="material-symbols-outlined text-[20px]">draw</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs sm:text-sm font-bold text-secondary">
                Consentimiento Digital Pendiente
              </p>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-white text-[10px] font-bold">
                {appointments.filter((a) => a.hasPendingConsent).length} firma(s) requeridas
              </span>
            </div>
            <p className="text-xs text-on-secondary-container/90 mt-0.5">
              {appointments.filter((a) => a.hasPendingConsent).map((a) => a.clientName).join(', ')} — firma pendiente antes de iniciar procedimiento.
            </p>
          </div>
        </div>
      )}

      {/* Acciones Rápidas */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => { setEditingAppointment(null); setIsNewAppointmentOpen(true); }}
          className="flex items-center justify-center gap-2 h-12 px-3 rounded-xl bg-primary text-white shadow-sm active:scale-[0.98] transition-transform font-bold text-xs hover:bg-primary-container"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>+ Nueva Cita</span>
        </button>

        <Link
          href="/clientes"
          className="flex items-center justify-center gap-2 h-12 px-3 rounded-xl bg-surface-container-lowest text-secondary shadow-sm active:scale-[0.98] transition-transform hover:bg-surface-container-low font-bold text-xs border border-secondary/20"
        >
          <span className="material-symbols-outlined text-[18px]">group</span>
          <span>Pacientes</span>
        </Link>

        <Link
          href="/servicios"
          className="flex items-center justify-center gap-2 h-12 px-3 rounded-xl bg-surface-container-lowest text-primary shadow-sm active:scale-[0.98] transition-transform hover:bg-surface-container-low font-bold text-xs border border-primary/20"
        >
          <span className="material-symbols-outlined text-[18px]">medical_services</span>
          <span>Tratamientos</span>
        </Link>

        <Link
          href="/equipo"
          className="flex items-center justify-center gap-2 h-12 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-bold text-xs shadow-sm active:scale-[0.98] transition-transform hover:bg-surface-container-low border border-surface-container-high"
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>Equipo ({professionals.length})</span>
        </Link>
      </section>

      {/* Métricas Reales Clave */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Citas Hoy */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Citas de Hoy</span>
            <div className="w-7 h-7 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[16px]">event_available</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl font-bold text-primary">{todayApts.length}</span>
            <span className="text-xs text-on-surface-variant ml-1 font-medium">sesiones</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="px-1.5 py-0.5 rounded bg-primary-container/10 text-primary-container">
              {podoCount} Podo
            </span>
            <span className="px-1.5 py-0.5 rounded bg-secondary-container/50 text-secondary">
              {masajeCount} Masaje
            </span>
          </div>
        </div>

        {/* Ingresos Estimados Hoy */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Ingresos Hoy</span>
            <div className="w-7 h-7 rounded-full bg-tertiary-container/15 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[16px]">payments</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl font-bold text-primary">S/ {todayRevenue}</span>
            <span className="text-[11px] text-outline block font-medium">PEN agendados</span>
          </div>
          <span className="text-[11px] text-outline">
            {todayApts.filter((a) => a.status === 'completado').length} liquidadas
          </span>
        </div>

        {/* Total Pacientes */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Pacientes</span>
            <div className="w-7 h-7 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[16px]">group</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl font-bold text-secondary">{clients.length}</span>
            <span className="text-xs text-on-surface-variant ml-1 font-medium">registrados</span>
          </div>
          <Link href="/clientes" className="text-xs text-primary font-bold hover:underline">
            Ver directorio →
          </Link>
        </div>

        {/* Especialistas Activos */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Equipo Clínico</span>
            <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px]">badge</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl font-bold text-primary">{professionals.length}</span>
            <span className="text-xs text-on-surface-variant ml-1 font-medium">profesionales</span>
          </div>
          <Link href="/equipo" className="text-xs text-primary font-bold hover:underline">
            Gestionar equipo →
          </Link>
        </div>
      </section>

      {/* Cronograma de Citas */}
      <section className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="font-serif text-xl text-primary font-bold">Citas & Agenda</h2>
            <span className="text-xs text-on-surface-variant">
              {isLoading
                ? 'Cargando citas...'
                : `${activeAppointments.length} por atender · ${completedAppointments.length} finalizadas`}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterDiscipline('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterDiscipline === 'all'
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterDiscipline('podologia')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterDiscipline === 'podologia'
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Podología
            </button>
            <button
              onClick={() => setFilterDiscipline('masaje')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterDiscipline === 'masaje'
                  ? 'bg-surface-container-lowest text-secondary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Masajes
            </button>
          </div>
        </div>

        {/* Pestañas: Por Atender vs Finalizadas */}
        <div className="grid grid-cols-2 bg-surface-container p-1 rounded-2xl border border-surface-container-high text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusTab('activas')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              statusTab === 'activas'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
            <span>Por Atender</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                statusTab === 'activas'
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {activeAppointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('finalizadas')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              statusTab === 'finalizadas'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            <span>Finalizadas</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                statusTab === 'finalizadas'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {completedAppointments.length}
            </span>
          </button>
        </div>

        {/* Lista de Citas */}
        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-2xl animate-spin text-primary">sync</span>
            <span className="text-xs font-medium">Cargando agenda desde Supabase...</span>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 bg-surface-container-lowest rounded-3xl p-8 border border-dashed border-surface-container-high text-center">
            <span className="material-symbols-outlined text-4xl text-outline">
              {statusTab === 'activas' ? 'event_available' : 'history'}
            </span>
            <div>
              <span className="text-sm font-bold text-on-surface block">
                {statusTab === 'activas'
                  ? 'No hay citas pendientes por atender'
                  : 'Aún no hay sesiones finalizadas'}
              </span>
              <span className="text-xs text-on-surface-variant block mt-0.5">
                {statusTab === 'activas'
                  ? 'Agenda una nueva cita con los tratamientos y profesionales de tu clínica.'
                  : 'Las citas que marques como finalizadas aparecerán aquí como historial.'}
              </span>
            </div>
            {statusTab === 'activas' && (
              <button
                onClick={() => { setEditingAppointment(null); setIsNewAppointmentOpen(true); }}
                className="mt-1 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>+ Agendar Cita</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredAppointments.map((apt) => {
              const isPodo = apt.discipline === 'podologia';
              const isCompleted = apt.status === 'completado';
              return (
                <article
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className="relative flex overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div
                    className={`w-2 flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600'
                        : isPodo
                        ? 'bg-primary-container'
                        : 'bg-secondary'
                    }`}
                  />
                  <div className="flex-1 p-3.5 flex flex-col gap-2 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isPodo
                                ? 'bg-primary-container/10 text-primary-container'
                                : 'bg-secondary-container/40 text-secondary'
                            }`}
                          >
                            {isPodo ? 'Podología' : 'Masajes / Spa'}
                          </span>

                          <span className="text-xs text-outline font-medium">
                            {apt.date || 'Hoy'}
                          </span>

                          {apt.status === 'en_curso' && (
                            <span className="px-1.5 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary text-[10px] font-bold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px] animate-spin">
                                sync
                              </span>{' '}
                              En curso
                            </span>
                          )}

                          {isCompleted && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">check</span>
                              Finalizada
                            </span>
                          )}

                          {apt.hasMedicalAlert && (
                            <span className="px-1.5 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              Alerta Médica
                            </span>
                          )}
                        </div>

                        <h3 className="font-serif text-base text-on-surface font-bold mt-1 truncate">
                          {apt.clientName}
                        </h3>
                        <p className="text-xs text-on-surface-variant truncate">
                          {apt.serviceName}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`font-serif text-base font-bold block whitespace-nowrap ${
                            isPodo ? 'text-primary' : 'text-secondary'
                          }`}
                        >
                          {formatTime12(apt.time)}
                        </span>
                        <span className="text-[11px] text-outline font-medium">
                          {apt.durationMinutes} min
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/40 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="material-symbols-outlined text-[15px] text-primary">
                          badge
                        </span>
                        <span className="truncate">
                          {apt.professionalName} • {apt.cabinName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-serif font-bold text-primary">
                          S/ {apt.price} PEN
                        </span>
                        {!isCompleted ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              applyStatusChange(apt, 'completado');
                            }}
                            title="Marcar sesión como finalizada"
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 active:scale-95 transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[13px]">check</span>
                            <span>Finalizar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              applyStatusChange(apt, 'confirmado');
                            }}
                            title="Devolver a citas por atender"
                            className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface-variant text-[10px] font-bold hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">replay</span>
                            <span>Reabrir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Detalle de Cita (Bottom Sheet) */}
      <AppointmentBottomSheet
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onStatusChange={handleStatusChange}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
      />

      {/* Modal Finalizar Sesión + Venta de Productos */}
      <FinalizeSessionModal
        appointment={finalizingAppointment}
        onClose={() => setFinalizingAppointment(null)}
        onFinalized={(updatedApt) => {
          setAppointments((prev) =>
            prev.map((a) => (a.id === updatedApt.id ? updatedApt : a))
          );
          setFinalizingAppointment(null);
          setSelectedAppointment(null);
        }}
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
