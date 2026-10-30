'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/lib/dbService';
import { Professional } from '@/types/database';

const SPECIALTY_OPTIONS: { label: string; value: Professional['specialty']; badgeColor: string }[] = [
  { label: 'Podología Clínica', value: 'podologia', badgeColor: 'bg-primary-container/20 text-primary border-primary/20' },
  { label: 'Masajes / Spa', value: 'masaje', badgeColor: 'bg-secondary-container/40 text-secondary border-secondary/20' },
  { label: 'Manicura & Pedicura', value: 'manicura', badgeColor: 'bg-pink-100 text-pink-700 border-pink-200' },
  { label: 'General / Recepción', value: 'general', badgeColor: 'bg-surface-container-high text-on-surface-variant border-surface-container-highest' },
];

export default function EquipoPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('Podóloga Titular');
  const [specialty, setSpecialty] = useState<Professional['specialty']>('podologia');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfessionals();
  }, []);

  const loadProfessionals = async () => {
    setIsLoading(true);
    const data = await dbService.getProfessionals();
    setProfessionals(data);
    setIsLoading(false);
  };

  const openNewModal = () => {
    setEditingProf(null);
    setName('');
    setRole('Podóloga');
    setSpecialty('podologia');
    setPhone('');
    setEmail('');
    setIsModalOpen(true);
  };

  const openEditModal = (prof: Professional) => {
    setEditingProf(prof);
    setName(prof.name);
    setRole(prof.role);
    setSpecialty(prof.specialty);
    setPhone(prof.phone || '');
    setEmail(prof.email || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;
    setIsSaving(true);

    if (editingProf) {
      await dbService.updateProfessional(editingProf.id, {
        name: name.trim(),
        role: role.trim(),
        specialty,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
    } else {
      await dbService.createProfessional({
        name: name.trim(),
        role: role.trim(),
        specialty,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        active: true,
      });
    }

    await loadProfessionals();
    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (prof: Professional) => {
    if (!confirm(`¿Eliminar a ${prof.name} del equipo?`)) return;
    await dbService.deleteProfessional(prof.id);
    setProfessionals((prev) => prev.filter((p) => p.id !== prof.id));
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
            Equipo & Profesionales
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Registra a la podóloga, masajista, manicurista y personal del spa
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white shadow-sm hover:bg-primary-container active:scale-95 transition-all text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>+ Agregar Profesional</span>
        </button>
      </div>

      {/* Lista de Profesionales */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
          <span className="text-xs font-medium">Cargando equipo...</span>
        </div>
      ) : professionals.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 bg-surface-container-lowest rounded-3xl p-8 border border-dashed border-surface-container-high text-center">
          <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">badge</span>
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-primary">Aún no hay profesionales registrados</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mt-1">
              Agrega a tu podóloga, masajista, manicurista u otro personal para poder asignarlos a las citas y cabinas.
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="mt-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Registrar Primera Profesional</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {professionals.map((prof) => {
            const specInfo = SPECIALTY_OPTIONS.find((s) => s.value === prof.specialty) || SPECIALTY_OPTIONS[0];
            return (
              <div
                key={prof.id}
                className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-primary-container/15 text-primary font-bold text-base flex items-center justify-center flex-shrink-0 shadow-xs">
                      {prof.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif text-base font-bold text-on-surface truncate">
                        {prof.name}
                      </h3>
                      <p className="text-xs font-semibold text-secondary truncate">
                        {prof.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(prof)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-container/20 text-primary transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(prof)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error-container/40 text-error transition-colors"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-surface-container-high/40 text-xs text-on-surface-variant">
                  <div className="flex items-center justify-between">
                    <span className="text-outline">Especialidad:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${specInfo.badgeColor}`}>
                      {specInfo.label}
                    </span>
                  </div>

                  {prof.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Teléfono:</span>
                      <span className="font-medium">{prof.phone}</span>
                    </div>
                  )}

                  {prof.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Correo:</span>
                      <span className="font-medium truncate max-w-[150px]">{prof.email}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Agregar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl border border-surface-container-high space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">
                    {editingProf ? 'edit' : 'badge'}
                  </span>
                </span>
                <h3 className="font-serif text-xl font-bold text-primary">
                  {editingProf ? 'Editar Profesional' : 'Registrar Profesional'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dra. Carmen Mendoza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Puesto / Cargo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Podóloga Titular / Masajista Terapeuta / Manicurista Spa"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Especialidad Principal *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSpecialty(opt.value)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-left ${
                        specialty === opt.value
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant border-surface-container-high hover:bg-surface-container'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    placeholder="+52 55..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Correo
                  </label>
                  <input
                    type="email"
                    placeholder="profesional@spa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-container transition-all mt-2 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{editingProf ? 'Guardar Cambios' : 'Registrar en el Equipo'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
