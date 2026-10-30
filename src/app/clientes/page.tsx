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

const TAG_LIST = ['Pie Diabético', 'Podología', 'Masaje', 'VIP Gold', 'Drenaje Linfático', 'Alergia Látex'];

// ─── Formulario vacío ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', phone: '', email: '', birthdate: '',
  condition: '', isDiabetic: false, notes: '',
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
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
  onSave,
  onClose,
  isSaving,
}: {
  initial?: Client;
  onSave: (data: typeof EMPTY_FORM) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name,
          phone: initial.phone,
          email: initial.email,
          birthdate: initial.birthdate || '',
          condition: initial.tags.filter((t) => !['Nuevo Paciente'].includes(t)).join(', '),
          isDiabetic: initial.hasMedicalAlert,
          notes: initial.notes || '',
        }
      : { ...EMPTY_FORM }
  );

  const set = (k: keyof typeof EMPTY_FORM, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[92vh] overflow-y-auto">
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

          {/* Teléfono + Email */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">Teléfono</label>
              <input
                type="tel"
                placeholder="+52 55 0000 0000"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">Correo</label>
              <input
                type="email"
                placeholder="paciente@mail.com"
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
            <label className="text-xs font-bold text-on-surface-variant block mb-1">Condición / Etiqueta Clínica</label>
            <input
              type="text"
              placeholder="Ej. Onicocriptosis, Alergia al látex..."
              value={form.condition}
              onChange={(e) => set('condition', e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {/* Tags rápidos */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TAG_LIST.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => set('condition', form.condition ? `${form.condition}, ${tag}` : tag)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface-variant hover:bg-primary-container/20 hover:text-primary transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">Notas Clínicas</label>
            <textarea
              rows={2}
              placeholder="Observaciones, preferencias o indicaciones especiales..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Alerta Diabetes */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-error-container/20 border border-error/20 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDiabetic}
              onChange={(e) => set('isDiabetic', e.target.checked)}
              className="w-4 h-4 rounded text-error focus:ring-error"
            />
            <span className="text-xs font-bold text-error">Condición de Diabetes Mellitus (activa alerta en agenda)</span>
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
              <><span className="material-symbols-outlined text-[16px]">{isEdit ? 'save' : 'person_add'}</span><span>{isEdit ? 'Guardar Cambios' : 'Crear Ficha en Supabase'}</span></>
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const tagsList = ['all', 'Pie Diabético', 'Podología', 'Masaje', 'VIP Gold'];

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    dbService.getClients().then((data) => {
      if (mounted) { setClients(data); setIsLoading(false); }
    });
    return () => { mounted = false; };
  }, []);

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filtered = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q));
    const matchTag = activeTag === 'all' || c.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  // ── Save (create / update) ────────────────────────────────────────────────
  const handleSave = async (form: typeof EMPTY_FORM) => {
    if (!form.name.trim() || isSaving) return;
    setIsSaving(true);

    const tags: string[] = [];
    if (form.isDiabetic) tags.push('Pie Diabético');
    form.condition.split(',').map((s) => s.trim()).filter(Boolean).forEach((t) => {
      if (!tags.includes(t)) tags.push(t);
    });
    if (tags.length === 0) tags.push('Nuevo Paciente');

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      birthdate: form.birthdate || '',
      tags,
      totalVisits: editingClient?.totalVisits ?? 1,
      hasMedicalAlert: form.isDiabetic,
      medicalAlertDescription: form.isDiabetic
        ? 'Diabetes Mellitus (protocolo podológico estricto).'
        : undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingClient) {
      // UPDATE
      const updated = await dbService.updateClient(editingClient.id, payload);
      if (updated) {
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } else {
      // CREATE
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
              ? 'Conectando con Supabase...'
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
          placeholder="Buscar por nombre, teléfono, correo o condición..."
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

      {/* Tags filtro */}
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
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
          <span className="text-xs font-medium">Cargando pacientes desde Supabase...</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              {/* Top row: avatar + name + actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar monograma */}
                  <div className={`w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs border border-surface-container-high ${avatarColor(client.id)}`}>
                    {getInitials(client.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-base font-bold text-on-surface truncate">{client.name}</h3>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-secondary">phone</span>
                      <span>{client.phone || '—'}</span>
                    </p>
                    {client.email && (
                      <p className="text-xs text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-outline">mail</span>
                        <span className="truncate">{client.email}</span>
                      </p>
                    )}
                  </div>
                </div>

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

              {/* Alerta Médica */}
              {client.hasMedicalAlert && (
                <div className="bg-error-container/30 border border-error/20 p-2.5 rounded-xl flex items-center gap-2 text-xs">
                  <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0">warning</span>
                  <span className="font-semibold text-on-error-container line-clamp-1">
                    {client.medicalAlertDescription || 'Alerta médica crítica'}
                  </span>
                </div>
              )}

              {/* Notas breves */}
              {client.notes && (
                <p className="text-[11px] text-on-surface-variant italic line-clamp-1 px-0.5">
                  {client.notes}
                </p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {client.tags.map((t) => (
                  <span
                    key={t}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      t.includes('Diabético') || t.includes('Látex')
                        ? 'bg-error-container/50 text-error'
                        : t.includes('VIP')
                        ? 'bg-secondary-fixed text-on-secondary-fixed'
                        : 'bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Fichas especializadas */}
              <div className="pt-2 border-t border-surface-container-high/60 flex items-center gap-2">
                <Link
                  href={`/pacientes/${client.id}/podologia`}
                  className="flex-1 py-2 px-3 rounded-xl bg-primary-container/10 text-primary hover:bg-primary-container hover:text-white transition-all text-xs font-bold text-center flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">footprint</span>
                  <span>Podología</span>
                </Link>
                <Link
                  href={`/pacientes/${client.id}/masaje`}
                  className="flex-1 py-2 px-3 rounded-xl bg-secondary-container/40 text-secondary hover:bg-secondary hover:text-white transition-all text-xs font-bold text-center flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">spa</span>
                  <span>Masaje</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {showForm && (
        <ClientFormModal
          initial={editingClient}
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
