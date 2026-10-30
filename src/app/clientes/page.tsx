'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dbService } from '@/lib/dbService';
import { Client } from '@/types/database';

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Client Form States
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newIsDiabetic, setNewIsDiabetic] = useState(false);

  const tagsList = ['all', 'Pie Diabético', 'Podología', 'Masaje', 'VIP Gold'];

  // Cargar clientes desde Supabase o mock al iniciar
  useEffect(() => {
    let mounted = true;
    dbService.getClients().then((data) => {
      if (mounted) {
        setClients(data);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = activeTag === 'all' || c.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const tags: string[] = [];
    if (newIsDiabetic) tags.push('Pie Diabético');
    if (newCondition) tags.push(newCondition.trim());
    if (tags.length === 0) tags.push('Nuevo Paciente');

    try {
      const createdClient = await dbService.createClient({
        name: newName.trim(),
        phone: newPhone.trim() || '+52 55 0000 0000',
        email: newEmail.trim() || '',
        birthdate: '',
        tags,
        totalVisits: 1,
        hasMedicalAlert: newIsDiabetic,
        medicalAlertDescription: newIsDiabetic
          ? 'Paciente con condición de diabetes registrada (protocolo podológico estricto).'
          : undefined,
      });

      setClients((prev) => [createdClient, ...prev]);
      setIsNewClientModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewCondition('');
      setNewIsDiabetic(false);
    } catch (err) {
      console.error('Error al registrar cliente:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
            Directorio de Pacientes
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isLoading
              ? 'Conectando con base de datos...'
              : `${clients.length} fichas clínicas activas registradas`}
          </p>
        </div>

        <button
          onClick={() => setIsNewClientModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white shadow-sm hover:bg-primary-container active:scale-95 transition-all text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>+ Nuevo Paciente</span>
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-outline">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o condición (ej. Diabetes, Látex)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-container-lowest border border-surface-container-high text-xs font-semibold text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
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

      {/* Filtros por Etiquetas Clínicas */}
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
            {tag === 'all' ? 'Todos los Pacientes' : tag}
          </button>
        ))}
      </div>

      {/* Lista de Fichas de Clientes */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant gap-2">
          <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
          <span className="text-xs font-medium">Cargando pacientes desde Supabase...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {client.avatarUrl ? (
                    <img
                      src={client.avatarUrl}
                      alt={client.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-surface-container-high flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-container/10 border border-primary-container/20 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                      {getInitials(client.name)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-serif text-base font-bold text-on-surface truncate">
                      {client.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-secondary">
                        phone
                      </span>
                      <span>{client.phone}</span>
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant flex-shrink-0">
                  {client.totalVisits} {client.totalVisits === 1 ? 'visita' : 'visitas'}
                </span>
              </div>

              {/* Alerta Médica Destacada si existe */}
              {client.hasMedicalAlert && (
                <div className="bg-error-container/30 border border-error/20 p-2.5 rounded-xl flex items-center gap-2 text-xs">
                  <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0">
                    warning
                  </span>
                  <span className="font-semibold text-on-error-container line-clamp-1">
                    {client.medicalAlertDescription || 'Alerta médica crítica'}
                  </span>
                </div>
              )}

              {/* Tags Clínicos */}
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

              {/* Accesos Directos a Fichas Especializadas */}
              <div className="pt-2 border-t border-surface-container-high/60 flex items-center justify-between gap-2">
                <Link
                  href={`/pacientes/${client.id}/podologia`}
                  className="flex-1 py-2 px-3 rounded-xl bg-primary-container/10 text-primary hover:bg-primary-container hover:text-white transition-all text-xs font-bold text-center flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">footprint</span>
                  <span>Ficha Podológica</span>
                </Link>

                <Link
                  href={`/pacientes/${client.id}/masaje`}
                  className="flex-1 py-2 px-3 rounded-xl bg-secondary-container/40 text-secondary hover:bg-secondary hover:text-white transition-all text-xs font-bold text-center flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">spa</span>
                  <span>Ficha Masaje</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Nuevo Paciente */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-md p-5 shadow-2xl border border-surface-container-high space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <h3 className="font-serif text-xl font-bold text-primary">
                Registrar Nuevo Paciente
              </h3>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mariana Morales Soto"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Teléfono Móvil
                  </label>
                  <input
                    type="tel"
                    placeholder="+52 55..."
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="paciente@mail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Condición Inicial / Alergias
                </label>
                <input
                  type="text"
                  placeholder="Ej. Alergia a látex, onicocriptosis lateral..."
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface"
                />
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-error-container/20 border border-error/20">
                <input
                  type="checkbox"
                  id="diabetic"
                  checked={newIsDiabetic}
                  onChange={(e) => setNewIsDiabetic(e.target.checked)}
                  className="w-4 h-4 rounded text-error focus:ring-error"
                />
                <label htmlFor="diabetic" className="text-xs font-bold text-error cursor-pointer">
                  Condición de Diabetes Mellitus (Activa alerta médica en agenda)
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-container transition-all mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>Guardando en Supabase...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Crear Ficha y Guardar en Supabase</span>
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
