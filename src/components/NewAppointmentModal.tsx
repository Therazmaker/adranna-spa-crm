'use client';

import React, { useState, useEffect } from 'react';
import { Appointment, Client } from '@/types/database';
import { dbService } from '@/lib/dbService';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  editingAppointment?: Appointment | null;
}

const SERVICES_PODO = [
  { label: 'Quiropodia Integral Clínica (45 min)',           value: 'Quiropodia Integral Clínica',           duration: 45, price: 750 },
  { label: 'Onicocriptosis Láser + Reconstrucción (50 min)', value: 'Onicocriptosis Láser + Reconstrucción',  duration: 50, price: 1100 },
  { label: 'Tratamiento de Helomas & Hiperqueratosis (40 min)', value: 'Tratamiento de Helomas & Hiperqueratosis', duration: 40, price: 650 },
  { label: 'Valoración Preventiva Pie Diabético (45 min)',   value: 'Valoración Preventiva Pie Diabético',   duration: 45, price: 750 },
];

const SERVICES_MASAJE = [
  { label: 'Masaje Descontracturante Tejido Profundo (60 min)', value: 'Masaje Descontracturante Tejido Profundo', duration: 60, price: 950 },
  { label: 'Ritual Spa de Relajación & Aromaterapia (50 min)', value: 'Ritual Spa de Relajación & Aromaterapia',  duration: 50, price: 850 },
  { label: 'Drenaje Linfático Manual (50 min)',               value: 'Drenaje Linfático Manual',               duration: 50, price: 900 },
  { label: 'Presoterapia + Masaje (60 min)',                  value: 'Presoterapia + Masaje',                  duration: 60, price: 1000 },
];

const CABINS_PODO   = ['Cabina 1 (Podología)', 'Cabina 2 (Podología)', 'Cabina 3 (Podología)'];
const CABINS_MASAJE = ['Cabina 2 (Spa / Aromaterapia)', 'Cabina 3 (Spa)'];

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

  const [selectedClientId, setSelectedClientId] = useState('');
  const [discipline, setDiscipline]             = useState<'podologia' | 'masaje'>('podologia');
  const [serviceName, setServiceName]           = useState(SERVICES_PODO[0].value);
  const [time, setTime]                         = useState('10:00');
  const [date, setDate]                         = useState(todayStr());
  const [cabin, setCabin]                       = useState(CABINS_PODO[0]);
  const [professional, setProfessional]         = useState('Dra. Elena Valdés');
  const [profRole, setProfRole]                 = useState('Podóloga Titular');
  const [price, setPrice]                       = useState(750);
  const [duration, setDuration]                 = useState(45);
  const [notes, setNotes]                       = useState('');
  const [isSaving, setIsSaving]                 = useState(false);

  // Prellenar si es edición
  useEffect(() => {
    if (editingAppointment) {
      setSelectedClientId(editingAppointment.clientId);
      setDiscipline(editingAppointment.discipline as 'podologia' | 'masaje');
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
      // Reset
      setSelectedClientId(clients[0]?.id || '');
      setDiscipline('podologia');
      setServiceName(SERVICES_PODO[0].value);
      setTime('10:00');
      setDate(todayStr());
      setCabin(CABINS_PODO[0]);
      setProfessional('Dra. Elena Valdés');
      setProfRole('Podóloga Titular');
      setPrice(750);
      setDuration(45);
      setNotes('');
    }
  }, [editingAppointment, clients, isOpen]);

  // Sincronizar servicio seleccionado con precio/duración
  const handleServiceChange = (val: string) => {
    setServiceName(val);
    const list = discipline === 'podologia' ? SERVICES_PODO : SERVICES_MASAJE;
    const found = list.find((s) => s.value === val);
    if (found) { setPrice(found.price); setDuration(found.duration); }
  };

  const handleDisciplineChange = (d: 'podologia' | 'masaje') => {
    setDiscipline(d);
    const firstSrv = d === 'podologia' ? SERVICES_PODO[0] : SERVICES_MASAJE[0];
    setServiceName(firstSrv.value);
    setPrice(firstSrv.price);
    setDuration(firstSrv.duration);
    setCabin(d === 'podologia' ? CABINS_PODO[0] : CABINS_MASAJE[0]);
    setProfessional(d === 'podologia' ? 'Dra. Elena Valdés' : 'Lic. Claudia Nájera');
    setProfRole(d === 'podologia' ? 'Podóloga Titular' : 'Terapeuta Spa');
  };

  if (!isOpen) return null;

  const client = clients.find((c) => c.id === selectedClientId) || clients[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setIsSaving(true);

    const base = {
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      professionalName: professional,
      professionalRole: profRole,
      discipline,
      cabinId: 'cab-1',
      cabinName: cabin,
      serviceName,
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

  const serviceList = discipline === 'podologia' ? SERVICES_PODO : SERVICES_MASAJE;
  const cabinList   = discipline === 'podologia' ? CABINS_PODO   : CABINS_MASAJE;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${isEdit ? 'bg-secondary-container text-secondary' : 'bg-primary-container text-white'}`}>
              <span className="material-symbols-outlined text-[18px]">{isEdit ? 'edit_calendar' : 'add_circle'}</span>
            </span>
            <h3 className="font-serif text-xl font-bold text-primary">
              {isEdit ? 'Editar Cita' : 'Agendar en 3 Toques'}
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
            <label className="text-xs font-bold uppercase tracking-wider text-secondary block">
              1. Paciente
            </label>
            {clients.length === 0 ? (
              <p className="text-xs text-error font-medium p-3 rounded-xl bg-error-container/30 border border-error/20">
                No hay pacientes registrados. Ve a Clientes → + Nuevo primero.
              </p>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.hasMedicalAlert ? ' ⚠️' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Disciplina */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-secondary block">
              2. Disciplina
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDisciplineChange('podologia')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  discipline === 'podologia'
                    ? 'bg-primary-container text-white border-primary-container shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">footprint</span>
                Podología
              </button>
              <button
                type="button"
                onClick={() => handleDisciplineChange('masaje')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  discipline === 'masaje'
                    ? 'bg-secondary text-white border-secondary shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">spa</span>
                Masaje / Spa
              </button>
            </div>
          </div>

          {/* Servicio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant block">Tratamiento Específico</label>
            <select
              value={serviceName}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {serviceList.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Cabina + Profesional */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">Cabina</label>
              <select
                value={cabin}
                onChange={(e) => setCabin(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {cabinList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">Profesional</label>
              <input
                type="text"
                value={professional}
                onChange={(e) => setProfessional(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* 3. Fecha y Hora */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-secondary block">
              3. Fecha y Hora
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Precio + Duración */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">Precio (S/)</label>
              <input
                type="number" min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">Duración (min)</label>
              <input
                type="number" min={15} step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface-variant block">Notas (opcional)</label>
            <textarea
              rows={2}
              placeholder="Indicaciones especiales para esta sesión..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving || clients.length === 0}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSaving ? (
              <><span className="material-symbols-outlined text-[18px] animate-spin">sync</span><span>Guardando...</span></>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">{isEdit ? 'save' : 'check_circle'}</span><span>{isEdit ? 'Guardar Cambios' : 'Confirmar Cita'}</span></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
