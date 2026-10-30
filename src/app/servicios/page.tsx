'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/lib/dbService';
import { ServicePackage } from '@/types/database';

const CATEGORIES = [
  { label: 'Todos', value: 'all' },
  { label: 'Podología', value: 'podologia' },
  { label: 'Masajes / Spa', value: 'masaje' },
  { label: 'Manicura & Pedicura', value: 'manicura' },
  { label: 'Paquetes & Bonos', value: 'paquete' },
];

export default function ServiciosPage() {
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServicePackage | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServicePackage['category']>('podologia');
  const [duration, setDuration] = useState(45);
  const [price, setPrice] = useState(750);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setIsLoading(true);
    const data = await dbService.getServices();
    setServices(data);
    setIsLoading(false);
  };

  const filtered = services.filter((s) => {
    if (filterCategory === 'all') return true;
    return s.category === filterCategory;
  });

  const openNewModal = () => {
    setEditingService(null);
    setName('');
    setCategory('podologia');
    setDuration(45);
    setPrice(750);
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (srv: ServicePackage) => {
    setEditingService(srv);
    setName(srv.name);
    setCategory(srv.category);
    setDuration(srv.durationMinutes);
    setPrice(srv.price);
    setDescription(srv.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;
    setIsSaving(true);

    if (editingService) {
      await dbService.updateService(editingService.id, {
        name: name.trim(),
        category,
        durationMinutes: duration,
        price,
        description: description.trim(),
      });
    } else {
      await dbService.createService({
        name: name.trim(),
        category,
        durationMinutes: duration,
        price,
        description: description.trim(),
        sessionsIncluded: category === 'paquete' ? 3 : 1,
      });
    }

    await loadServices();
    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (srv: ServicePackage) => {
    if (!confirm(`¿Eliminar el servicio "${srv.name}"?`)) return;
    await dbService.deleteService(srv.id);
    setServices((prev) => prev.filter((s) => s.id !== s.id));
    await loadServices();
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
            Tratamientos & Servicios
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {services.length} tratamientos y paquetes registrados en el tarifario
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white shadow-sm hover:bg-primary-container active:scale-95 transition-all text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>+ Nuevo Tratamiento</span>
        </button>
      </div>

      {/* Filtros por Categoría */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-gutter-mobile px-gutter-mobile">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              filterCategory === cat.value
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high hover:bg-surface-container'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Servicios */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
          <span className="text-xs font-medium">Cargando catálogo de tratamientos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 bg-surface-container-lowest rounded-3xl p-8 border border-dashed border-surface-container-high text-center">
          <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">medical_services</span>
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-primary">No hay tratamientos registrados</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mt-1">
              Agrega los tratamientos reales que ofrece tu clínica (quiropodia, masajes, esmaltado, etc.) con sus precios y duración.
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="mt-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Registrar Primer Tratamiento</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {filtered.map((srv) => (
            <div
              key={srv.id}
              className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      srv.category === 'podologia'
                        ? 'bg-primary-container/10 text-primary-container'
                        : srv.category === 'masaje'
                        ? 'bg-secondary-container/40 text-secondary'
                        : srv.category === 'manicura'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-tertiary-fixed text-on-tertiary-fixed'
                    }`}
                  >
                    {srv.category === 'podologia'
                      ? 'Podología'
                      : srv.category === 'masaje'
                      ? 'Masoterapia'
                      : srv.category === 'manicura'
                      ? 'Manicura & Pedicura'
                      : 'Bono Multi-Sesión'}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-outline font-semibold">
                      {srv.durationMinutes} min
                    </span>
                    <button
                      onClick={() => openEditModal(srv)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-primary-container/20 text-primary transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(srv)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-error-container/40 text-error transition-colors"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                <h3 className="font-serif text-lg font-bold text-on-surface mt-2">
                  {srv.name}
                </h3>
                {srv.description && (
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {srv.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-container-high">
                <div>
                  <span className="text-[10px] text-outline uppercase tracking-wider block font-bold">
                    Tarifa
                  </span>
                  <span className="font-serif text-xl font-bold text-primary">
                    S/ {srv.price} PEN
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Tratamiento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 pb-8 sm:pb-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">
                    {editingService ? 'edit' : 'medical_services'}
                  </span>
                </span>
                <h3 className="font-serif text-xl font-bold text-primary">
                  {editingService ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}
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
                  Nombre del Tratamiento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Quiropodia Preventiva / Masaje Linfático / Esmaltado Semipermanente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Categoría *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServicePackage['category'])}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="podologia">Podología Clínica</option>
                  <option value="masaje">Masoterapia & Bienestar</option>
                  <option value="manicura">Manicura & Pedicura</option>
                  <option value="paquete">Paquete o Bono</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Duración (minutos) *
                  </label>
                  <input
                    type="number"
                    required
                    min={15}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Precio (S/ PEN) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Descripción del Tratamiento
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles del procedimiento, productos utilizados o indicaciones..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
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
                    <span>{editingService ? 'Guardar Cambios' : 'Guardar Tratamiento'}</span>
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
