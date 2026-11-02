'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Appointment, Client, Professional, ServicePackage } from '@/types/database';
import { dbService } from '@/lib/dbService';

export const BLOCK_COLOR_PALETTE = [
  { id: '#7A4F3A', label: 'Terracota Spa' },
  { id: '#2E6F5E', label: 'Esmeralda Clínica' },
  { id: '#5B6291', label: 'Lavanda Relajante' },
  { id: '#B87B31', label: 'Ámbar Dorado' },
  { id: '#2F6889', label: 'Azul Clínico' },
  { id: '#A8526B', label: 'Rosa Cuarzo' },
  { id: '#52734D', label: 'Salvia Botánica' },
  { id: '#9B4444', label: 'Coral Intenso' },
];

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  editingAppointment?: Appointment | null;
  defaultDate?: string;
  defaultTime?: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function NewAppointmentModal({
  isOpen,
  onClose,
  clients,
  onAddAppointment,
  onUpdateAppointment,
  editingAppointment,
  defaultDate,
  defaultTime,
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
  const [price, setPrice] = useState<string>('');
  const [duration, setDuration] = useState<string>('45');
  const [notes, setNotes] = useState('');
  const [blockColor, setBlockColor] = useState(BLOCK_COLOR_PALETTE[0].id);
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
      setPrice(editingAppointment.price ? String(editingAppointment.price) : '');
      setDuration(String(editingAppointment.durationMinutes || 45));
      setNotes(editingAppointment.notes || '');
      setBlockColor(editingAppointment.blockColor || BLOCK_COLOR_PALETTE[0].id);
    } else {
      setSelectedClientId(clients[0]?.id || '');
      setDiscipline('podologia');
      setTime(defaultTime || '10:00');
      setDate(defaultDate || todayStr());
      setCabin('Cabina 1');
      setNotes('');
      setBlockColor(BLOCK_COLOR_PALETTE[0].id);

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
        setPrice(servicesList[0].price ? String(servicesList[0].price) : '');
        setDuration(String(servicesList[0].durationMinutes || 45));
      } else {
        setServiceName('');
        setPrice('');
        setDuration('45');
      }
    }
  }, [editingAppointment, clients, isOpen, professionalsList, servicesList, defaultDate, defaultTime]);

  // Cuando cambia el servicio seleccionado en el dropdown
  const handleServiceSelect = (val: string) => {
    setServiceName(val);
    const found = servicesList.find((s) => s.name === val);
    if (found) {
      setPrice(found.price ? String(found.price) : '');
      setDuration(String(found.durationMinutes || 45));
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

    const numericPrice = Number(price) || 0;
    const numericDuration = Number(duration) || 45;

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
      durationMinutes: numericDuration,
      price: numericPrice,
      servicePrice: editingAppointment?.servicePrice ?? numericPrice,
      soldProducts: editingAppointment?.soldProducts,
      productsTotal: editingAppointment?.productsTotal,
      blockColor,
      status: (editingAppointment?.status || 'confirmado') as Appointment['status'],
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
                step="any"
                placeholder="Ej. 80"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
                min={5}
                step={5}
                placeholder="45"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface"
              />
            </div>
          </div>

          {/* 6. Color del Bloque en Vista Calendario */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-primary">palette</span>
                <span>Color del Bloque en el Calendario</span>
              </label>
              <span className="text-[11px] font-bold text-primary">
                {BLOCK_COLOR_PALETTE.find((c) => c.id === blockColor)?.label || 'Color personalizado'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {BLOCK_COLOR_PALETTE.map((col) => {
                const isSelected = blockColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setBlockColor(col.id)}
                    title={col.label}
                    style={{ backgroundColor: col.id }}
                    className={`w-8 h-8 rounded-xl transition-all flex items-center justify-center text-white shadow-xs ${
                      isSelected ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                  </button>
                );
              })}
              <label
                title="Elegir otro color libremente"
                className="w-8 h-8 rounded-xl border border-dashed border-primary/50 flex items-center justify-center cursor-pointer hover:bg-surface-container relative overflow-hidden"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">colorize</span>
                <input
                  type="color"
                  value={blockColor}
                  onChange={(e) => setBlockColor(e.target.value)}
                  className="opacity-0 absolute inset-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Notas / Motivo */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface-variant block">
              Motivo de la consulta / Notas adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Dolor en hallux derecho, control mensual, contractura cervical..."
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
