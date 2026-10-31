'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { dbService } from '@/lib/dbService';
import { Appointment, Client } from '@/types/database';

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
                    <span className="truncate">{client.email}</span>
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

        {/* Alerta Médica si aplica */}
        {client.hasMedicalAlert && (
          <div className="bg-error-container/40 border border-error/20 p-3.5 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-lg flex-shrink-0 mt-0.5">
              warning
            </span>
            <div>
              <span className="text-xs font-bold text-on-error-container block">
                Condición Médica de Cuidado
              </span>
              <p className="text-xs text-on-surface font-semibold mt-0.5">
                {client.medicalAlertDescription || 'Paciente con protocolo clínico especial.'}
              </p>
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

      {/* Historial de Visitas del Cliente */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary-container/15 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">history_edu</span>
            </span>
            <div>
              <h2 className="font-serif text-lg font-bold text-primary">
                Historial de Visitas & Atenciones
              </h2>
              <p className="text-xs text-on-surface-variant">
                Registro automático de cada cita, motivo, especialista que lo atendió y productos adquiridos
              </p>
            </div>
          </div>

          <Link
            href="/agenda"
            className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-bold text-primary hover:bg-surface-container transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">calendar_add_on</span>
            <span>Ir a Agenda</span>
          </Link>
        </div>

        {visits.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-2xl bg-surface-container-low border border-dashed border-surface-container-high space-y-2">
            <span className="material-symbols-outlined text-3xl text-outline">event_busy</span>
            <p className="text-xs font-bold text-on-surface">
              Este cliente aún no tiene visitas registradas en la agenda
            </p>
            <p className="text-[11px] text-on-surface-variant max-w-md mx-auto">
              Cuando agendes y finalices una cita para {client.name}, aparecerá aquí automáticamente con la fecha, tratamiento, especialista, motivo y productos comprados.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((visit, idx) => {
              const isCompleted = visit.status === 'completado';
              const isPodo = visit.discipline === 'podologia';
              const soldProducts = visit.soldProducts || [];
              const servicePrice =
                visit.servicePrice !== undefined
                  ? visit.servicePrice
                  : Math.max(0, (Number(visit.price) || 0) - (Number(visit.productsTotal) || 0));

              return (
                <article
                  key={visit.id}
                  className="p-4 rounded-2xl bg-surface-container-low/70 border border-surface-container-high/80 flex flex-col gap-3 hover:border-primary/30 transition-all"
                >
                  {/* Fila superior: # Visita, Fecha, Hora, Estado y Total */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface text-[11px] font-bold">
                        Visita #{visits.length - idx}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-primary bg-primary-container/10 px-2.5 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {formatReadableDate(visit.date)} · {visit.time}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : visit.status === 'en_curso'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {isCompleted
                          ? 'Atendida / Finalizada'
                          : visit.status === 'en_curso'
                          ? 'En Curso'
                          : 'Programada'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-serif text-base font-bold text-primary">
                        S/ {visit.price} PEN
                      </span>
                      {soldProducts.length > 0 && (
                        <span className="block text-[10px] text-emerald-700 font-bold">
                          (Servicio S/ {servicePrice} + Prod. S/ {visit.productsTotal || 0})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalle estructurado: Qué se le hizo, Quién lo atendió, Motivo/Notas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* Qué se le hizo */}
                    <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                        Qué se le realizó
                      </span>
                      <p className="text-xs font-bold text-on-surface mt-0.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-primary">
                          {isPodo ? 'footprint' : 'spa'}
                        </span>
                        <span>{visit.serviceName}</span>
                      </p>
                      <span className="text-[10px] text-on-surface-variant block mt-0.5">
                        {visit.durationMinutes} min · {visit.cabinName}
                      </span>
                    </div>

                    {/* Quién lo atendió */}
                    <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                        Atendido por
                      </span>
                      <p className="text-xs font-bold text-on-surface mt-0.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-secondary">
                          badge
                        </span>
                        <span>{visit.professionalName}</span>
                      </p>
                      <span className="text-[10px] text-on-surface-variant block mt-0.5">
                        {visit.professionalRole || 'Especialista'}
                      </span>
                    </div>

                    {/* Motivo / Observaciones */}
                    <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                        Motivo / Observaciones
                      </span>
                      <p className="text-xs text-on-surface mt-0.5 font-medium">
                        {visit.notes ? visit.notes : 'Control y atención de sesión regular.'}
                      </p>
                    </div>
                  </div>

                  {/* Productos comprados en la visita */}
                  {soldProducts.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">shopping_bag</span>
                          Productos adquiridos en esta sesión:
                        </span>
                        <span>Subtotal: S/ {visit.productsTotal || 0}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {soldProducts.map((item, i) => (
                          <span
                            key={`${item.productId}-${i}`}
                            className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[11px] font-semibold text-emerald-950"
                          >
                            {item.quantity}x {item.name} ({item.presentation}) — S/ {item.subtotal ?? item.unitPrice * item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
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
