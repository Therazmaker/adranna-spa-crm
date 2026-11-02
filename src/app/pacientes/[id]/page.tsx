'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { dbService } from '@/lib/dbService';
import { Appointment, Client } from '@/types/database';
import { formatTime12 } from '@/lib/timeUtils';

function addDaysToToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatReadableDate(dateStr?: string): string {
  if (!dateStr) return 'Sin fecha';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PacienteGeneralPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [visits, setVisits] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Recordatorio editable (fecha + mensaje)
  const [reminderDate, setReminderDate] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [reminderSavedToast, setReminderSavedToast] = useState(false);

  // Edición rápida en línea de Observaciones y Procedimiento en la tabla
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editObs, setEditObs] = useState('');
  const [editProc, setEditProc] = useState('');
  const [isSavingVisitEdit, setIsSavingVisitEdit] = useState(false);

  // Agregar registro directo a la tabla clínica (ej. transcribir ficha física)
  const [showAddManualRow, setShowAddManualRow] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualObs, setManualObs] = useState('');
  const [manualProc, setManualProc] = useState('');
  const [isSavingManualRow, setIsSavingManualRow] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([dbService.getClients(), dbService.getAppointments()]).then(
      ([clients, allAppointments]) => {
        if (!mounted) return;
        const found = clients.find((c) => c.id === clientId) || clients[0] || null;
        setClient(found);

        if (found) {
          const clientVisits = allAppointments
            .filter(
              (a) =>
                a.clientId === found.id ||
                a.clientName.trim().toLowerCase() === found.name.trim().toLowerCase()
            )
            .sort((a, b) => {
              const dateA = `${a.date || ''} ${a.time || ''}`;
              const dateB = `${b.date || ''} ${b.time || ''}`;
              return dateB.localeCompare(dateA);
            });
          setVisits(clientVisits);

          const defaultDate = found.reminderDate || addDaysToToday(30);
          const defaultMsg =
            found.reminderMessage ||
            `Hola ${found.name}, te saludamos de Adranna Spa ✨. Te escribimos para recordarte tu próxima sesión recomendada para el ${formatReadableDate(
              defaultDate
            )}. ¿Deseas que te agendemos un horario esta semana?`;

          setReminderDate(defaultDate);
          setReminderMessage(defaultMsg);
        }
        setIsLoading(false);
      }
    );
    return () => {
      mounted = false;
    };
  }, [clientId]);

  if (isLoading || !client) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-on-surface-variant gap-2">
        <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
        <span className="text-xs">Cargando perfil e historial del paciente...</span>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const applyTemplate = (type: 'podologia' | 'control' | 'masaje') => {
    const readableDate = formatReadableDate(reminderDate);
    if (type === 'podologia') {
      setReminderMessage(
        `Hola ${client.name}, te saludamos de Adranna Spa ✨. Te recordamos tu sesión preventiva de podología programada para el ${readableDate} para mantener la salud y bienestar de tus pies. ¿En qué horario te gustaría agendar?`
      );
    } else if (type === 'control') {
      setReminderMessage(
        `Hola ${client.name}, te escribimos de Adranna Spa para saber cómo sigues después de tu última atención y recordarte tu control para el ${readableDate}. ¡Quedamos atentas!`
      );
    } else {
      setReminderMessage(
        `Hola ${client.name}, te saludamos de Adranna Spa 🌿. Te esperamos para tu próxima sesión relajante sugerida para el ${readableDate}. ¿Te reservamos tu turno?`
      );
    }
  };

  const handleSaveReminder = async () => {
    setIsSavingReminder(true);
    const updated = await dbService.updateClient(client.id, {
      reminderDate,
      reminderMessage,
    });
    if (updated) {
      setClient(updated);
    }
    setIsSavingReminder(false);
    setReminderSavedToast(true);
    setTimeout(() => setReminderSavedToast(false), 2500);
  };

  const startEditingVisit = (visit: Appointment) => {
    setEditingVisitId(visit.id);
    setEditObs(visit.notes || '');
    setEditProc(visit.procedure || visit.serviceName || '');
  };

  const handleSaveVisitEdit = async (visitId: string) => {
    setIsSavingVisitEdit(true);
    const updates: Partial<Appointment> = {
      notes: editObs.trim() || undefined,
      procedure: editProc.trim() || undefined,
    };
    await dbService.updateAppointment(visitId, updates);
    setVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, ...updates } : v))
    );
    setIsSavingVisitEdit(false);
    setEditingVisitId(null);
  };

  const handleAddManualClinicalRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!manualObs.trim() && !manualProc.trim()) || isSavingManualRow) return;
    setIsSavingManualRow(true);
    const created = await dbService.createAppointment({
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone || '',
      professionalName: 'Dra. Adranna',
      professionalRole: 'Especialista',
      discipline: 'podologia',
      cabinId: 'cab-1',
      cabinName: 'Cabina 1',
      serviceName: manualProc.split('\n')[0]?.replace(/^[-•]\s*/, '') || 'Atención Clínica',
      durationMinutes: 45,
      price: 0,
      status: 'completado',
      date: manualDate,
      time: '10:00',
      notes: manualObs.trim() || undefined,
      procedure: manualProc.trim() || undefined,
    });
    if (created) {
      setVisits((prev) => [created, ...prev]);
    }
    setManualObs('');
    setManualProc('');
    setShowAddManualRow(false);
    setIsSavingManualRow(false);
  };

  const cleanPhone = (client.phone || '').replace(/\D/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(reminderMessage)}`;

  const completedVisitsCount = visits.filter((v) => v.status === 'completado').length;
  const totalSpent = visits
    .filter((v) => v.status === 'completado')
    .reduce((acc, v) => acc + (Number(v.price) || 0), 0);

  return (
    <div className="flex flex-col w-full pb-12 space-y-5">
      {/* Cabecera del Paciente */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {client.avatarUrl ? (
              <img
                src={client.avatarUrl}
                alt={client.name}
                className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-primary/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-container/10 border border-primary-container/20 text-primary font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-xs">
                {getInitials(client.name)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl text-on-surface font-bold truncate">
                  {client.name}
                </h1>
                <Link
                  href="/clientes"
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  <span>Directorio</span>
                </Link>
              </div>
              <p className="text-xs text-on-surface-variant flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="material-symbols-outlined text-sm text-secondary">phone_iphone</span>
                <span>{client.phone || 'Sin teléfono'}</span>
                {client.email && (
                  <>
                    <span>•</span>
                    <span className="truncate">DNI: {client.email}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary-container/10 text-primary-container">
              {visits.length} {visits.length === 1 ? 'cita registrada' : 'citas registradas'}
            </span>
            {completedVisitsCount > 0 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Total invertido: S/ {totalSpent}
              </span>
            )}
          </div>
        </div>

        {/* Alerta Médica / Antecedentes y Medicamentos */}
        {(client.hasMedicalAlert ||
          (client.preexistingConditions && client.preexistingConditions.length > 0) ||
          client.currentMedications ||
          client.medicalHistory) && (
          <div className="bg-error-container/40 border border-error/20 p-3.5 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-lg flex-shrink-0 mt-0.5">
              warning
            </span>
            <div className="space-y-1">
              <span className="text-xs font-bold text-on-error-container block">
                Antecedentes Médicos & Medicación
              </span>
              <p className="text-xs text-on-surface font-semibold">
                {client.preexistingConditions && client.preexistingConditions.length > 0
                  ? client.preexistingConditions.join(', ')
                  : client.medicalAlertDescription || 'Paciente con protocolo clínico especial.'}
              </p>
              {client.medicalHistory && (
                <p className="text-[11px] text-on-surface">
                  <span className="font-bold">Otras condiciones / Cirugías:</span> {client.medicalHistory}
                </p>
              )}
              {client.currentMedications && (
                <p className="text-[11px] text-on-surface">
                  <span className="font-bold">Medicamentos actuales:</span> {client.currentMedications}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-primary shadow-xs whitespace-nowrap"
          >
            Perfil & Historial de Visitas
          </button>
          <Link
            href={`/pacientes/${clientId}/podologia`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">footprint</span>
            <span>Ficha Podológica</span>
          </Link>
          <Link
            href={`/pacientes/${clientId}/masaje`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">spa</span>
            <span>Ficha Masajes</span>
          </Link>
        </div>
      </section>

      {/* Historial de Visitas del Cliente — Formato Ficha Clínica: FECHA | OBSERVACIONES | PROCEDIMIENTO */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary-container/15 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">history_edu</span>
            </span>
            <div>
              <h2 className="font-serif text-lg font-bold text-primary">
                Ficha de Evolución & Historial de Visitas
              </h2>
              <p className="text-xs text-on-surface-variant">
                Tabla clínica con Fecha, Observaciones (hallazgos) y Procedimiento realizado en cada atención
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAddManualRow((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-colors flex items-center gap-1 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              <span>{showAddManualRow ? 'Cerrar' : '+ Anotar en Ficha'}</span>
            </button>

            <Link
              href="/agenda"
              className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-bold text-primary hover:bg-surface-container transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">calendar_add_on</span>
              <span>Ir a Agenda</span>
            </Link>
          </div>
        </div>

        {/* Formulario rápido para añadir una fila histórica o directa a la ficha */}
        {showAddManualRow && (
          <form
            onSubmit={handleAddManualClinicalRow}
            className="p-3.5 rounded-2xl bg-surface-container-low border-2 border-primary/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">
                Agregar fila directa al cuadro clínico de {client.name}
              </span>
              <span className="text-[10px] text-outline font-semibold">
                Ideal para pasar fichas físicas o anotar un control rápido
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-on-surface-variant block mb-1">
                  FECHA
                </label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-2.5 py-2 text-xs font-bold text-on-surface"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="text-[10px] font-bold uppercase text-on-surface-variant block mb-1">
                  OBSERVACIONES (Hallazgos)
                </label>
                <textarea
                  rows={3}
                  placeholder={'• Onicomicosis ambos 1er dedo\n• Helomas sobre los 4to y 5to dedo\n• Helomas en metatarso y talón.'}
                  value={manualObs}
                  onChange={(e) => setManualObs(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2.5 text-xs font-medium text-on-surface"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="text-[10px] font-bold uppercase text-on-surface-variant block mb-1">
                  PROCEDIMIENTO (Realizado / Recomendación)
                </label>
                <textarea
                  rows={3}
                  placeholder={'- Profilaxis\n- Se le recomendó ortésicos\n- Des. calzado, antisudoral, ciclopirox'}
                  value={manualProc}
                  onChange={(e) => setManualProc(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2.5 text-xs font-medium text-on-surface"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddManualRow(false)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high text-xs font-bold text-on-surface-variant"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingManualRow}
                className="px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
              >
                {isSavingManualRow ? 'Guardando...' : 'Guardar en Tabla Clínica'}
              </button>
            </div>
          </form>
        )}

        {visits.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-2xl bg-surface-container-low border border-dashed border-surface-container-high space-y-2">
            <span className="material-symbols-outlined text-3xl text-outline">event_busy</span>
            <p className="text-xs font-bold text-on-surface">
              Este cliente aún no tiene visitas registradas en la ficha
            </p>
            <p className="text-[11px] text-on-surface-variant max-w-md mx-auto">
              Cuando finalices una cita para {client.name} o uses el botón <strong>+ Anotar en Ficha</strong>, aparecerá aquí en el cuadro de <strong>FECHA | OBSERVACIONES | PROCEDIMIENTO</strong>.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-on-surface/25 overflow-hidden bg-surface-container-lowest shadow-xs">
            {/* Cabecera idéntica a la Ficha Física: FECHA | OBSERVACIONES | PROCEDIMIENTO */}
            <div className="hidden sm:grid sm:grid-cols-12 bg-surface-container-high border-b-2 border-on-surface/25 text-xs font-extrabold uppercase tracking-wider text-on-surface text-center">
              <div className="sm:col-span-2 py-3 px-2 border-r-2 border-on-surface/25">
                FECHA
              </div>
              <div className="sm:col-span-5 py-3 px-4 border-r-2 border-on-surface/25">
                OBSERVACIONES
              </div>
              <div className="sm:col-span-5 py-3 px-4">
                PROCEDIMIENTO
              </div>
            </div>

            <div className="divide-y-2 divide-on-surface/20">
              {visits.map((visit) => {
                const isCompleted = visit.status === 'completado';
                const soldProducts = visit.soldProducts || [];
                const isEditing = editingVisitId === visit.id;
                const shortDate = visit.date
                  ? visit.date.split('-').reverse().join('/')
                  : formatReadableDate(visit.date);

                const obsLines = (visit.notes || '')
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean);

                const procText = visit.procedure || visit.serviceName || '';
                const procLines = procText
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean);

                return (
                  <div
                    key={visit.id}
                    className="grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x-2 divide-on-surface/20 hover:bg-surface-container-low/40 transition-colors"
                  >
                    {/* Columna 1: FECHA */}
                    <div className="sm:col-span-2 p-3 flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-1.5 bg-surface-container-low/30 text-center">
                      <div>
                        <span className="font-mono text-sm font-extrabold text-on-surface block">
                          {shortDate}
                        </span>
                        <span className="text-[10px] font-semibold text-outline block">
                          {visit.time} · {visit.professionalName}
                        </span>
                      </div>

                      <div className="flex flex-col items-end sm:items-center gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : visit.status === 'en_curso'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {isCompleted
                            ? 'Finalizada'
                            : visit.status === 'en_curso'
                            ? 'En Curso'
                            : 'Programada'}
                        </span>

                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => startEditingVisit(visit)}
                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                            <span>Editar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Columna 2: OBSERVACIONES */}
                    <div className="sm:col-span-5 p-3.5 flex flex-col justify-between">
                      <div>
                        <span className="sm:hidden text-[10px] font-extrabold uppercase tracking-wider text-outline block mb-1">
                          OBSERVACIONES
                        </span>

                        {isEditing ? (
                          <textarea
                            rows={4}
                            value={editObs}
                            onChange={(e) => setEditObs(e.target.value)}
                            placeholder={'• Onicomicosis ambos 1er dedo\n• Helomas sobre los 4to y 5to dedo'}
                            className="w-full bg-surface-container-lowest border border-primary rounded-xl p-2.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        ) : obsLines.length > 0 ? (
                          <ul className="space-y-1 text-xs text-on-surface font-medium leading-relaxed">
                            {obsLines.map((line, i) => {
                              const clean = line.replace(/^[•\-*]\s*/, '');
                              return (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-primary font-bold select-none">•</span>
                                  <span>{clean}</span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-outline italic">
                            Sin observaciones registradas. Pulsa «Editar» para anotar hallazgos.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Columna 3: PROCEDIMIENTO */}
                    <div className="sm:col-span-5 p-3.5 flex flex-col justify-between gap-2">
                      <div>
                        <span className="sm:hidden text-[10px] font-extrabold uppercase tracking-wider text-outline block mb-1">
                          PROCEDIMIENTO
                        </span>

                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              rows={4}
                              value={editProc}
                              onChange={(e) => setEditProc(e.target.value)}
                              placeholder={'- Profilaxis\n- Se le recomendó ortésicos\n- Des. calzado, antisudoral, ciclopirox'}
                              className="w-full bg-surface-container-lowest border border-primary rounded-xl p-2.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingVisitId(null)}
                                className="px-2.5 py-1 rounded-lg bg-surface-container-high text-xs font-bold text-on-surface-variant"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={isSavingVisitEdit}
                                onClick={() => handleSaveVisitEdit(visit.id)}
                                className="px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                              >
                                {isSavingVisitEdit ? 'Guardando...' : 'Guardar cambios'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {procLines.length > 0 ? (
                              <ul className="space-y-1 text-xs text-on-surface font-medium leading-relaxed">
                                {procLines.map((line, i) => {
                                  const clean = line.replace(/^[-•*]\s*/, '');
                                  return (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-secondary font-bold select-none">-</span>
                                      <span>{clean}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-xs text-outline italic">
                                —
                              </p>
                            )}

                            {visit.procedure &&
                              visit.serviceName &&
                              !visit.procedure
                                .toLowerCase()
                                .includes(visit.serviceName.toLowerCase()) && (
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-primary-container/10 text-primary mt-1">
                                  Servicio base: {visit.serviceName}
                                </span>
                              )}
                          </div>
                        )}
                      </div>

                      {/* Productos comprados + Importe al pie de Procedimiento */}
                      <div className="pt-2 border-t border-surface-container-high/70 flex items-center justify-between gap-2 flex-wrap">
                        {soldProducts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {soldProducts.map((item, i) => (
                              <span
                                key={`${item.productId}-${i}`}
                                className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-900"
                              >
                                🛍️ {item.quantity}x {item.name} ({item.presentation})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-outline">
                            {visit.cabinName}
                          </span>
                        )}

                        {Number(visit.price) > 0 && (
                          <span className="font-serif text-xs font-bold text-primary ml-auto">
                            S/ {visit.price}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Recordatorio Editable por WhatsApp */}
      <section className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl border border-surface-container-high shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Recordatorio Personalizable por WhatsApp
              </h3>
              <p className="text-xs text-on-surface-variant">
                Edita libremente la fecha del próximo recordatorio y el mensaje antes de enviarlo
              </p>
            </div>
          </div>

          {reminderSavedToast && (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              Guardado en la ficha
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Columna Fecha Editable */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant block">
              Fecha del Recordatorio / Próxima Cita
            </label>
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setReminderDate(addDaysToToday(15))}
                className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-primary text-[11px] font-bold transition-colors"
              >
                En 15 días
              </button>
              <button
                type="button"
                onClick={() => setReminderDate(addDaysToToday(30))}
                className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-primary text-[11px] font-bold transition-colors"
              >
                En 1 mes
              </button>
              <button
                type="button"
                onClick={() => setReminderDate(addDaysToToday(45))}
                className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-primary text-[11px] font-bold transition-colors"
              >
                En 6 semanas
              </button>
            </div>
          </div>

          {/* Columna Mensaje Editable */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-on-surface-variant">
                Mensaje de WhatsApp (100% editable)
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-outline font-semibold mr-1">Plantillas:</span>
                <button
                  type="button"
                  onClick={() => applyTemplate('podologia')}
                  className="px-2 py-0.5 rounded-md bg-primary-container/15 text-primary text-[10px] font-bold hover:bg-primary-container/25"
                >
                  Podología
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('control')}
                  className="px-2 py-0.5 rounded-md bg-secondary-container/40 text-secondary text-[10px] font-bold hover:bg-secondary-container/60"
                >
                  Post-Control
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('masaje')}
                  className="px-2 py-0.5 rounded-md bg-tertiary-container/20 text-tertiary text-[10px] font-bold hover:bg-tertiary-container/30"
                >
                  Masaje / Spa
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              placeholder="Escribe el mensaje personalizado para enviar por WhatsApp..."
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1 flex-wrap">
          <button
            type="button"
            onClick={handleSaveReminder}
            disabled={isSavingReminder}
            className="px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[17px]">save</span>
            <span>{isSavingReminder ? 'Guardando...' : 'Guardar Fecha y Mensaje'}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              dbService.updateClient(client.id, { reminderDate, reminderMessage });
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>Enviar Recordatorio por WhatsApp</span>
          </a>
        </div>
      </section>

      {/* Tarjetas de Acceso a Fichas Clínicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ficha Podológica Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-primary-container/30 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">footprint</span>
              </span>
              <h3 className="font-serif text-lg">Ficha Podológica</h3>
            </div>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              Mapeo anatómico podológico con marcadores visuales, protocolo para pie diabético,
              historial evolutivo de onicocriptosis/hiperqueratosis y consentimiento informado biométrico.
            </p>
          </div>
          <Link
            href={`/pacientes/${clientId}/podologia`}
            className="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold text-center hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>Abrir Ficha Podológica Completa</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {/* Ficha Masajes Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-secondary/30 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-secondary font-bold">
              <span className="w-8 h-8 rounded-full bg-secondary-container/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">spa</span>
              </span>
              <h3 className="font-serif text-lg">Ficha de Masoterapia</h3>
            </div>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              Mapa corporal interactivo de tensión (cervical, dorsal, lumbar), escala de presión
              preferida, selección de aromaterapia y registro de contraindicaciones.
            </p>
          </div>
          <Link
            href={`/pacientes/${clientId}/masaje`}
            className="w-full py-3 rounded-xl bg-secondary text-white text-xs font-bold text-center hover:bg-secondary/90 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>Abrir Ficha de Masajes Completa</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
