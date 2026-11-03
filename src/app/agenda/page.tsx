'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '@/lib/dbService';
import { Appointment, Client, Professional } from '@/types/database';
import AppointmentBottomSheet from '@/components/AppointmentBottomSheet';
import NewAppointmentModal, { BLOCK_COLOR_PALETTE } from '@/components/NewAppointmentModal';
import FinalizeSessionModal from '@/components/FinalizeSessionModal';
import { formatTime12, formatHourSlot12 } from '@/lib/timeUtils';
import { getLocalDateStr } from '@/lib/dateUtils';
import { getAptPayments, getPaymentOption, isMixedPayment } from '@/lib/payments';

type ViewMode = 'calendar' | 'list';
type CalendarRange = 'dia' | 'semana' | 'quincena' | 'mensual';

const HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function toISODate(d: Date): string {
  return getLocalDateStr(d);
}

function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function getStartOfWeekMonday(dateStr: string): string {
  const d = parseISODate(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Lunes como inicio de semana
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

function getAppointmentHourKey(timeStr?: string): string {
  if (!timeStr) return '10:00';
  const hourPart = timeStr.slice(0, 2);
  const candidate = `${hourPart}:00`;
  if (HOURS.includes(candidate)) return candidate;
  return '10:00';
}

function getMinutesOfTime(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const min = parseInt(parts[1], 10);
    return isNaN(min) ? 0 : min;
  }
  return 0;
}

function getBlockColor(apt: Appointment): string {
  if (apt.blockColor) return apt.blockColor;
  if (apt.status === 'completado') return '#2E6F5E';
  return apt.discipline === 'podologia' ? '#7A4F3A' : '#B87B31';
}

const APPOINTMENT_TAG_PRESETS = [
  { label: 'Pendiente de reprogramar', color: '#D97706', icon: 'schedule' },
  { label: 'Confirmado por WhatsApp', color: '#059669', icon: 'chat' },
  { label: 'Por confirmar', color: '#EA580C', icon: 'hourglass_top' },
  { label: 'VIP / Prioritario', color: '#7C3AED', icon: 'star' },
  { label: 'Llegará tarde', color: '#DC2626', icon: 'warning' },
  { label: 'A domicilio', color: '#0284C7', icon: 'home' },
  { label: 'Esperando respuesta', color: '#4F46E5', icon: 'mark_chat_unread' },
];

const TAG_COLORS = [
  { id: '#D97706', label: 'Ámbar' },
  { id: '#059669', label: 'Verde' },
  { id: '#EA580C', label: 'Naranja' },
  { id: '#0284C7', label: 'Azul' },
  { id: '#7C3AED', label: 'Morado' },
  { id: '#DC2626', label: 'Rojo' },
  { id: '#DB2777', label: 'Rosa' },
  { id: '#4B5563', label: 'Gris' },
];

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [finalizingAppointment, setFinalizingAppointment] = useState<Appointment | null>(null);

  // Quick Tag Popover State
  const [taggingAppointment, setTaggingAppointment] = useState<Appointment | null>(null);
  const [tagInputText, setTagInputText] = useState('');
  const [tagInputColor, setTagInputColor] = useState('#D97706');

  const [filterProfessional, setFilterProfessional] = useState<string>('all');
  const [statusTab, setStatusTab] = useState<'activas' | 'finalizadas' | 'todas'>('activas');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarRange, setCalendarRange] = useState<CalendarRange>('semana');
  const [anchorDate, setAnchorDate] = useState<string>(() => toISODate(new Date()));
  // Modo compacto: colapsa las horas sin ninguna cita en el rango visible
  const [compactHours, setCompactHours] = useState<boolean>(true);

  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [slotDefaultDate, setSlotDefaultDate] = useState<string | undefined>(undefined);
  const [slotDefaultTime, setSlotDefaultTime] = useState<string | undefined>(undefined);

  // Drag & Drop States
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    date: string;
    hour: string;
    subSlot: '00' | '30';
  } | null>(null);
  const [repositionToast, setRepositionToast] = useState<{
    message: string;
    visible: boolean;
  } | null>(null);

  useEffect(() => {
    const savedView = localStorage.getItem('adranna_agenda_view') as ViewMode | null;
    if (savedView === 'calendar' || savedView === 'list') {
      setViewMode(savedView);
    }
    const savedRange = localStorage.getItem('adranna_agenda_range') as CalendarRange | null;
    if (savedRange && ['dia', 'semana', 'quincena', 'mensual'].includes(savedRange)) {
      setCalendarRange(savedRange);
    }
    const savedCompact = localStorage.getItem('adranna_agenda_compact');
    if (savedCompact === '0') setCompactHours(false);

    dbService.getAppointments().then(setAppointments);
    dbService.getClients().then(setClients);
    dbService.getProfessionals().then(setProfessionals);
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('adranna_agenda_view', mode);
  };

  const handleRangeChange = (range: CalendarRange) => {
    setCalendarRange(range);
    localStorage.setItem('adranna_agenda_range', range);
  };

  const byProfessional = useMemo(() => {
    return appointments.filter((apt) => {
      if (filterProfessional === 'all') return true;
      return apt.professionalName.toLowerCase().includes(filterProfessional.toLowerCase());
    });
  }, [appointments, filterProfessional]);

  const activeAppointments = useMemo(
    () => byProfessional.filter((apt) => apt.status !== 'completado' && apt.status !== 'cancelado'),
    [byProfessional]
  );
  const completedAppointments = useMemo(
    () => byProfessional.filter((apt) => apt.status === 'completado' || apt.status === 'cancelado'),
    [byProfessional]
  );

  const displayedAppointments = useMemo(() => {
    if (statusTab === 'todas') return byProfessional;
    return statusTab === 'activas' ? activeAppointments : completedAppointments;
  }, [statusTab, byProfessional, activeAppointments, completedAppointments]);

  // El calendario funciona como historial visual: SIEMPRE muestra todas las citas
  // (pasadas, finalizadas, pendientes y canceladas), sin depender de las pestañas de estado.
  const calendarAppointments = byProfessional;

  const handleAddAppointment = (newApt: Appointment) => {
    setAppointments((prev) => [newApt, ...prev]);
  };

  const handleUpdateAppointment = (updated: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelectedAppointment(null);
    setEditingAppointment(null);
  };

  const applyStatusChange = (apt: Appointment, newStatus: Appointment['status']) => {
    if (newStatus === 'completado') {
      // Abrir el modal de finalizar sesión con opción de venta de productos de inventario
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

  const handleStatusChange = (
    newStatus: Appointment['status'],
    updatedFields?: Partial<Appointment>
  ) => {
    if (!selectedAppointment) return;
    const mergedApt: Appointment = updatedFields
      ? { ...selectedAppointment, ...updatedFields }
      : selectedAppointment;
    if (updatedFields) {
      setAppointments((prev) => prev.map((a) => (a.id === mergedApt.id ? mergedApt : a)));
    }
    applyStatusChange(mergedApt, newStatus);
  };

  const handleQuickNotesSaved = (updatedApt: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === updatedApt.id ? updatedApt : a)));
    if (selectedAppointment?.id === updatedApt.id) {
      setSelectedAppointment(updatedApt);
    }
  };

  const handleSaveCustomTag = async (apt: Appointment, tagText: string, color: string) => {
    const cleanTag = tagText.trim();
    const updates: Partial<Appointment> = {
      customTag: cleanTag || undefined,
      tagColor: cleanTag ? color : undefined,
    };

    setAppointments((prev) =>
      prev.map((a) => (a.id === apt.id ? { ...a, ...updates } : a))
    );
    if (selectedAppointment?.id === apt.id) {
      setSelectedAppointment((prev) => (prev ? { ...prev, ...updates } : null));
    }
    await dbService.updateAppointment(apt.id, updates);
    setTaggingAppointment(null);
  };

  const handleColorChange = async (apt: Appointment, color: string) => {
    const updated = { ...apt, blockColor: color };
    setAppointments((prev) => prev.map((a) => (a.id === apt.id ? updated : a)));
    if (selectedAppointment?.id === apt.id) {
      setSelectedAppointment(updated);
    }
    await dbService.updateAppointment(apt.id, { blockColor: color });
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

  const openNewAtSlot = (dateStr: string, timeStr = '10:00') => {
    setEditingAppointment(null);
    setSlotDefaultDate(dateStr);
    setSlotDefaultTime(timeStr);
    setIsNewAppointmentOpen(true);
  };

  // Reprogramación por Arrastrar y Soltar (Drag & Drop)
  const handleDropAppointment = async (
    targetDate: string,
    targetHour: string,
    subSlot: '00' | '30'
  ) => {
    if (!draggedAppointment) return;
    const hourPart = targetHour.slice(0, 2);
    const newTime = `${hourPart}:${subSlot}`;

    // Si no cambió ni de fecha ni de hora, no hacer nada
    if (
      draggedAppointment.date === targetDate &&
      (draggedAppointment.time || '').startsWith(newTime)
    ) {
      setDraggedAppointment(null);
      setDragOverTarget(null);
      return;
    }

    const updatedApt: Appointment = {
      ...draggedAppointment,
      date: targetDate,
      time: newTime,
    };

    // Actualización inmediata optimista en el estado
    setAppointments((prev) =>
      prev.map((a) => (a.id === updatedApt.id ? updatedApt : a))
    );
    if (selectedAppointment?.id === updatedApt.id) {
      setSelectedAppointment(updatedApt);
    }
    const clientName = updatedApt.clientName;
    setDraggedAppointment(null);
    setDragOverTarget(null);

    // Notificación pro flotante
    setRepositionToast({
      message: `✓ Cita de ${clientName} movida a las ${formatTime12(newTime)} (${targetDate})`,
      visible: true,
    });
    setTimeout(() => {
      setRepositionToast((prev) => (prev ? { ...prev, visible: false } : null));
    }, 3800);

    // Guardar en Supabase y caché local
    await dbService.updateAppointment(updatedApt.id, {
      date: targetDate,
      time: newTime,
    });
  };

  const handleDropMonthAppointment = async (targetDate: string) => {
    if (!draggedAppointment) return;
    if (draggedAppointment.date === targetDate) {
      setDraggedAppointment(null);
      setDragOverTarget(null);
      return;
    }

    const updatedApt: Appointment = {
      ...draggedAppointment,
      date: targetDate,
    };

    setAppointments((prev) =>
      prev.map((a) => (a.id === updatedApt.id ? updatedApt : a))
    );
    if (selectedAppointment?.id === updatedApt.id) {
      setSelectedAppointment(updatedApt);
    }
    const clientName = updatedApt.clientName;
    const timeFormatted = formatTime12(updatedApt.time);
    setDraggedAppointment(null);
    setDragOverTarget(null);

    setRepositionToast({
      message: `✓ Cita de ${clientName} movida al ${targetDate} a las ${timeFormatted}`,
      visible: true,
    });
    setTimeout(() => {
      setRepositionToast((prev) => (prev ? { ...prev, visible: false } : null));
    }, 3800);

    await dbService.updateAppointment(updatedApt.id, {
      date: targetDate,
    });
  };

  // Navegación de fechas en el calendario
  const navigatePeriod = (dir: -1 | 1) => {
    if (calendarRange === 'dia') {
      setAnchorDate((prev) => addDays(prev, dir * 1));
    } else if (calendarRange === 'semana') {
      setAnchorDate((prev) => addDays(prev, dir * 7));
    } else if (calendarRange === 'quincena') {
      setAnchorDate((prev) => addDays(prev, dir * 15));
    } else {
      const d = parseISODate(anchorDate);
      d.setMonth(d.getMonth() + dir);
      setAnchorDate(toISODate(d));
    }
  };

  // Columnas de días para Día / Semana / Quincena
  const calendarDays = useMemo(() => {
    if (calendarRange === 'dia') {
      return [anchorDate];
    }
    if (calendarRange === 'semana') {
      const start = getStartOfWeekMonday(anchorDate);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    if (calendarRange === 'quincena') {
      return Array.from({ length: 15 }, (_, i) => addDays(anchorDate, i));
    }
    return [];
  }, [calendarRange, anchorDate]);

  // Celdas del mes para vista Mensual
  const monthCells = useMemo(() => {
    const d = parseISODate(anchorDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Lunes = 0 ... Domingo = 6
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      cells.push({
        dateStr: toISODate(prevDate),
        dayNum: prevDate.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const currDate = new Date(year, month, day);
      cells.push({
        dateStr: toISODate(currDate),
        dayNum: day,
        isCurrentMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      const nextIdx = cells.length - (startOffset + totalDays) + 1;
      const nextDate = new Date(year, month + 1, nextIdx);
      cells.push({
        dateStr: toISODate(nextDate),
        dayNum: nextDate.getDate(),
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [anchorDate]);

  const periodLabel = useMemo(() => {
    const d = parseISODate(anchorDate);
    if (calendarRange === 'dia') {
      return d.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    if (calendarRange === 'semana' || calendarRange === 'quincena') {
      const first = parseISODate(calendarDays[0] || anchorDate);
      const last = parseISODate(calendarDays[calendarDays.length - 1] || anchorDate);
      return `${first.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
      })} — ${last.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`;
    }
    return d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  }, [calendarRange, anchorDate, calendarDays]);

  const renderAppointmentCard = (apt: Appointment, totalInSlot: number) => {
    const bgColor = getBlockColor(apt);
    const isDone = apt.status === 'completado';
    const isCancelled = apt.status === 'cancelado';
    const isBeingDragged = draggedAppointment?.id === apt.id;
    const isSideBySide = totalInSlot > 1;

    return (
      <div
        key={apt.id}
        data-apt-card="true"
        draggable={true}
        onDragStart={(e) => {
          setDraggedAppointment(apt);
          e.dataTransfer.setData('text/plain', apt.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          setDraggedAppointment(null);
          setDragOverTarget(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedAppointment(apt);
        }}
        style={{ backgroundColor: bgColor }}
        className={`flex-1 min-w-0 rounded-xl p-2 text-white shadow-xs hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing border border-white/20 flex flex-col justify-between gap-1 relative group/card select-none ${
          isBeingDragged
            ? 'opacity-30 scale-95 ring-2 ring-white border-dashed'
            : 'hover:-translate-y-0.5 hover:brightness-105'
        } ${
          isCancelled
            ? 'opacity-40 grayscale hover:opacity-70 line-through decoration-white/70'
            : isDone
            ? 'opacity-50 saturate-50 hover:opacity-90 hover:saturate-100'
            : ''
        }`}
        title={`${isDone ? '✓ Finalizada • ' : isCancelled ? '✕ Cancelada • ' : 'Arrastra para reprogramar • '}${apt.clientName} - ${apt.serviceName} (${formatTime12(apt.time)})`}
      >
        {/* Barra superior con hora, iconos y botones de acción rápida en hover */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="material-symbols-outlined text-[12px] opacity-60 group-hover/card:opacity-100 flex-shrink-0 cursor-grab active:cursor-grabbing"
              title="Arrastra para mover"
            >
              drag_indicator
            </span>
            <span className="text-[10px] font-bold tracking-tight bg-black/25 px-1.5 py-0.2 rounded-md whitespace-nowrap">
              {formatTime12(apt.time)}
            </span>
            {apt.hasMedicalAlert && (
              <span
                className="material-symbols-outlined text-[12px] text-amber-200 flex-shrink-0"
                title="Alerta médica activa"
              >
                warning
              </span>
            )}
            {isDone && (
              <span
                className="material-symbols-outlined text-[12px] text-emerald-200 flex-shrink-0"
                title="Sesión completada"
              >
                task_alt
              </span>
            )}
          </div>

          {/* Acciones Rápidas flotantes en hover */}
          <div className="opacity-0 group-hover/card:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTaggingAppointment(apt);
                setTagInputText(apt.customTag || '');
                setTagInputColor(apt.tagColor || '#D97706');
              }}
              title={apt.customTag ? `Etiqueta: "${apt.customTag}" (clic para cambiarla)` : 'Agregar etiqueta a esta cita'}
              className={`w-4 h-4 rounded text-white flex items-center justify-center transition-colors shadow-2xs ${
                apt.customTag ? 'bg-amber-600/90 hover:bg-amber-600' : 'bg-black/30 hover:bg-black/50'
              }`}
            >
              <span className="material-symbols-outlined text-[11px]">label</span>
            </button>
            {!isDone && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  applyStatusChange(apt, 'completado');
                }}
                title="Finalizar sesión"
                className="w-4 h-4 rounded bg-emerald-600/90 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[11px]">check</span>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEditAppointment(apt);
              }}
              title="Editar cita"
              className="w-4 h-4 rounded bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors shadow-2xs"
            >
              <span className="material-symbols-outlined text-[11px]">edit</span>
            </button>
          </div>
        </div>

        {/* Nombre del Cliente y Servicio */}
        <div className="min-w-0">
          <h4 className={`font-bold text-white drop-shadow-2xs truncate ${isSideBySide ? 'text-[11px]' : 'text-xs'}`}>
            {apt.clientName}
          </h4>
          <p className="text-[10px] text-white/90 truncate font-medium">
            {apt.discipline === 'masaje' ? '💆‍♀️ ' : '🦶 '}
            {apt.serviceName}
          </p>

          {/* Etiqueta visible en el calendario (ej. "Pendiente de reprogramar") */}
          {apt.customTag ? (
            <div className="mt-1">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setTaggingAppointment(apt);
                  setTagInputText(apt.customTag || '');
                  setTagInputColor(apt.tagColor || '#D97706');
                }}
                style={{ backgroundColor: apt.tagColor || '#D97706' }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold text-white shadow-2xs max-w-full truncate hover:brightness-110 cursor-pointer transition-all"
                title={`Etiqueta: "${apt.customTag}" (clic para cambiarla)`}
              >
                <span className="material-symbols-outlined text-[10px]">label</span>
                <span className="truncate">{apt.customTag}</span>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTaggingAppointment(apt);
                setTagInputText('');
                setTagInputColor('#D97706');
              }}
              className="opacity-0 group-hover/card:opacity-90 mt-1 text-[8px] font-bold text-white/90 hover:text-white flex items-center gap-0.5 bg-black/25 px-1 py-0.2 rounded w-fit transition-opacity"
              title="Agregar etiqueta"
            >
              <span className="material-symbols-outlined text-[9px]">add</span>
              <span>Etiqueta</span>
            </button>
          )}
        </div>

        {/* Pie de la tarjeta: Profesional y Precio */}
        <div className="flex items-center justify-between gap-1 text-[9px] text-white/90 pt-1 border-t border-white/20">
          <span className="truncate flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0"></span>
            <span className="truncate">{apt.professionalName}</span>
          </span>
          <span className="font-bold flex-shrink-0 bg-white/20 px-1 py-0.2 rounded text-[9px]">
            S/{apt.price}
          </span>
        </div>
      </div>
    );
  };

  const todayISO = toISODate(new Date());

  const toggleCompactHours = () => {
    setCompactHours((prev) => {
      const next = !prev;
      localStorage.setItem('adranna_agenda_compact', next ? '1' : '0');
      return next;
    });
  };

  // Horas que tienen al menos una cita en algún día del rango visible
  const visibleDaysSet = new Set(calendarDays);
  const busyHours = new Set(
    calendarAppointments
      .filter((a) => visibleDaysSet.has(a.date || todayISO))
      .map((a) => getAppointmentHourKey(a.time))
  );
  const isHourCollapsed = (hour: string) =>
    compactHours &&
    !busyHours.has(hour) &&
    !(draggedAppointment && dragOverTarget?.hour === hour);
  const collapsedCount = HOURS.filter((h) => compactHours && !busyHours.has(h)).length;

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      {/* Header Agenda */}
      <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
            Agenda & Calendario por Bloques
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {activeAppointments.length} por atender · {completedAppointments.length} finalizadas · Haz clic en cualquier cuadro vacío para agendar
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector Vista Calendario (Excel) vs Lista */}
          <div className="inline-flex bg-surface-container p-1 rounded-xl border border-surface-container-high">
            <button
              type="button"
              onClick={() => handleViewModeChange('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'calendar'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">grid_on</span>
              <span>Calendario Bloques</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_agenda</span>
              <span>Lista</span>
            </button>
          </div>

          <button
            onClick={() => openNewAtSlot(anchorDate, '10:00')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white shadow-sm hover:bg-primary-container active:scale-95 transition-all text-xs font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* En vista calendario: leyenda (el calendario siempre muestra todo como historial visual) */}
      {viewMode === 'calendar' && (
        <div className="flex items-center gap-3 flex-wrap bg-surface-container-low px-3 py-2 rounded-2xl border border-surface-container-high text-[11px] font-semibold text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#7A4F3A]"></span>
            Por atender ({activeAppointments.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#7A4F3A] opacity-50 saturate-50"></span>
            <span className="material-symbols-outlined text-[13px] text-emerald-700">task_alt</span>
            Finalizada · color tenue ({completedAppointments.filter((a) => a.status === 'completado').length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#7A4F3A] opacity-40 grayscale"></span>
            <span className="line-through">Cancelada</span>
          </span>

          {calendarRange !== 'mensual' && (
            <div className="ml-auto flex items-center gap-2">
              {compactHours && collapsedCount > 0 && (
                <span className="hidden sm:inline text-[10px] text-outline font-medium">
                  {collapsedCount} {collapsedCount === 1 ? 'hora vacía compactada' : 'horas vacías compactadas'}
                </span>
              )}
              <div className="inline-flex bg-surface-container p-0.5 rounded-lg border border-surface-container-high">
                <button
                  type="button"
                  onClick={() => !compactHours && toggleCompactHours()}
                  title="Compacta las horas sin citas"
                  className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                    compactHours ? 'bg-primary text-white shadow-2xs' : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">compress</span>
                  Compacto
                </button>
                <button
                  type="button"
                  onClick={() => compactHours && toggleCompactHours()}
                  title="Muestra todas las horas en tamaño completo"
                  className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                    !compactHours ? 'bg-primary text-white shadow-2xs' : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">expand</span>
                  Expandido
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pestañas de Estado: Por Atender / Finalizadas / Todas (solo en vista lista) */}
      {viewMode === 'list' && (
      <div className="grid grid-cols-3 bg-surface-container p-1 rounded-2xl border border-surface-container-high text-xs font-bold">
        <button
          type="button"
          onClick={() => setStatusTab('activas')}
          className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
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
          className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
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

        <button
          type="button"
          onClick={() => setStatusTab('todas')}
          className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            statusTab === 'todas'
              ? 'bg-surface-container-lowest text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">calendar_month</span>
          <span>Ver Todas</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-container-high text-on-surface-variant">
            {byProfessional.length}
          </span>
        </button>
      </div>
      )}

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
            <span>Todos los Especialistas</span>
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

      {/* ═══════════════════════════════════════════════════════════════════════
          VISTA CALENDARIO POR BLOQUES (TIPO EXCEL)
         ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'calendar' && (
        <section className="bg-surface-container-lowest rounded-3xl border border-surface-container-high shadow-xs overflow-hidden flex flex-col">
          {/* Barra de Herramientas del Calendario: Rango (Día / Semana / 15 Días / Mensual) + Navegación */}
          <div className="p-3.5 sm:p-4 bg-surface-container-low border-b border-surface-container-high flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Selector Día, Semana, Quincena, Mensual */}
            <div className="inline-flex bg-surface-container p-1 rounded-xl border border-surface-container-high self-start">
              {(
                [
                  { id: 'dia', label: 'Día', icon: 'view_day' },
                  { id: 'semana', label: 'Semana', icon: 'view_week' },
                  { id: 'quincena', label: 'Quincena (15d)', icon: 'date_range' },
                  { id: 'mensual', label: 'Mensual', icon: 'calendar_View_month' },
                ] as { id: CalendarRange; label: string; icon: string }[]
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRangeChange(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    calendarRange === r.id
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <span>{r.label}</span>
                </button>
              ))}
            </div>

            {/* Controles de fecha: Anterior / Hoy / Siguiente + Selector de fecha */}
            <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-surface-container-lowest border border-surface-container-high rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => navigatePeriod(-1)}
                  className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface"
                  title="Periodo anterior"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnchorDate(todayISO)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-primary hover:bg-primary-container/15 transition-colors"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => navigatePeriod(1)}
                  className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface"
                  title="Periodo siguiente"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

              <span className="font-serif text-sm sm:text-base font-bold text-primary capitalize px-1">
                {periodLabel}
              </span>

              <input
                type="date"
                value={anchorDate}
                onChange={(e) => e.target.value && setAnchorDate(e.target.value)}
                className="bg-surface-container-lowest border border-surface-container-high rounded-xl px-2.5 py-1.5 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                title="Saltar a fecha específica"
              />
            </div>
          </div>

          {/* Leyenda de Colores Personalizables y Guía Pro */}
          <div className="px-4 py-2.5 bg-surface-container-lowest border-b border-surface-container-high/60 flex items-center justify-between gap-3 flex-wrap text-[11px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-outline uppercase tracking-wider text-[10px]">
                Colores de bloque:
              </span>
              {BLOCK_COLOR_PALETTE.slice(0, 6).map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 text-on-surface-variant font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: c.id }} />
                  <span>{c.label.split(' ')[0]}</span>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-outline text-[11px] font-medium flex-wrap">
              <span className="flex items-center gap-1 text-primary font-bold">
                <span className="material-symbols-outlined text-[15px]">drag_indicator</span>
                Arrastra y suelta para reprogramar
              </span>
              <span>• Citas a las <strong>:30</strong> a la mitad del bloque</span>
              <span>• Citas simultáneas <strong>lado a lado</strong></span>
            </div>
          </div>

          {/* ── GRILLA EXCEL: DÍA / SEMANA / QUINCENA (HORAS × DÍAS) ─────────── */}
          {calendarRange !== 'mensual' ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse min-w-[680px] table-fixed">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-container-high">
                    <th className="w-16 sm:w-20 py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider text-outline border-r border-surface-container-high text-center sticky left-0 bg-surface-container-low z-10">
                      Hora
                    </th>
                    {calendarDays.map((dStr) => {
                      const dObj = parseISODate(dStr);
                      const isToday = dStr === todayISO;
                      const dayAptsCount = calendarAppointments.filter(
                        (a) => (a.date || todayISO) === dStr
                      ).length;

                      return (
                        <th
                          key={dStr}
                          className={`py-2 px-1.5 border-r border-surface-container-high text-center ${
                            calendarRange === 'quincena' ? 'w-28' : ''
                          } ${isToday ? 'bg-primary-container/15' : ''}`}
                        >
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-[10px] font-bold uppercase ${
                                isToday ? 'text-primary' : 'text-outline'
                              }`}
                            >
                              {DAY_NAMES_SHORT[dObj.getDay()]}
                            </span>
                            <span
                              className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center font-serif text-sm font-bold ${
                                isToday
                                  ? 'bg-primary text-white shadow-2xs'
                                  : 'text-on-surface'
                              }`}
                            >
                              {dObj.getDate()}
                            </span>
                            {dayAptsCount > 0 && (
                              <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant">
                                {dayAptsCount} {dayAptsCount === 1 ? 'cita' : 'citas'}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/70">
                  {HOURS.map((hour) =>
                    isHourCollapsed(hour) ? (
                      /* ── FILA COMPACTA: hora sin citas en el rango visible ── */
                      <tr key={hour} className="group/row">
                        <td className="py-0.5 px-2 text-center font-mono text-[10px] font-semibold text-outline/70 border-r border-surface-container-high bg-surface-container-low/40 sticky left-0 z-10 whitespace-nowrap">
                          {formatHourSlot12(hour)}
                        </td>
                        {calendarDays.map((dStr) => (
                          <td
                            key={`${dStr}-${hour}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              // Al arrastrar encima, la fila se expande para soltar en :00 o :30
                              setDragOverTarget({ date: dStr, hour, subSlot: '00' });
                            }}
                            onClick={() => openNewAtSlot(dStr, `${hour.slice(0, 2)}:00`)}
                            className={`h-7 p-0 border-r border-surface-container-high/70 cursor-pointer transition-colors group/ccell hover:bg-primary-container/10 ${
                              dStr === todayISO ? 'bg-primary-container/[0.04]' : ''
                            }`}
                            title={`Agendar ${formatTime12(`${hour.slice(0, 2)}:00`)}`}
                          >
                            <div className="h-full flex items-center justify-center gap-1 text-[10px] text-outline font-semibold opacity-0 group-hover/ccell:opacity-100 transition-opacity pointer-events-none">
                              <span className="material-symbols-outlined text-[12px]">add</span>
                              <span>{formatTime12(`${hour.slice(0, 2)}:00`)}</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ) : (
                    <tr key={hour} className="group/row hover:bg-surface-container-low/30">
                      {/* Columna fija de hora tipo hoja de cálculo */}
                      <td className="py-2 px-2 text-center font-mono text-xs font-bold text-on-surface-variant border-r border-surface-container-high bg-surface-container-low/60 sticky left-0 z-10 whitespace-nowrap">
                        {formatHourSlot12(hour)}
                      </td>

                      {/* Celdas por cada día */}
                      {calendarDays.map((dStr) => {
                        const cellApts = calendarAppointments.filter(
                          (a) =>
                            (a.date || todayISO) === dStr &&
                            getAppointmentHourKey(a.time) === hour
                        );
                        const isToday = dStr === todayISO;

                        // Separar citas que inician en :00 (min 0 a 29) y en :30 (min 30 a 59)
                        const topSlotApts = cellApts.filter(
                          (a) => getMinutesOfTime(a.time) < 30
                        );
                        const bottomSlotApts = cellApts.filter(
                          (a) => getMinutesOfTime(a.time) >= 30
                        );

                        const isHoveredTop =
                          dragOverTarget?.date === dStr &&
                          dragOverTarget?.hour === hour &&
                          dragOverTarget?.subSlot === '00';

                        const isHoveredBottom =
                          dragOverTarget?.date === dStr &&
                          dragOverTarget?.hour === hour &&
                          dragOverTarget?.subSlot === '30';

                        return (
                          <td
                            key={`${dStr}-${hour}`}
                            className={`p-1 align-top border-r border-surface-container-high/70 min-w-[150px] transition-colors relative group/cell ${
                              isToday ? 'bg-primary-container/[0.04]' : ''
                            }`}
                          >
                            <div className="flex flex-col min-h-[110px] justify-between relative gap-1">
                              {/* ── SUB-SLOT SUPERIOR (:00 a :29) ── */}
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                  if (
                                    dragOverTarget?.date !== dStr ||
                                    dragOverTarget?.hour !== hour ||
                                    dragOverTarget?.subSlot !== '00'
                                  ) {
                                    setDragOverTarget({ date: dStr, hour, subSlot: '00' });
                                  }
                                }}
                                onDragLeave={(e) => {
                                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                    if (
                                      dragOverTarget?.date === dStr &&
                                      dragOverTarget?.hour === hour &&
                                      dragOverTarget?.subSlot === '00'
                                    ) {
                                      setDragOverTarget(null);
                                    }
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleDropAppointment(dStr, hour, '00');
                                }}
                                onClick={(e) => {
                                  if ((e.target as HTMLElement).closest('[data-apt-card]')) return;
                                  openNewAtSlot(dStr, `${hour.slice(0, 2)}:00`);
                                }}
                                className={`min-h-[50px] flex-1 rounded-xl p-1 transition-all duration-150 flex flex-col justify-center relative cursor-pointer ${
                                  isHoveredTop
                                    ? 'bg-primary-container/25 ring-2 ring-primary border-2 border-dashed border-primary shadow-md'
                                    : topSlotApts.length === 0
                                    ? 'hover:bg-primary-container/10 border border-transparent hover:border-dashed hover:border-primary/30'
                                    : ''
                                }`}
                              >
                                {isHoveredTop && (
                                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-primary/20 backdrop-blur-[1px] rounded-xl border-2 border-dashed border-primary pointer-events-none animate-in fade-in duration-150">
                                    <span className="px-2 py-0.5 rounded-lg bg-primary text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                                      <span>{formatTime12(`${hour.slice(0, 2)}:00`)}</span>
                                    </span>
                                  </div>
                                )}

                                {topSlotApts.length === 0 && !isHoveredTop && (
                                  <div className="opacity-0 group-hover/cell:opacity-100 flex items-center justify-center gap-1 text-[10px] text-outline font-semibold transition-opacity pointer-events-none">
                                    <span className="material-symbols-outlined text-[13px]">add</span>
                                    <span>{formatTime12(`${hour.slice(0, 2)}:00`)}</span>
                                  </div>
                                )}

                                {topSlotApts.length > 0 && (
                                  <div className="flex flex-row gap-1.5 w-full h-full items-stretch">
                                    {topSlotApts.map((apt) =>
                                      renderAppointmentCard(apt, topSlotApts.length)
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* ── LÍNEA GUÍA DIVISIONAL DE MEDIO BLOQUE (:30) ── */}
                              <div className="relative w-full border-t border-dashed border-outline-variant/35 flex items-center justify-end my-0.5 pointer-events-none">
                                <span className="text-[8px] font-mono font-bold text-outline/50 px-1 rounded bg-surface-container-low/70 -mt-2">
                                  :30
                                </span>
                              </div>

                              {/* ── SUB-SLOT INFERIOR (:30 a :59) ── */}
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                  if (
                                    dragOverTarget?.date !== dStr ||
                                    dragOverTarget?.hour !== hour ||
                                    dragOverTarget?.subSlot !== '30'
                                  ) {
                                    setDragOverTarget({ date: dStr, hour, subSlot: '30' });
                                  }
                                }}
                                onDragLeave={(e) => {
                                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                    if (
                                      dragOverTarget?.date === dStr &&
                                      dragOverTarget?.hour === hour &&
                                      dragOverTarget?.subSlot === '30'
                                    ) {
                                      setDragOverTarget(null);
                                    }
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleDropAppointment(dStr, hour, '30');
                                }}
                                onClick={(e) => {
                                  if ((e.target as HTMLElement).closest('[data-apt-card]')) return;
                                  openNewAtSlot(dStr, `${hour.slice(0, 2)}:30`);
                                }}
                                className={`min-h-[50px] flex-1 rounded-xl p-1 transition-all duration-150 flex flex-col justify-center relative cursor-pointer ${
                                  isHoveredBottom
                                    ? 'bg-primary-container/25 ring-2 ring-primary border-2 border-dashed border-primary shadow-md'
                                    : bottomSlotApts.length === 0
                                    ? 'hover:bg-primary-container/10 border border-transparent hover:border-dashed hover:border-primary/30'
                                    : ''
                                }`}
                              >
                                {isHoveredBottom && (
                                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-primary/20 backdrop-blur-[1px] rounded-xl border-2 border-dashed border-primary pointer-events-none animate-in fade-in duration-150">
                                    <span className="px-2 py-0.5 rounded-lg bg-primary text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                                      <span>{formatTime12(`${hour.slice(0, 2)}:30`)}</span>
                                    </span>
                                  </div>
                                )}

                                {bottomSlotApts.length === 0 && !isHoveredBottom && (
                                  <div className="opacity-0 group-hover/cell:opacity-100 flex items-center justify-center gap-1 text-[10px] text-outline font-semibold transition-opacity pointer-events-none">
                                    <span className="material-symbols-outlined text-[13px]">add</span>
                                    <span>{formatTime12(`${hour.slice(0, 2)}:30`)}</span>
                                  </div>
                                )}

                                {bottomSlotApts.length > 0 && (
                                  <div className="flex flex-row gap-1.5 w-full h-full items-stretch">
                                    {bottomSlotApts.map((apt) =>
                                      renderAppointmentCard(apt, bottomSlotApts.length)
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── GRILLA MENSUAL POR BLOQUES ──────────────────────────────────── */
            <div className="w-full overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-7 bg-surface-container-low border-b border-surface-container-high text-center">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dName) => (
                    <div
                      key={dName}
                      className="py-2 text-[11px] font-bold uppercase tracking-wider text-outline border-r last:border-r-0 border-surface-container-high"
                    >
                      {dName}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-surface-container-high">
                  {monthCells.map((cell) => {
                    const dayApts = calendarAppointments
                      .filter((a) => (a.date || todayISO) === cell.dateStr)
                      .sort((a, b) => a.time.localeCompare(b.time));
                    const isToday = cell.dateStr === todayISO;
                    const isHovered = dragOverTarget?.date === cell.dateStr;

                    return (
                      <div
                        key={cell.dateStr}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverTarget?.date !== cell.dateStr) {
                            setDragOverTarget({ date: cell.dateStr, hour: '10:00', subSlot: '00' });
                          }
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            if (dragOverTarget?.date === cell.dateStr) {
                              setDragOverTarget(null);
                            }
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropMonthAppointment(cell.dateStr);
                        }}
                        onClick={() => openNewAtSlot(cell.dateStr, '10:00')}
                        className={`min-h-[115px] p-1.5 flex flex-col gap-1 transition-all cursor-pointer group/mcell relative ${
                          cell.isCurrentMonth
                            ? 'bg-surface-container-lowest'
                            : 'bg-surface-container-low/50 opacity-60'
                        } ${
                          isHovered
                            ? 'ring-2 ring-primary bg-primary-container/20 border-2 border-dashed border-primary shadow-sm'
                            : isToday
                            ? 'ring-2 ring-inset ring-primary/50 bg-primary-container/5'
                            : ''
                        } hover:bg-primary-container/10`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                              isToday
                                ? 'bg-primary text-white'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            {cell.dayNum}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNewAtSlot(cell.dateStr, '10:00');
                            }}
                            className="opacity-0 group-hover/mcell:opacity-100 w-5 h-5 rounded bg-primary text-white flex items-center justify-center text-xs"
                            title={`Agendar el ${cell.dateStr}`}
                          >
                            +
                          </button>
                        </div>

                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[88px]">
                          {dayApts.map((apt) => {
                            const bgColor = getBlockColor(apt);
                            const isBeingDragged = draggedAppointment?.id === apt.id;
                            const mDone = apt.status === 'completado';
                            const mCancelled = apt.status === 'cancelado';
                            return (
                              <div
                                key={apt.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  setDraggedAppointment(apt);
                                  e.dataTransfer.setData('text/plain', apt.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => {
                                  setDraggedAppointment(null);
                                  setDragOverTarget(null);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppointment(apt);
                                }}
                                style={{ backgroundColor: bgColor }}
                                className={`px-2 py-1 rounded-lg text-[10px] text-white font-semibold shadow-2xs hover:brightness-110 cursor-grab active:cursor-grabbing flex items-center justify-between gap-1 transition-all ${
                                  isBeingDragged
                                    ? 'opacity-30 scale-95 border border-dashed border-white'
                                    : ''
                                } ${
                                  mCancelled
                                    ? 'opacity-40 grayscale line-through hover:opacity-70'
                                    : mDone
                                    ? 'opacity-50 saturate-50 hover:opacity-90 hover:saturate-100'
                                    : ''
                                }`}
                                title={`${mDone ? '✓ Finalizada • ' : mCancelled ? '✕ Cancelada • ' : 'Arrastra a otro día • '}${formatTime12(apt.time)} - ${apt.clientName} (${apt.serviceName})`}
                              >
                                <span className="truncate flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[10px] opacity-70">
                                    {mDone ? 'task_alt' : 'drag_indicator'}
                                  </span>
                                  <span className="font-bold">{formatTime12(apt.time)}</span>
                                  <span className="truncate">{apt.clientName}</span>
                                  {apt.customTag && (
                                    <span
                                      style={{ backgroundColor: apt.tagColor || '#D97706' }}
                                      className="text-[8px] font-extrabold px-1 rounded text-white truncate max-w-[65px]"
                                      title={apt.customTag}
                                    >
                                      {apt.customTag}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[9px] opacity-90 font-bold flex-shrink-0">
                                  S/{apt.price}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VISTA DE LISTA CLÁSICA
         ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="mt-1 flex flex-col gap-3">
          {displayedAppointments.length === 0 ? (
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
                    ? 'Todas las sesiones fueron atendidas o puedes agendar una nueva cita.'
                    : 'Las citas que marques como finalizadas aparecerán aquí como historial.'}
                </span>
              </div>
              {statusTab === 'activas' && (
                <button
                  onClick={() => openNewAtSlot(anchorDate, '10:00')}
                  className="mt-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container transition-all"
                >
                  + Agendar Cita
                </button>
              )}
            </div>
          ) : (
            displayedAppointments.map((apt) => {
              const isPodo = apt.discipline === 'podologia';
              const isCompleted = apt.status === 'completado';
              const blockColor = getBlockColor(apt);
              return (
                <div key={apt.id} className="flex gap-3 items-start">
                  <div className="w-16 flex-shrink-0 text-right pt-2">
                    <span className="text-xs font-bold text-on-surface font-serif block whitespace-nowrap">
                      {formatTime12(apt.time)}
                    </span>
                    <span className="text-[10px] text-outline font-semibold">
                      {apt.date?.slice(5) || ''}
                    </span>
                  </div>

                  <div
                    onClick={() => setSelectedAppointment(apt)}
                    className={`flex-1 bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 cursor-pointer transition-all hover:shadow-md relative overflow-hidden ${
                      isCompleted ? 'opacity-85' : ''
                    }`}
                  >
                    <div
                      style={{ backgroundColor: blockColor }}
                      className="absolute left-0 top-0 bottom-0 w-2"
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
                          {apt.customTag && (
                            <span
                              style={{ backgroundColor: apt.tagColor || '#D97706' }}
                              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white shadow-2xs flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[11px]">label</span>
                              <span>{apt.customTag}</span>
                            </span>
                          )}
                          {apt.soldProducts && apt.soldProducts.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                              +{apt.soldProducts.length} prod.
                            </span>
                          )}
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

                        <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant flex-wrap">
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

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            apt.status === 'en_curso'
                              ? 'bg-amber-100 text-amber-800'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {apt.status === 'en_curso'
                            ? 'En Curso'
                            : isCompleted
                            ? 'Finalizada'
                            : 'Confirmada'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {isCompleted && (
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {getAptPayments(apt).map((p) => {
                                const opt = getPaymentOption(p.method);
                                const mixed = isMixedPayment(apt);
                                return (
                                  <span
                                    key={p.method}
                                    title={`Pagado con ${opt.label}: S/ ${Number(p.amount).toFixed(2)}`}
                                    className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-0.5 ${opt.badgeClass}`}
                                  >
                                    <span className="material-symbols-outlined text-[11px]">{opt.icon}</span>
                                    <span>{opt.shortLabel}</span>
                                    {mixed && <span className="opacity-80">· S/{Number(p.amount)}</span>}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <span className="text-xs font-bold text-primary">
                            S/ {apt.price}
                          </span>
                        </div>

                        {/* Acción rápida en 1 toque */}
                        {!isCompleted ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFinalizingAppointment(apt);
                            }}
                            title="Finalizar sesión y consultar compra de productos"
                            className="mt-0.5 px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 active:scale-95 transition-all flex items-center gap-1 shadow-2xs"
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
                            className="mt-0.5 px-2 py-1 rounded-lg bg-surface-container-high text-on-surface-variant text-[10px] font-bold hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">replay</span>
                            <span>Reabrir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Sheet Appointment Detail */}
      <AppointmentBottomSheet
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onStatusChange={handleStatusChange}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
        onColorChange={handleColorChange}
        onQuickNotesSaved={handleQuickNotesSaved}
      />

      {/* Modal Finalizar Sesión + Venta de Productos de Inventario */}
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
        onClose={() => {
          setIsNewAppointmentOpen(false);
          setEditingAppointment(null);
          setSlotDefaultDate(undefined);
          setSlotDefaultTime(undefined);
        }}
        clients={clients}
        onAddAppointment={handleAddAppointment}
        onUpdateAppointment={handleUpdateAppointment}
        editingAppointment={editingAppointment}
        defaultDate={slotDefaultDate}
        defaultTime={slotDefaultTime}
      />

      {/* ── MODAL FLOTANTE DE ETIQUETA RÁPIDA ── */}
      {taggingAppointment && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-md p-5 shadow-2xl border border-surface-container-high space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">label</span>
                </span>
                <div>
                  <h3 className="font-serif text-base font-bold text-primary">
                    Etiqueta de la Cita
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    {taggingAppointment.clientName} · {formatTime12(taggingAppointment.time)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTaggingAppointment(null)}
                className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Presets rápidos en 1 clic */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant block">
                Etiquetas sugeridas (1 clic):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {APPOINTMENT_TAG_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setTagInputText(p.label);
                      setTagInputColor(p.color);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border ${
                      tagInputText === p.label
                        ? 'ring-2 ring-primary text-white shadow-xs'
                        : 'bg-surface-container-low text-on-surface hover:border-primary/40'
                    }`}
                    style={tagInputText === p.label ? { backgroundColor: p.color, borderColor: p.color } : undefined}
                  >
                    <span className="material-symbols-outlined text-[13px]">{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Escribir etiqueta personalizada */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant block">
                O escribe cualquier texto personalizado:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 material-symbols-outlined text-[16px] text-outline">
                  edit_note
                </span>
                <input
                  type="text"
                  placeholder="Ej. Pendiente de reprogramar, Por confirmar..."
                  value={tagInputText}
                  onChange={(e) => setTagInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCustomTag(taggingAppointment, tagInputText, tagInputColor);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Selector de color de la etiqueta */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant block">
                Color de la etiqueta:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTagInputColor(c.id)}
                    style={{ backgroundColor: c.id }}
                    title={c.label}
                    className={`w-6 h-6 rounded-lg transition-transform flex items-center justify-center text-white ${
                      tagInputColor === c.id ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {tagInputColor === c.id && (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Vista previa */}
            {tagInputText.trim() && (
              <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-xs">
                <span className="text-[11px] text-outline font-medium">Vista previa en calendario:</span>
                <span
                  style={{ backgroundColor: tagInputColor }}
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white shadow-2xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[11px]">label</span>
                  <span>{tagInputText.trim()}</span>
                </span>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex items-center justify-between pt-2 border-t border-surface-container-high gap-2">
              {taggingAppointment.customTag ? (
                <button
                  type="button"
                  onClick={() => handleSaveCustomTag(taggingAppointment, '', tagInputColor)}
                  className="px-3 py-2 rounded-xl bg-error-container/30 text-error hover:bg-error-container/60 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">label_off</span>
                  <span>Quitar etiqueta</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTaggingAppointment(null)}
                  className="px-3 py-2 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-bold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomTag(taggingAppointment, tagInputText, tagInputColor)}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Guardar Etiqueta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast flotante interactivo de confirmación de reprogramación */}
      {repositionToast && repositionToast.visible && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="w-6 h-6 rounded-full bg-emerald-500/25 text-emerald-300 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
          </span>
          <span className="text-xs font-bold tracking-tight">{repositionToast.message}</span>
        </div>
      )}
    </div>
  );
}
