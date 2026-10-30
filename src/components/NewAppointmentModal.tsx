'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Appointment, Client, Professional, ServicePackage } from '@/types/database';
import { dbService } from '@/lib/dbService';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  editingAppointment?: Appointment | null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function NewAppointmentModal({
  isOpen,
  onClose,
  clients,
  onAddAppointment,
  onUpdateAppointment,
  editingAppointment,
}: NewAppointmentModalProps) {
  const isEdit = !!editingAppointment;

  // DB Data
  const [professionalsList, setProfessionalsList] = useState<Professional[]>([]);
  const [servicesList, setServicesList] = useState<ServicePackage[]>([]);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [discipline, setDiscipline] = useState<'podologia' | 'masaje' | 'manicura'>('podologia');
  const [serviceName, setServiceName] = useState('');
  const [time, setTime] = useState('10:00');
  const [date, setDate] = useState(todayStr());
  const [cabin, setCabin] = useState('Cabina 1');
  const [professional, setProfessional] = useState('');
  const [profRole, setProfRole] = useState('');
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dbService.getProfessionals().then(setProfessionalsList);
      dbService.getServices().then(setServicesList);
    }
  }, [isOpen]);

  // Prellenar al abrir o editar
  useEffect(() => {
    if (editingAppointment) {
      setSelectedClientId(editingAppointment.clientId);
      setDiscipline((editingAppointment.discipline as 'podologia' | 'masaje' | 'manicura') || 'podologia');
      setServiceName(editingAppointment.serviceName);
      setTime(editingAppointment.time);
      setDate(editingAppointment.date || todayStr());
      setCabin(editingAppointment.cabinName);
      setProfessional(editingAppointment.professionalName);
      setProfRole(editingAppointment.professionalRole || '');
      setPrice(editingAppointment.price);
      setDuration(editingAppointment.durationMinutes);
      setNotes(editingAppointment.notes || '');
    } else {
      setSelectedClientId(clients[0]?.id || '');
      setDiscipline('podologia');
      setTime('10:00');
      setDate(todayStr());
      setCabin('Cabina 1');
      setNotes('');

      // Auto-seleccionar primer profesional disponible si existe
      if (professionalsList.length > 0) {
        setProfessional(professionalsList[0].name);
        setProfRole(professionalsList[0].role);
      } else {
        setProfessional('');
        setProfRole('');
      }

      // Auto-seleccionar primer servicio si existe
      if (servicesList.length > 0) {
        setServiceName(servicesList[0].name);
        setPrice(servicesList[0].price);
        setDuration(servicesList[0].durationMinutes);
      } else {
        setServiceName('');
        setPrice(0);
        setDuration(45);
      }
    }
  }, [editingAppointment, clients, isOpen, professionalsList, servicesList]);

  // Cuando cambia el servicio seleccionado en el dropdown
  const handleServiceSelect = (val: string) => {
    setServiceName(val);
    const found = servicesList.find((s) => s.name === val);
    if (found) {
      setPrice(found.price);
      setDuration(found.durationMinutes);
      if (found.category === 'podologia' || found.category === 'masaje' || found.category === 'manicura') {
        setDiscipline(found.category);
      }
    }
  };

  // Cuando cambia el profesional en el dropdown
  const handleProfSelect = (nameVal: string) => {
    setProfessional(nameVal);
    const found = professionalsList.find((p) => p.name === nameVal);
    if (found) {
      setProfRole(found.role);
    }
  };

  if (!isOpen) return null;

  const client = clients.find((c) => c.id === selectedClientId) || clients[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    if (!serviceName.trim()) {
      alert('Por favor ingresa o selecciona un tratamiento.');
      return;
    }
    if (!professional.trim()) {
      alert('Por favor indica qué profesional atenderá la cita.');
      return;
    }

    setIsSaving(true);

    const base = {
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      professionalName: professional.trim(),
      professionalRole: profRole.trim() || 'Especialista',
      discipline: (discipline === 'manicura' ? 'podologia' : discipline) as 'podologia' | 'masaje',
      cabinId: 'cab-1',
      cabinName: cabin.trim(),
      serviceName: serviceName.trim(),
      durationMinutes: duration,
      price,
      status: 'confirmado' as Appointment['status'],
      date,
      time,
      hasMedicalAlert: client.hasMedicalAlert,
      medicalAlertText: client.medicalAlertDescription,
      hasPendingConsent: client.hasMedicalAlert,
      notes: notes.trim() || undefined,
    };

    if (isEdit && editingAppointment) {
      const updated = await dbService.updateAppointment(editingAppointment.id, base);
      if (updated && onUpdateAppointment) onUpdateAppointment(updated);
      else if (onUpdateAppointment) onUpdateAppointment({ ...editingAppointment, ...base });
    } else {
      const created = await dbService.createAppointment(base);
      const apt: Appointment = created ?? { id: `apt-${Date.now()}`, ...base };
      onAddAppointment(apt);
    }

    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 pb-8 sm:pb-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${isEdit ? 'bg-secondary-container text-secondary' : 'bg-primary-container text-white'}`}>
              <span className="material-symbols-outlined text-[18px]">
                {isEdit ? 'edit_calendar' : 'add_circle'}
              </span>
            </span>
            <h3 className="font-serif text-xl font-bold text-primary">
              {isEdit ? 'Editar Cita' : 'Agendar Cita'}
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
          {/* 1. Paciente */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary block">
                1. Paciente / Cliente *
              </label>
              <Link href="/clientes" onClick={onClose} className="text-[11px] text-primary font-bold hover:underline">
                + Crear Paciente
              </Link>
            </div>

            {clients.length === 0 ? (
              <p className="text-xs text-error font-medium p-3 rounded-xl bg-error-container/30 border border-error/20">
                No hay pacientes registrados aún. Primero agrega un paciente en el Directorio.
              </p>
            ) : (
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
            )}
          </div>

          {/* 2. Tratamiento / Servicio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary block">
                2. Tratamiento Específico *
              </label>
              <Link href="/servicios" onClick={onClose} className="text-[11px] text-primary font-bold hover:underline">
                + Gestionar Tarifario
              </Link>
            </div>

            {servicesList.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={serviceName}
                  onChange={(e) => handleServiceSelect(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Seleccionar Tratamiento del Catálogo --</option>
                  {servicesList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.durationMinutes} min - S/ {s.price})
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="O escribe un tratamiento personalizado..."
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface"
                  />
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  required
                  placeholder="Ej. Quiropodia Integral / Masaje Descontracturante / Manicura Spa"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-[10px] text-outline mt-1 block">
                  Consejo: Agrega tus tratamientos en Servicios para seleccionarlos con un click.
                </span>
              </div>
            )}
          </div>

          {/* 3. Profesional */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary block">
                3. Profesional Asignada *
              </label>
              <Link href="/equipo" onClick={onClose} className="text-[11px] text-primary font-bold hover:underline">
                + Ver / Agregar Equipo
              </Link>
            </div>

            {professionalsList.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={professional}
                  onChange={(e) => handleProfSelect(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Seleccionar Profesional --</option>
                  {professionalsList.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="O escribe el nombre de la profesional..."
                  value={professional}
                  onChange={(e) => setProfessional(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface"
                />
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carmen Mendoza (Podóloga)"
                  value={professional}
                  onChange={(e) => setProfessional(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-[10px] text-outline mt-1 block">
                  Registra a tus podólogas, masajistas y manicuristas en el menú Equipo.
                </span>
              </div>
            )}
          </div>

          {/* 4. Cabina / Ubicación */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">
                Cabina / Espacio
              </label>
              <input
                type="text"
                placeholder="Ej. Cabina 1 / Cabina Spa / Manicura"
                value={cabin}
                onChange={(e) => setCabin(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">
                Precio (S/ PEN)
              </label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* 5. Fecha, Hora y Duración */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">
                Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">
                Duración (min)
              </label>
              <input
                type="number"
                min={15}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface-variant block">
              Notas adicionales (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Indicaciones para la sesión..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || clients.length === 0}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                <span>Guardando cita...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  {isEdit ? 'save' : 'check_circle'}
                </span>
                <span>{isEdit ? 'Guardar Cambios de la Cita' : 'Confirmar & Agendar Cita'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
