'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dbService } from '@/lib/dbService';
import { Client } from '@/types/database';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const PALETTE = [
  'bg-primary-container/20 text-primary',
  'bg-secondary-container/40 text-secondary',
  'bg-tertiary-container/30 text-tertiary',
];
function avatarColor(id: string) {
  const n = id.charCodeAt(id.length - 1) % PALETTE.length;
  return PALETTE[n];
}

// Sin etiquetas predefinidas: el usuario crea las que necesite.
const DEFAULT_TAGS: string[] = [];
const PAGE_SIZE = 40;
const TAGS_VERSION = 'v2-sin-predefinidas';

function getStoredTags(): string[] {
  if (typeof window === 'undefined') return DEFAULT_TAGS;
  try {
    if (localStorage.getItem('adranna_client_tags_version') !== TAGS_VERSION) {
      localStorage.removeItem('adranna_client_tags');
      localStorage.setItem('adranna_client_tags_version', TAGS_VERSION);
      return DEFAULT_TAGS;
    }
    const raw = localStorage.getItem('adranna_client_tags');
    if (!raw) return DEFAULT_TAGS;
    const parsed: string[] = JSON.parse(raw);
    const cleaned = parsed.filter(
      (t) => t && t.trim() !== '' && !t.toLowerCase().includes('vip')
    );
    return cleaned;
  } catch {
    return DEFAULT_TAGS;
  }
}

function saveStoredTags(tags: string[]) {
  if (typeof window === 'undefined') return;
  const cleaned = tags.filter((t) => t && t.trim() !== '' && !t.toLowerCase().includes('vip'));
  localStorage.setItem('adranna_client_tags', JSON.stringify(cleaned));
}

// ─── Opciones comunes de Enfermedades Preexistentes ──────────────────────────
const COMMON_PREEXISTING = [
  'Diabetes Mellitus',
  'Hipertensión',
  'Mala Circulación',
  'Alergia al Látex',
  'Problemas de Coagulación',
  'Marcapasos / Prótesis',
  'Embarazo',
];

// ─── Formulario vacío ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  birthdate: '',
  condition: '',
  preexistingConditions: [] as string[],
  currentMedications: '',
  medicalHistory: '',
  isDiabetic: false,
  notes: '',
};

// ─── Componente confirmación borrar ──────────────────────────────────────────
function DeleteConfirmDialog({
  client,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  client: Client;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-error/20 space-y-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-error-container/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px] text-error">person_remove</span>
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-error">Eliminar Paciente</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              ¿Eliminar definitivamente la ficha de{' '}
              <span className="font-bold text-on-surface">{client.name}</span>?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-xs hover:bg-surface-container transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="py-3 rounded-xl bg-error text-white font-bold text-xs hover:bg-error/80 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {isDeleting ? (
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
            )}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Agregar / Editar ───────────────────────────────────────────────────
