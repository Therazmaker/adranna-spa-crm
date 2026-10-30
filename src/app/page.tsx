'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dbService } from '@/lib/dbService';
import { Appointment, Client } from '@/types/database';
import AppointmentBottomSheet from '@/components/AppointmentBottomSheet';
import NewAppointmentModal from '@/components/NewAppointmentModal';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email || 'Profesional';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filterDiscipline, setFilterDiscipline] = useState<'all' | 'podologia' | 'masaje'>('all');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([dbService.getAppointments(), dbService.getClients()]).then(
      ([apts, cls]) => {
        if (mounted) {
          setAppointments(apts);
          setClients(cls);
          setIsLoading(false);
        }
      }
    );
    return () => { mounted = false; };
  }, []);

  const filteredAppointments = appointments.filter((apt) => {
    if (filterDiscipline === 'all') return true;
    return apt.discipline === filterDiscipline;
  });

  const handleAddAppointment = (newApt: Appointment) => {
    setAppointments([newApt, ...appointments]);
  };

  const handleStatusChange = (newStatus: Appointment['status']) => {
    if (!selectedAppointment) return;
    setAppointments(
      appointments.map((a) =>
        a.id === selectedAppointment.id ? { ...a, status: newStatus } : a
      )
    );
    setSelectedAppointment({ ...selectedAppointment, status: newStatus });
  };

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  const todayApts = appointments.filter((a) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return a.date === todayStr || !a.date; // incluye mock sin fecha
  });
  const podoCount = todayApts.filter((a) => a.discipline === 'podologia').length;
  const masajeCount = todayApts.filter((a) => a.discipline === 'masaje').length;

  return (
    <div className="flex flex-col w-full gap-space-md pb-8">
      {/* Saludo Personalizado & Contexto de Clínica */}
      <section className="flex flex-col gap-1.5 px-0.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant shadow-xs border border-surface-container-highest">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              location_on
            </span>
            <span className="text-xs font-semibold tracking-wide">
              Sucursal Polanco / Principal
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
            Panel Clínico &amp; Bienestar
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-primary font-bold tracking-tight">
            {isLoading ? 'Cargando...' : `Bienvenida, ${displayName}`}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            {isLoading
              ? 'Conectando con Supabase...'
              : `${appointments.length} citas programadas · ${clients.length} pacientes registrados`}
          </p>
        </div>
      </section>

      {/* Banner de Consentimiento Clínico Pendiente */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary-container/40 text-on-secondary-container shadow-xs border border-secondary/20 transition-all hover:bg-secondary-container/50">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shadow-xs">
          <span className="material-symbols-outlined text-[20px]">draw</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs sm:text-sm font-bold text-secondary">
              Consentimiento Digital Pendiente
            </p>
            <span className="px-2 py-0.5 rounded-full bg-secondary text-white text-[10px] font-bold">
              2 firmas requeridas
            </span>
          </div>
          <p className="text-xs text-on-secondary-container/90 mt-0.5">
            Sofía Montesdeoca tiene consentimiento informado pendiente de firma biométrica antes de iniciar quiropodia.
          </p>
        </div>
        <Link
          href="/pacientes/cli-001/podologia"
          className="flex-shrink-0 text-secondary hover:text-primary transition-colors p-1"
          aria-label="Abrir ficha para firma"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_right</span>
        </Link>
      </div>

      {/* Acciones Rápidas */}
      <section className="grid grid-cols-2 gap-space-sm">
        <button
          onClick={() => setIsNewAppointmentOpen(true)}
          className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-primary text-white shadow-sm active:scale-[0.98] transition-transform font-bold text-xs sm:text-sm hover:bg-primary-container"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span>+ Nueva Cita</span>
        </button>
        <Link
          href="/clientes"
          className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-surface-container-lowest text-secondary shadow-sm active:scale-[0.98] transition-transform hover:bg-surface-container-low font-bold text-xs sm:text-sm border border-secondary/20"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>+ Directorio Clientes</span>
        </Link>
      </section>

      {/* Métricas Clave / KPIs Bento */}
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
            {isLoading ? (
              <span className="font-serif text-2xl font-bold text-primary animate-pulse">—</span>
            ) : (
              <span className="font-serif text-2xl font-bold text-primary">{todayApts.length}</span>
            )}
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

        {/* Total Pacientes */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Pacientes</span>
            <div className="w-7 h-7 rounded-full bg-tertiary-container/15 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[16px]">group</span>
            </div>
          </div>
          <div className="my-2">
            {isLoading ? (
              <span className="font-serif text-2xl font-bold text-primary animate-pulse">—</span>
            ) : (
              <span className="font-serif text-2xl font-bold text-primary">{clients.length}</span>
            )}
            <span className="text-[11px] text-outline block font-medium">registrados</span>
          </div>
          <Link href="/clientes" className="text-xs text-primary font-bold hover:underline">
            Ver directorio →
          </Link>
        </div>

        {/* Nuevos Pacientes */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Nuevos Registros</span>
            <div className="w-7 h-7 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[16px]">person_check</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl font-bold text-secondary">
              {isLoading ? '—' : clients.filter((c) => {
                if (!c.createdAt) return false;
                const created = new Date(c.createdAt);
                const now = new Date();
                return (now.getTime() - created.getTime()) < 7 * 24 * 60 * 60 * 1000;
              }).length}
            </span>
            <span className="text-xs text-on-surface-variant ml-1 font-medium">esta semana</span>
          </div>
          <p className="text-[11px] text-on-surface-variant">Valoración inicial</p>
        </div>

        {/* Retornos Pendientes */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Retornos Clave</span>
            <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px]">replay</span>
            </div>
          </div>
          <div className="my-2">
            <span className="font-serif text-2xl font-bold text-primary">7</span>
            <span className="text-xs text-on-surface-variant ml-1 font-medium">en lista</span>
          </div>
          <Link href="/reportes" className="text-[11px] text-primary font-bold hover:underline">
            Enviar WhatsApp &rarr;
          </Link>
        </div>
      </section>

      {/* Estado de Cabinas & Higiene Clínica */}
      <section className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high shadow-xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-tertiary">
              clean_hands
            </span>
            <span className="text-sm font-bold text-primary">Esterilización &amp; Cabinas</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold">
            Autoclave Ciclo #442 OK
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-surface-container-lowest text-center shadow-xs border border-surface-container-high/40">
            <span className="text-[11px] text-on-surface-variant block font-medium">
              Cabina 1 (Podo)
            </span>
            <span className="text-xs font-bold text-primary block mt-0.5">En Sesión</span>
            <span className="w-2 h-2 mx-auto mt-1.5 rounded-full bg-primary animate-pulse block"></span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-lowest text-center shadow-xs border border-surface-container-high/40">
            <span className="text-[11px] text-on-surface-variant block font-medium">
              Cabina 2 (Spa)
            </span>
            <span className="text-xs font-bold text-secondary block mt-0.5">Aromaterapia</span>
            <span className="w-2 h-2 mx-auto mt-1.5 rounded-full bg-secondary block"></span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-lowest text-center shadow-xs border border-surface-container-high/40">
            <span className="text-[11px] text-on-surface-variant block font-medium">
              Cabina 3 (Podo)
            </span>
            <span className="text-xs font-bold text-tertiary block mt-0.5">Sanitizada</span>
            <span className="w-2 h-2 mx-auto mt-1.5 rounded-full bg-tertiary block"></span>
          </div>
        </div>
      </section>

      {/* Cronograma de Hoy */}
      <section className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="font-serif text-xl text-primary font-bold">Cronograma de Hoy</h2>
            <span className="text-xs text-on-surface-variant">
              {isLoading ? 'Cargando citas...' : `${filteredAppointments.length} sesiones programadas`}
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
              Todos
            </button>
            <button
              onClick={() => setFilterDiscipline('podologia')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterDiscipline === 'podologia'
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Podo
            </button>
            <button
              onClick={() => setFilterDiscipline('masaje')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterDiscipline === 'masaje'
                  ? 'bg-surface-container-lowest text-secondary font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Spa
            </button>
          </div>
        </div>

        {/* Timeline list */}
        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-2xl animate-spin text-primary">sync</span>
            <span className="text-xs font-medium">Cargando agenda desde Supabase...</span>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline">event_busy</span>
            <span className="text-sm font-medium text-center">Sin citas programadas para hoy</span>
            <button
              onClick={() => setIsNewAppointmentOpen(true)}
              className="mt-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container transition-all"
            >
              + Agregar Primera Cita
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredAppointments.map((apt) => {
              const isPodo = apt.discipline === 'podologia';
              return (
                <article
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className="relative flex overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs border border-surface-container-high/60 cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                >
                  {/* Lateral discipline color bar */}
                  <div
                    className={`w-2 flex-shrink-0 ${
                      isPodo ? 'bg-primary-container' : 'bg-secondary'
                    }`}
                  />
                  <div className="flex-1 p-3.5 flex flex-col gap-2 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isPodo
                                ? 'bg-primary-container/10 text-primary-container'
                                : 'bg-secondary-container/40 text-secondary'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPodo ? 'bg-primary-container' : 'bg-secondary'
                              }`}
                            />
                            {isPodo ? 'Podología Clínica' : 'Terapia Corporal'}
                          </span>

                          {apt.status === 'en_curso' && (
                            <span className="px-1.5 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary text-[10px] font-bold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px] animate-spin">
                                sync
                              </span>{' '}
                              En curso
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
                          className={`font-serif text-lg font-bold block ${
                            isPodo ? 'text-primary' : 'text-secondary'
                          }`}
                        >
                          {apt.time}
                        </span>
                        <span className="text-[11px] text-outline font-medium">
                          {apt.durationMinutes} min
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/40 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="material-symbols-outlined text-[15px] text-primary">
                          stethoscope
                        </span>
                        <span className="truncate">
                          {apt.professionalName} • {apt.cabinName}
                        </span>
                      </div>
                      <span className="text-primary font-bold hover:underline flex-shrink-0">
                        Ver Ficha &rarr;
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom Sheet Appointment Details */}
      <AppointmentBottomSheet
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onStatusChange={handleStatusChange}
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
