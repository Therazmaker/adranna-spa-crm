'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Appointment, Client, Professional, ServicePackage } from '@/types/database';
import { dbService } from '@/lib/dbService';
import { formatTime12, getTimeOptions12 } from '@/lib/timeUtils';
import { getLocalDateStr } from '@/lib/dateUtils';

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

const todayStr = () => getLocalDateStr();

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
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
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
  const [customTag, setCustomTag] = useState('');
  const [tagColor, setTagColor] = useState('#D97706');
  const [isSaving, setIsSaving] = useState(false);

  // Prellenar únicamente al abrir el modal o cambiar la cita que se edita
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    if (editingAppointment) {
      setSelectedClientId(editingAppointment.clientId);
      const foundClient = clients.find((c) => c.id === editingAppointment.clientId);
      setClientSearchQuery(foundClient ? foundClient.name : editingAppointment.clientName || '');
      setIsClientDropdownOpen(false);
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
      setCustomTag(editingAppointment.customTag || '');
      setTagColor(editingAppointment.tagColor || '#D97706');
    } else {
      const initialClient = clients.find((c) => c.id === selectedClientId) || clients[0];
      const initialId = initialClient?.id || '';
      setSelectedClientId(initialId);
      setClientSearchQuery(initialClient ? initialClient.name : '');
      setIsClientDropdownOpen(false);
      setDiscipline('podologia');
      setTime(defaultTime || '10:00');
      setDate(defaultDate || todayStr());
      setCabin('Cabina 1');
      setNotes('');
      setBlockColor(BLOCK_COLOR_PALETTE[0].id);
      setCustomTag('');
      setTagColor('#D97706');
      setServiceName('');
      setPrice('');
      setDuration('45');
      setProfessional('');
      setProfRole('');
    }

    Promise.all([dbService.getProfessionals(), dbService.getServices()]).then(
      ([profs, srvs]) => {
        if (!active) return;
        setProfessionalsList(profs);
        setServicesList(srvs);

        if (!editingAppointment) {
          if (profs.length > 0) {
            setProfessional((prev) => prev || profs[0].name);
            setProfRole((prev) => prev || profs[0].role);
          }
          if (srvs.length > 0) {
            setServiceName((prev) => prev || srvs[0].name);
            setPrice((prev) => (prev !== '' ? prev : srvs[0].price ? String(srvs[0].price) : ''));
            setDuration((prev) => (prev !== '45' ? prev : String(srvs[0].durationMinutes || 45)));
          }
        }
      }
    );

    return () => {
      active = false;
    };
  }, [isOpen, editingAppointment, defaultDate, defaultTime]);

  // Cuando cambia el servicio seleccionado en el dropdown
  const handleServiceSelect = (val: string) => {
    setServiceName(val);
    const found = servicesList.find((s) => s.name === val);
    if (found) {
      setPrice(found.price ? String(found.price) : '');
      setDuration(String(found.durationMinutes || 45));
      if (found.category === 'podologia' || found.category === 'masaje') {
        setDiscipline(found.category);
      } else if (/masaj|corporal|relaj|descontract|piedras|reduct/i.test(found.name)) {
        setDiscipline('masaje');
      } else if (/podo|pie|uña|call|quiropod/i.test(found.name)) {
        setDiscipline('podologia');
      }
    } else {
      if (/masaj|corporal|relaj|descontract|piedras|reduct/i.test(val)) {
        setDiscipline('masaje');
      } else if (/podo|pie|uña|call|quiropod/i.test(val)) {
        setDiscipline('podologia');
      }
    }
  };

  // Cuando cambia el profesional en el dropdown
  const handleProfSelect = (nameVal: string) => {
    setProfessional(nameVal);
    const found = professionalsList.find((p) => p.name === nameVal);
    if (found) {
      setProfRole(found.role);
      if (/masaj|masoterap/i.test(found.role || '') && !/podo|pie|uña|quiropod/i.test(serviceName)) {
        setDiscipline('masaje');
      } else if (/podo/i.test(found.role || '') && !/masaj|relaj|corporal/i.test(serviceName)) {
        setDiscipline('podologia');
      }
    }
  };

  if (!isOpen) return null;

  const filteredClients = clients.filter((c) => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const client =
    clients.find((c) => c.id === selectedClientId) ||
    clients.find((c) => c.name.toLowerCase() === clientSearchQuery.trim().toLowerCase()) ||
    filteredClients[0] ||
    clients[0];

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

    // Si la cita ya tenía productos asociados, el servicePrice es el precio base del servicio.
    // De lo contrario, el precio ingresado en este formulario corresponde directamente al precio del servicio.
    const prevProdTotal = editingAppointment?.productsTotal || 0;
    const computedServicePrice =
      prevProdTotal > 0
        ? Math.max(0, numericPrice - prevProdTotal)
        : numericPrice;

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
      servicePrice: computedServicePrice,
      soldProducts: editingAppointment?.soldProducts,
      productsTotal: editingAppointment?.productsTotal,
      blockColor,
      customTag: customTag.trim() || undefined,
      tagColor: customTag.trim() ? tagColor : undefined,
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
              <div className="relative space-y-1.5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Escribe el nombre o teléfono del paciente..."
                    value={clientSearchQuery}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value);
                      setIsClientDropdownOpen(true);
                    }}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl pl-9 pr-16 py-2.5 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {clientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearchQuery('');
                          setIsClientDropdownOpen(true);
                        }}
                        className="w-6 h-6 rounded-full hover:bg-surface-container text-outline hover:text-on-surface flex items-center justify-center text-xs"
                        title="Borrar búsqueda"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen((v) => !v)}
                      className="w-7 h-7 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface flex items-center justify-center"
                      title="Ver lista de pacientes"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isClientDropdownOpen ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Dropdown interactivo con lista filtrada en tiempo real */}
                {isClientDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-surface-container-lowest border-2 border-primary/20 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-surface-container-high/60 animate-fadeIn">
                    {filteredClients.length === 0 ? (
                      <div className="p-3 text-center text-xs text-outline space-y-1">
                        <p>No se encontró ningún paciente con &quot;{clientSearchQuery}&quot;</p>
                        <Link
                          href="/clientes"
                          onClick={onClose}
                          className="inline-block text-primary font-bold hover:underline"
                        >
                          + Registrar nuevo paciente
                        </Link>
                      </div>
                    ) : (
                      filteredClients.map((c) => {
                        const isSelected = c.id === selectedClientId;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedClientId(c.id);
                              setClientSearchQuery(c.name);
                              setIsClientDropdownOpen(false);
                            }}
                            className={`p-2.5 px-3 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'hover:bg-surface-container-low text-on-surface'
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px] text-outline">
                                person
                              </span>
                              <div className="truncate">
                                <span className="text-xs font-semibold block truncate">
                                  {c.name}
                                </span>
                                {c.phone && (
                                  <span className="text-[10px] text-outline font-normal">
                                    {c.phone}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {c.hasMedicalAlert && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-0.5">
                                  <span>⚠️</span>
                                  <span>Alerta Médica</span>
                                </span>
                              )}
                              {isSelected && (
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  check
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Confirmación del paciente seleccionado */}
                {client && selectedClientId && (
                  <div className="flex items-center justify-between text-[11px] text-outline px-1">
                    <span>
                      Seleccionado: <strong className="text-on-surface">{client.name}</strong>
                    </span>
                    {client.phone && <span>{client.phone}</span>}
                  </div>
                )}
              </div>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setServiceName(val);
                      if (/masaj|corporal|relaj|descontract|piedras|reduct/i.test(val)) {
                        setDiscipline('masaje');
                      } else if (/podo|pie|uña|call|quiropod/i.test(val)) {
                        setDiscipline('podologia');
                      }
                    }}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setServiceName(val);
                    if (/masaj|corporal|relaj|descontract|piedras|reduct/i.test(val)) {
                      setDiscipline('masaje');
                    } else if (/podo|pie|uña|call|quiropod/i.test(val)) {
                      setDiscipline('podologia');
                    }
                  }}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-[10px] text-outline mt-1 block">
                  Consejo: Agrega tus tratamientos en Servicios para seleccionarlos con un click.
                </span>
              </div>
            )}

            {/* Selector visible de Disciplina */}
            <div className="flex items-center justify-between bg-surface-container-low p-2 rounded-xl border border-surface-container-high mt-1.5">
              <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-primary">category</span>
                Especialidad de la cita:
              </span>
              <div className="inline-flex rounded-lg bg-surface-container-high p-0.5 gap-1">
                <button
                  type="button"
                  onClick={() => setDiscipline('podologia')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    discipline === 'podologia'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Podología
                </button>
                <button
                  type="button"
                  onClick={() => setDiscipline('masaje')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    discipline === 'masaje'
                      ? 'bg-secondary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-secondary'
                  }`}
                >
                  Masajes / Spa
                </button>
              </div>
            </div>
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
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ej. 80"
                value={price}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const cleaned = e.target.value
                    .replace(/[^0-9.]/g, '')
                    .replace(/^0+(?=\d)/, '');
                  setPrice(cleaned);
                }}
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
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {getTimeOptions12().map((opt) => (
                  <option key={opt.value24} value={opt.value24}>
                    {opt.label12}
                  </option>
                ))}
                {/* Si la hora viene fuera de las opciones estándar */}
                {!getTimeOptions12().some((o) => o.value24 === time) && time && (
                  <option value={time}>
                    {formatTime12(time)}
                  </option>
                )}
              </select>
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

          {/* 7. Etiqueta Visual de la Cita (ej. Pendiente de reprogramar) */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/70">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-600">label</span>
                <span>Etiqueta Visual de la Cita (opcional)</span>
              </label>
              {customTag.trim() && (
                <span
                  style={{ backgroundColor: tagColor }}
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white shadow-2xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[10px]">label</span>
                  <span>{customTag.trim()}</span>
                </span>
              )}
            </div>

            {/* Chips rápidos */}
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'Pendiente de reprogramar', color: '#D97706' },
                { label: 'Confirmado por WhatsApp', color: '#059669' },
                { label: 'Por confirmar', color: '#EA580C' },
                { label: 'VIP / Prioritario', color: '#7C3AED' },
                { label: 'Llegará tarde', color: '#DC2626' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setCustomTag(chip.label);
                    setTagColor(chip.color);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                    customTag === chip.label
                      ? 'text-white shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:border-primary/40'
                  }`}
                  style={customTag === chip.label ? { backgroundColor: chip.color, borderColor: chip.color } : undefined}
                >
                  + {chip.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Escribe una etiqueta (ej. Pendiente de reprogramar)..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                className="flex-1 bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-1">
                {['#D97706', '#059669', '#EA580C', '#0284C7', '#7C3AED', '#DC2626'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setTagColor(col)}
                    style={{ backgroundColor: col }}
                    className={`w-6 h-6 rounded-lg transition-transform ${
                      tagColor === col && customTag.trim() ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
              {customTag && (
                <button
                  type="button"
                  onClick={() => setCustomTag('')}
                  title="Quitar etiqueta"
                  className="w-7 h-7 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-error flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              )}
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