function ClientFormModal({
  initial,
  availableTags,
  onAddCustomTag,
  onSave,
  onClose,
  isSaving,
}: {
  initial?: Client;
  availableTags: string[];
  onAddCustomTag: (tag: string) => void;
  onSave: (data: typeof EMPTY_FORM) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<typeof EMPTY_FORM>(
    initial
      ? {
          name: initial.name,
          phone: initial.phone,
          email: initial.email,
          birthdate: initial.birthdate || '',
          condition: initial.tags
            .filter((t) => !['Nuevo Paciente', 'Paciente'].includes(t) && !t.toLowerCase().includes('vip'))
            .join(', '),
          preexistingConditions:
            initial.preexistingConditions ||
            (initial.hasMedicalAlert && initial.medicalAlertDescription?.includes('Diabetes')
              ? ['Diabetes Mellitus']
              : []),
          currentMedications: initial.currentMedications || '',
          medicalHistory: initial.medicalHistory || '',
          isDiabetic:
            (initial.hasMedicalAlert ?? false) ||
            (initial.preexistingConditions || []).includes('Diabetes Mellitus'),
          notes: initial.notes || '',
        }
      : { ...EMPTY_FORM, preexistingConditions: [] }
  );

  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const togglePreexisting = (item: string) => {
    setForm((prev) => {
      const exists = prev.preexistingConditions.includes(item);
      const nextList = exists
        ? prev.preexistingConditions.filter((x) => x !== item)
        : [...prev.preexistingConditions, item];
      const nextDiabetic =
        item === 'Diabetes Mellitus' ? !exists : prev.isDiabetic || nextList.includes('Diabetes Mellitus');
      return {
        ...prev,
        preexistingConditions: nextList,
        isDiabetic: nextDiabetic,
      };
    });
  };

  const handleAddTagToCondition = (tag: string) => {
    const current = form.condition
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!current.includes(tag)) {
      const next = current.length > 0 ? `${form.condition}, ${tag}` : tag;
      set('condition', next);
    }
  };

  const handleCreateCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTagInput.trim();
    if (!tag) return;
    onAddCustomTag(tag);
    handleAddTagToCondition(tag);
    setNewTagInput('');
    setShowNewTagInput(false);
  };

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 pb-8 sm:pb-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${isEdit ? 'bg-secondary-container text-secondary' : 'bg-primary-container text-white'}`}>
              <span className="material-symbols-outlined text-[18px]">{isEdit ? 'edit' : 'person_add'}</span>
            </span>
            <h3 className="font-serif text-xl font-bold text-primary">
              {isEdit ? 'Editar Paciente' : 'Nuevo Paciente'}
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

        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-3">
          {/* Nombre */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">Nombre Completo *</label>
            <input
              type="text" required
              placeholder="Ej. Mariana Morales Soto"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Teléfono + DNI */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">Teléfono</label>
              <input
                type="tel"
                placeholder="+51 900 000 000"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">DNI</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ej. 74859612"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Fecha de Nacimiento */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">Fecha de Nacimiento</label>
            <input
              type="date"
              value={form.birthdate}
              onChange={(e) => set('birthdate', e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Condición / Tags */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-on-surface-variant">Condición / Etiquetas Clínicas</label>
              <button
                type="button"
                onClick={() => setShowNewTagInput((prev) => !prev)}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                <span>{showNewTagInput ? 'Cerrar' : '+ Crear Etiqueta'}</span>
              </button>
            </div>

            <input
              type="text"
              placeholder="Ej. Onicocriptosis, Alergia al látex..."
              value={form.condition}
              onChange={(e) => set('condition', e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Input rápido para crear nueva etiqueta */}
            {showNewTagInput && (
              <div className="mt-2 p-2 rounded-xl bg-surface-container border border-surface-container-high flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Nueva etiqueta (ej. Manicura)..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCustomTag(e);
                    }
                  }}
                  className="flex-1 bg-surface-container-lowest border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleCreateCustomTag}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-container transition-colors"
                >
                  Guardar
                </button>
              </div>
            )}

            {/* Lista de tags interactivos */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {availableTags.map((tag) => {
                const isSelected = form.condition
                  .split(',')
                  .map((t) => t.trim().toLowerCase())
                  .includes(tag.toLowerCase());

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTagToCondition(tag)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-2xs'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-primary-container/20 hover:text-primary border-transparent'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Antecedentes Médicos, Enfermedades Preexistentes y Medicamentos */}
          <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-error">medical_information</span>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Antecedentes Médicos & Medicación
              </span>
            </div>

            {/* Casillas rápidas de enfermedades preexistentes */}
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-1.5">
                Enfermedades Preexistentes (toca las que apliquen)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PREEXISTING.map((cond) => {
                  const active = form.preexistingConditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => togglePreexisting(cond)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border ${
                        active
                          ? 'bg-error text-white border-error shadow-2xs'
                          : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high hover:border-error/40 hover:text-error'
                      }`}
                    >
                      <span>{active ? '✓' : '+'}</span>
                      <span>{cond}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Otras enfermedades preexistentes o antecedentes */}
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                Otras enfermedades preexistentes / Antecedentes (alergias, cirugías...)
              </label>
              <input
                type="text"
                placeholder="Ej. Hipotiroidismo, alergia al yodo, cirugía de rodilla..."
                value={form.medicalHistory}
                onChange={(e) => set('medicalHistory', e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Medicamentos actuales */}
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                ¿Toma algún medicamento actualmente?
              </label>
              <input
                type="text"
                placeholder="Ej. Metformina, Losartán, Aspirina (o dejar vacío si ninguno)"
                value={form.currentMedications}
                onChange={(e) => set('currentMedications', e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">Notas Clínicas / Observaciones</label>
            <textarea
              rows={2}
              placeholder="Observaciones, preferencias o indicaciones especiales..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Alerta Médica en Agenda */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-error-container/20 border border-error/20 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDiabetic || form.preexistingConditions.length > 0}
              onChange={(e) => set('isDiabetic', e.target.checked)}
              className="w-4 h-4 rounded text-error focus:ring-error"
            />
            <span className="text-xs font-bold text-error">
              Activar alerta médica visible en la Agenda (recomendado si tiene diabetes o preexistencias)
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-container transition-all mt-1 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSaving ? (
              <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span><span>Guardando...</span></>
            ) : (
              <><span className="material-symbols-outlined text-[16px]">{isEdit ? 'save' : 'person_add'}</span><span>{isEdit ? 'Guardar Cambios' : 'Crear Ficha'}</span></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const changeView = (mode: 'cards' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('adranna_clients_view', mode);
  };

  // Recordar la vista elegida
  useEffect(() => {
    const saved = localStorage.getItem('adranna_clients_view');
    if (saved === 'list' || saved === 'cards') setViewMode(saved);
  }, []);

  // Al buscar o filtrar, volver a la primera página
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, activeTag, viewMode]);

  // Inline creación de etiqueta en la barra de filtros
  const [isAddingTagFilter, setIsAddingTagFilter] = useState(false);
  const [filterNewTagInput, setFilterNewTagInput] = useState('');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setCustomTags(getStoredTags());

    dbService.getClients().then((data) => {
      if (mounted) {
        const sanitized = data.map((c) => ({
          ...c,
          tags: c.tags.filter((t) => t && !t.toLowerCase().includes('vip')),
        }));
        setClients(sanitized);
        setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Agregar tag personalizada
  const handleAddCustomTag = (newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed || trimmed.toLowerCase().includes('vip')) return;

    if (!customTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...customTags, trimmed];
      setCustomTags(updated);
      saveStoredTags(updated);
    }
  };

  // Guardar etiqueta desde el filtro superior
  const handleSaveFilterNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterNewTagInput.trim()) return;
    handleAddCustomTag(filterNewTagInput.trim());
    setActiveTag(filterNewTagInput.trim());
    setFilterNewTagInput('');
    setIsAddingTagFilter(false);
  };

  // Calcular lista dinámica de pestañas de filtro
  const clientTags = clients.flatMap((c) => c.tags).filter((t) => t && !t.toLowerCase().includes('vip') && t !== 'Nuevo Paciente' && t !== 'Paciente');
  const allAvailableTags = Array.from(new Set([...customTags, ...clientTags]));
  const tagsList = ['all', ...allAvailableTags];

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filtered = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q));
    const matchTag = activeTag === 'all' || c.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase());
    return matchSearch && matchTag;
  });

  const visibleClients = filtered.slice(0, visibleCount);

  // ── Save (create / update) ────────────────────────────────────────────────
  const handleSave = async (form: typeof EMPTY_FORM) => {
    if (!form.name.trim() || isSaving) return;
    setIsSaving(true);

    const tags: string[] = [];
    form.condition
      .split(',')
      .map((s) => s.trim())
      .filter((s) => Boolean(s) && !s.toLowerCase().includes('vip'))
      .forEach((t) => {
        if (!tags.includes(t)) tags.push(t);
      });

    const hasAnyMedicalCondition =
      form.isDiabetic ||
      form.preexistingConditions.length > 0 ||
      Boolean(form.medicalHistory.trim());

    const summaryParts: string[] = [];
    if (form.preexistingConditions.length > 0) {
      summaryParts.push(form.preexistingConditions.join(', '));
    } else if (form.isDiabetic) {
      summaryParts.push('Diabetes Mellitus');
    }
    if (form.medicalHistory.trim()) {
      summaryParts.push(form.medicalHistory.trim());
    }
    if (form.currentMedications.trim()) {
      summaryParts.push(`Medicación: ${form.currentMedications.trim()}`);
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      birthdate: form.birthdate || '',
      tags,
      totalVisits: editingClient?.totalVisits ?? 1,
      preexistingConditions: form.preexistingConditions,
      currentMedications: form.currentMedications.trim() || undefined,
      medicalHistory: form.medicalHistory.trim() || undefined,
      hasMedicalAlert: hasAnyMedicalCondition,
      medicalAlertDescription:
        summaryParts.length > 0
          ? summaryParts.join(' • ')
          : hasAnyMedicalCondition
          ? 'Diabetes Mellitus (protocolo podológico estricto).'
          : undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingClient) {
      const updated = await dbService.updateClient(editingClient.id, payload);
      if (updated) {
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } else {
      const created = await dbService.createClient(payload);
      setClients((prev) => [created, ...prev]);
    }

    setIsSaving(false);
    setShowForm(false);
    setEditingClient(undefined);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!clientToDelete || isDeleting) return;
    setIsDeleting(true);
    const ok = await dbService.deleteClient(clientToDelete.id);
    if (ok) setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
    setIsDeleting(false);
    setClientToDelete(null);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingClient(undefined);
    setShowForm(true);
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">Directorio de Pacientes</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isLoading
              ? 'Conectando con base de datos...'
              : `${clients.length} ficha${clients.length !== 1 ? 's' : ''} clínica${clients.length !== 1 ? 's' : ''} registrada${clients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white shadow-sm hover:bg-primary-container active:scale-95 transition-all text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>+ Nuevo</span>
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-outline">search</span>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono, DNI o condición..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 rounded-2xl bg-surface-container-lowest border border-surface-container-high text-xs font-semibold text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">clear</span>
          </button>
        )}
      </div>

      {/* Barra de vista: contador + alternar tarjetas / lista */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-on-surface-variant">
          {filtered.length === clients.length
            ? `${clients.length} paciente${clients.length !== 1 ? 's' : ''}`
            : `${filtered.length} de ${clients.length} pacientes`}
        </span>
        <div className="inline-flex bg-surface-container p-0.5 rounded-xl border border-surface-container-high">
          <button
            type="button"
            onClick={() => changeView('cards')}
            aria-label="Vista de tarjetas"
            title="Tarjetas"
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
              viewMode === 'cards' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            <span className="hidden sm:inline">Tarjetas</span>
          </button>
          <button
            type="button"
            onClick={() => changeView('list')}
            aria-label="Vista de lista"
            title="Lista"
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
              viewMode === 'list' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">view_list</span>
            <span className="hidden sm:inline">Lista</span>
          </button>
        </div>
      </div>

      {/* Tags filtro dinámicos con creación de etiqueta propia */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-gutter-mobile px-gutter-mobile">
        {tagsList.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              activeTag === tag
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high hover:bg-surface-container'
            }`}
          >
            {tag === 'all' ? 'Todos' : tag}
          </button>
        ))}

        {/* Botón para crear nueva etiqueta de filtro */}
        {isAddingTagFilter ? (
          <form onSubmit={handleSaveFilterNewTag} className="flex items-center gap-1 bg-surface-container-lowest border border-primary p-0.5 rounded-full">
            <input
              type="text"
              autoFocus
              placeholder="Nueva etiqueta..."
              value={filterNewTagInput}
              onChange={(e) => setFilterNewTagInput(e.target.value)}
              className="bg-transparent text-xs px-2 py-0.5 w-28 text-on-surface focus:outline-none"
            />
            <button
              type="submit"
              className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container"
              title="Guardar etiqueta"
            >
              <span className="material-symbols-outlined text-[14px]">check</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsAddingTagFilter(false); setFilterNewTagInput(''); }}
              className="w-6 h-6 rounded-full text-outline hover:text-error flex items-center justify-center"
              title="Cancelar"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingTagFilter(true)}
            className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border border-dashed border-primary/40 text-primary hover:bg-primary-container/10 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Nueva Etiqueta</span>
          </button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
          <span className="text-xs font-medium">Cargando pacientes...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl text-outline">group_off</span>
          <span className="text-sm font-medium text-center">
            {clients.length === 0 ? 'Aún no hay pacientes registrados' : 'Sin resultados para tu búsqueda'}
          </span>
          {clients.length === 0 && (
            <button
              onClick={openCreate}
              className="mt-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container transition-all"
            >
              + Registrar Primer Paciente
            </button>
          )}
        </div>
      ) : (
      <>
        <div className={viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 gap-3 pt-1' : 'hidden'}>
          {visibleClients.map((client) => (
            <div
              key={client.id}
              className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              {/* Top row: avatar + name + actions */}
              <div className="flex items-start justify-between gap-2">
                <Link href={`/pacientes/${client.id}`} className="flex items-center gap-3 min-w-0 group">
                  {/* Avatar monograma */}
                  <div className={`w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs border border-surface-container-high group-hover:ring-2 group-hover:ring-primary/40 transition-all ${avatarColor(client.id)}`}>
                    {getInitials(client.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-base font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                      {client.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-secondary">phone</span>
                      <span>{client.phone || '—'}</span>
                    </p>
                    {client.email && (
                      <p className="text-xs text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-outline">badge</span>
                        <span className="truncate">DNI: {client.email}</span>
                      </p>
                    )}
                  </div>
                </Link>

                {/* Acciones rápidas: editar + borrar */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                    {client.totalVisits} {client.totalVisits === 1 ? 'visita' : 'visitas'}
                  </span>
                  <button
                    onClick={() => openEdit(client)}
                    aria-label="Editar paciente"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-container/20 text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => setClientToDelete(client)}
                    aria-label="Eliminar paciente"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error-container/40 text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Alerta Médica / Enfermedades Preexistentes / Medicación */}
              {(client.hasMedicalAlert ||
                (client.preexistingConditions && client.preexistingConditions.length > 0) ||
                client.currentMedications ||
                client.medicalHistory) && (
                <div className="bg-error-container/30 border border-error/20 p-2.5 rounded-xl flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0">warning</span>
                    <span className="font-bold text-on-error-container line-clamp-1">
                      {client.preexistingConditions && client.preexistingConditions.length > 0
                        ? client.preexistingConditions.join(', ')
                        : client.medicalAlertDescription || 'Alerta médica / antecedente'}
                    </span>
                  </div>
                  {client.medicalHistory && (
                    <span className="text-[11px] text-on-surface pl-6 line-clamp-1">
                      <strong>Antecedentes:</strong> {client.medicalHistory}
                    </span>
                  )}
                  {client.currentMedications && (
                    <span className="text-[11px] text-on-surface pl-6 line-clamp-1">
                      <strong>Medicación:</strong> {client.currentMedications}
                    </span>
                  )}
                </div>
              )}

              {/* Notas breves */}
              {client.notes && (
                <p className="text-[11px] text-on-surface-variant italic line-clamp-1 px-0.5">
                  {client.notes}
                </p>
              )}

              {/* Tags personalizadas del paciente */}
              <div className="flex flex-wrap gap-1.5">
                {client.tags.map((t) => {
                  const isAlert = t.includes('Diabético') || t.includes('Látex') || t.toLowerCase().includes('alergia');
                  const isPodo = t.toLowerCase().includes('podo') || t.toLowerCase().includes('pie');
                  const isMassage = t.toLowerCase().includes('masaje') || t.toLowerCase().includes('terapia');

                  return (
                    <span
                      key={t}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                        isAlert
                          ? 'bg-error-container/40 text-error border-error/30'
                          : isPodo
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isMassage
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-primary-container/15 text-primary border-primary/20'
                      }`}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>

              {/* Fichas especializadas y Perfil */}
              <div className="pt-2 border-t border-surface-container-high/60 grid grid-cols-3 gap-1.5">
                <Link
                  href={`/pacientes/${client.id}`}
                  className="py-2 px-2 rounded-xl bg-surface-container-high text-on-surface hover:bg-primary hover:text-white transition-all text-xs font-bold text-center flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">person</span>
                  <span>Perfil</span>
                </Link>
                <Link
                  href={`/pacientes/${client.id}/podologia`}
                  className="py-2 px-2 rounded-xl bg-primary-container/10 text-primary hover:bg-primary-container hover:text-white transition-all text-xs font-bold text-center flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">footprint</span>
                  <span>Podología</span>
                </Link>
                <Link
                  href={`/pacientes/${client.id}/masaje`}
                  className="py-2 px-2 rounded-xl bg-secondary-container/40 text-secondary hover:bg-secondary hover:text-white transition-all text-xs font-bold text-center flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">spa</span>
                  <span>Masaje</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Vista de lista compacta */}
        {viewMode === 'list' && (
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high/60 shadow-xs overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1.2fr_1.6fr_auto_auto] gap-3 px-4 py-2 bg-surface-container-low text-[10px] uppercase tracking-wider font-bold text-outline border-b border-surface-container-high/60">
              <span>Paciente</span>
              <span>Contacto</span>
              <span>Etiquetas</span>
              <span className="text-center">Visitas</span>
              <span className="text-right pr-1">Acciones</span>
            </div>
            <ul className="divide-y divide-surface-container-high/60">
              {visibleClients.map((client) => (
                <li
                  key={client.id}
                  className="grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1.2fr_1.6fr_auto_auto] items-center gap-x-3 gap-y-1 px-3 md:px-4 py-2.5 hover:bg-surface-container-low/60 transition-colors"
                >
                  {/* Paciente */}
                  <Link href={`/pacientes/${client.id}`} className="flex items-center gap-2.5 min-w-0 group">
                    <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 border border-surface-container-high group-hover:ring-2 group-hover:ring-primary/40 transition-all ${avatarColor(client.id)}`}>
                      {getInitials(client.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate flex items-center gap-1">
                        {client.name}
                        {client.hasMedicalAlert && (
                          <span className="material-symbols-outlined text-[15px] text-error flex-shrink-0" title={client.medicalAlertDescription || 'Alerta médica'}>warning</span>
                        )}
                      </p>
                      <p className="md:hidden text-[11px] text-on-surface-variant truncate">{client.phone || client.email || '—'}</p>
                    </div>
                  </Link>

                  {/* Contacto (desktop) */}
                  <div className="hidden md:block min-w-0 text-xs text-on-surface-variant">
                    <p className="truncate">{client.phone || '—'}</p>
                    {client.email && <p className="truncate text-[11px] text-outline">DNI: {client.email}</p>}
                  </div>

                  {/* Etiquetas (desktop) */}
                  <div className="hidden md:flex flex-wrap gap-1 min-w-0">
                    {client.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-primary-container/15 text-primary border-primary/20 truncate max-w-[110px]">
                        {t}
                      </span>
                    ))}
                    {client.tags.length > 3 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 text-outline">+{client.tags.length - 3}</span>
                    )}
                  </div>

                  {/* Visitas (desktop) */}
                  <span className="hidden md:inline-block text-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                    {client.totalVisits}
                  </span>

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-0.5">
                    <Link
                      href={`/pacientes/${client.id}`}
                      title="Perfil e historial de visitas"
                      className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </Link>
                    <Link
                      href={`/pacientes/${client.id}/podologia`}
                      title="Ficha de podología"
                      className="w-8 h-8 flex items-center justify-center rounded-full text-primary hover:bg-primary-container/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">footprint</span>
                    </Link>
                    <Link
                      href={`/pacientes/${client.id}/masaje`}
                      title="Ficha de masaje"
                      className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-secondary-container/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">spa</span>
                    </Link>
                    <button
                      onClick={() => openEdit(client)}
                      aria-label="Editar paciente"
                      className="w-8 h-8 flex items-center justify-center rounded-full text-primary hover:bg-primary-container/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => setClientToDelete(client)}
                      aria-label="Eliminar paciente"
                      className="w-8 h-8 flex items-center justify-center rounded-full text-error hover:bg-error-container/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ver más (paginación progresiva) */}
        {filtered.length > visibleClients.length && (
          <div className="flex justify-center pt-1">
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="px-5 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container transition-colors"
            >
              Ver más ({filtered.length - visibleClients.length} restantes)
            </button>
          </div>
        )}
      </>
      )}

      {/* Modal Crear / Editar */}
      {showForm && (
        <ClientFormModal
          initial={editingClient}
          availableTags={allAvailableTags}
          onAddCustomTag={handleAddCustomTag}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingClient(undefined); }}
          isSaving={isSaving}
        />
      )}

      {/* Diálogo Confirmar Borrar */}
      {clientToDelete && (
        <DeleteConfirmDialog
          client={clientToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setClientToDelete(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
