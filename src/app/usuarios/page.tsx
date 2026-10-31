'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserRole } from '@/types/database';

interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole | null;
  createdAt: string;
  lastSignInAt: string | null;
}

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string; color: string }[] = [
  { value: 'admin', label: 'Administrador', desc: 'Acceso total, finanzas y gestión de usuarios', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'recepcion', label: 'Recepción', desc: 'Agenda, clientes, servicios y equipo. Sin finanzas', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  { value: 'terapeuta', label: 'Terapeuta', desc: 'Agenda, clientes y fichas clínicas. Sin finanzas', color: 'bg-amber-100 text-amber-800 border-amber-300' },
];

function roleMeta(role: UserRole | null) {
  return ROLE_OPTIONS.find((r) => r.value === role);
}

function initials(name: string, email: string) {
  const base = name || email;
  return base.split(/[\s@.]/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return 'Nunca';
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UsuariosPage() {
  const { isAdmin, session } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; setup?: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modal crear / editar
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [fFullName, setFFullName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [fRole, setFRole] = useState<UserRole>('recepcion');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Eliminar
  const [toDelete, setToDelete] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const api = useCallback(
    async (method: string, body?: unknown, query = '') => {
      const res = await fetch(`/api/admin/users${query}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    },
    [session?.access_token]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { ok, data } = await api('GET');
    if (ok) {
      setUsers(data.users);
      setCurrentUserId(data.currentUserId);
    } else {
      setError({ message: data.error || 'No se pudo cargar la lista de usuarios', setup: data.code === 'SERVICE_KEY_MISSING' });
    }
    setIsLoading(false);
  }, [api]);

  useEffect(() => {
    if (isAdmin && isSupabaseConfigured() && session) load();
    else setIsLoading(false);
  }, [isAdmin, session, load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const openCreate = () => {
    setEditing(null);
    setFFullName(''); setFEmail(''); setFPassword(''); setFRole('recepcion');
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (u: ManagedUser) => {
    setEditing(u);
    setFFullName(u.fullName); setFEmail(u.email); setFPassword(''); setFRole(u.role ?? 'recepcion');
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setFormError(null);

    const result = editing
      ? await api('PATCH', { id: editing.id, fullName: fFullName.trim(), role: fRole, password: fPassword || undefined })
      : await api('POST', { email: fEmail.trim(), password: fPassword, fullName: fFullName.trim(), role: fRole });

    setIsSaving(false);
    if (!result.ok) {
      setFormError(result.data.error || 'No se pudo guardar');
      return;
    }
    setShowForm(false);
    showToast(editing ? 'Usuario actualizado' : 'Usuario creado');
    load();
  };

  const handleRoleChange = async (u: ManagedUser, role: UserRole) => {
    const { ok, data } = await api('PATCH', { id: u.id, role });
    if (!ok) {
      showToast(data.error || 'No se pudo cambiar el rol');
      return;
    }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    showToast(`Rol de ${u.fullName || u.email} actualizado. Aplica en su próximo inicio de sesión.`);
  };

  const handleDelete = async () => {
    if (!toDelete || isDeleting) return;
    setIsDeleting(true);
    const { ok, data } = await api('DELETE', undefined, `?id=${encodeURIComponent(toDelete.id)}`);
    setIsDeleting(false);
    if (!ok) {
      showToast(data.error || 'No se pudo eliminar');
    } else {
      setUsers((prev) => prev.filter((x) => x.id !== toDelete.id));
      showToast('Usuario eliminado');
    }
    setToDelete(null);
  };

  // ── Acceso restringido ────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-20 h-20 rounded-full bg-error-container/30 border-2 border-error/20 flex items-center justify-center text-error">
          <span className="material-symbols-outlined text-4xl">lock</span>
        </div>
        <div className="max-w-md space-y-2">
          <span className="text-xs uppercase tracking-widest text-error font-bold font-sans">Acceso Restringido</span>
          <h2 className="font-serif text-2xl font-bold text-on-surface">Gestión de Usuarios</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Solo la <strong>Administración</strong> puede ver y gestionar los usuarios y sus roles.
          </p>
        </div>
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-colors shadow-sm">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  // ── Modo local (sin Supabase) ─────────────────────────────────────────
  if (!isSupabaseConfigured()) {
    return (
      <div className="py-16 text-center space-y-2">
        <span className="material-symbols-outlined text-5xl text-outline">cloud_off</span>
        <p className="text-sm font-medium text-on-surface-variant">
          La gestión de usuarios requiere conectar Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">Usuarios & Roles</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isLoading ? 'Cargando...' : `${users.length} usuario${users.length !== 1 ? 's' : ''} con acceso al sistema`}
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!!error}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white shadow-sm hover:bg-primary-container active:scale-95 transition-all text-xs font-bold disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>+ Nuevo Usuario</span>
        </button>
      </div>

      {/* Leyenda de roles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {ROLE_OPTIONS.map((r) => (
          <div key={r.value} className="bg-surface-container-low border border-surface-container-high rounded-2xl p-3">
            <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${r.color}`}>{r.label}</span>
            <p className="text-[11px] text-on-surface-variant mt-1.5 leading-snug">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Error / configuración */}
      {error && (
        <div className="bg-error-container/30 border border-error/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-error font-bold text-xs">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error.message}</span>
          </div>
          {error.setup && (
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              En Supabase ve a <strong>Project Settings → API</strong>, copia la clave <strong>service_role</strong> y agrégala en Vercel como
              variable <code className="bg-surface-container px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>. Luego haz Redeploy.
              Nunca la pegues en el código ni en el navegador.
            </p>
          )}
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
          <span className="text-xs font-medium">Cargando usuarios...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((u) => {
            const meta = roleMeta(u.role);
            const isSelf = u.id === currentUserId;
            return (
              <div key={u.id} className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-high/60 shadow-xs flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-primary-container/20 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0 border border-primary/20">
                      {initials(u.fullName, u.email)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif text-base font-bold text-on-surface truncate">
                        {u.fullName || u.email.split('@')[0]}
                        {isSelf && <span className="ml-1.5 text-[10px] font-bold text-secondary font-sans">(tú)</span>}
                      </h3>
                      <p className="text-xs text-on-surface-variant truncate">{u.email}</p>
                      <p className="text-[10px] text-outline mt-0.5">Último acceso: {formatDate(u.lastSignInAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(u)}
                      aria-label="Editar usuario"
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-container/20 text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {!isSelf && (
                      <button
                        onClick={() => setToDelete(u)}
                        aria-label="Eliminar usuario"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error-container/40 text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-container-high/60">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta ? meta.color : 'bg-surface-container text-outline border-surface-container-high'}`}>
                    {meta ? meta.label : 'Sin rol asignado'}
                  </span>
                  <select
                    value={u.role ?? ''}
                    onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                    className="bg-surface-container-low border border-surface-container-high rounded-lg px-2 py-1 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {!u.role && <option value="" disabled>Asignar rol…</option>}
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {showForm && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 pb-8 sm:pb-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <h3 className="font-serif text-xl font-bold text-primary">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Nombre completo</label>
                <input
                  type="text" value={fFullName} onChange={(e) => setFFullName(e.target.value)}
                  placeholder="Ej. Ana Pérez"
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Correo *</label>
                <input
                  type="email" required disabled={!!editing} value={fEmail} onChange={(e) => setFEmail(e.target.value)}
                  placeholder="usuario@correo.com"
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  {editing ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                </label>
                <input
                  type="password" required={!editing} minLength={6} value={fPassword} onChange={(e) => setFPassword(e.target.value)}
                  placeholder={editing ? 'Dejar vacío para no cambiarla' : 'Mínimo 6 caracteres'}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Rol</label>
                <div className="space-y-1.5">
                  {ROLE_OPTIONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        fRole === r.value ? 'border-primary bg-primary-container/10' : 'border-surface-container-high bg-surface-container-low'
                      }`}
                    >
                      <input type="radio" name="role" checked={fRole === r.value} onChange={() => setFRole(r.value)} className="mt-0.5 accent-[#6F3612]" />
                      <span>
                        <span className="text-xs font-bold text-on-surface block">{r.label}</span>
                        <span className="text-[11px] text-on-surface-variant">{r.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="text-xs font-semibold text-error bg-error-container/30 border border-error/20 rounded-xl p-2.5">{formError}</div>
              )}

              <button
                type="submit" disabled={isSaving}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSaving ? (
                  <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span><span>Guardando...</span></>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">save</span><span>{editing ? 'Guardar Cambios' : 'Crear Usuario'}</span></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {toDelete && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-error/20 space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-error-container/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-error">person_remove</span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-error">Eliminar Usuario</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  ¿Eliminar el acceso de <span className="font-bold text-on-surface">{toDelete.fullName || toDelete.email}</span>? Ya no podrá iniciar sesión.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setToDelete(null)} className="py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-xs hover:bg-surface-container transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="py-3 rounded-xl bg-error text-white font-bold text-xs hover:bg-error/80 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
                <span className="material-symbols-outlined text-[16px]">{isDeleting ? 'sync' : 'delete_forever'}</span>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] bg-on-surface text-surface px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl max-w-[90vw]">
          {toast}
        </div>
      )}
    </div>
  );
}
