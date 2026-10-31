'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/lib/dbService';
import { InventoryProduct } from '@/types/database';

const PRESENTATION_PRESETS = ['15 ml', '30 ml', '50 ml', '100 ml', '250 ml', '30 g', '50 g', '100 g', 'Unidad', 'Kit'];
const CATEGORY_PRESETS = ['Podología / Antimicóticos', 'Cremas & Hidratación', 'Aceites & Aromaterapia', 'Cuidado en Casa', 'General'];

export default function InventarioPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [name, setName] = useState('');
  const [presentation, setPresentation] = useState('30 ml');
  const [price, setPrice] = useState<number>(35);
  const [stock, setStock] = useState<string>('10');
  const [category, setCategory] = useState('Podología / Antimicóticos');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    dbService.getInventory().then((data) => {
      setProducts(data);
      setIsLoading(false);
    });
  }, []);

  const openCreate = () => {
    setEditingProduct(null);
    setName('');
    setPresentation('30 ml');
    setPrice(35);
    setStock('10');
    setCategory('Podología / Antimicóticos');
    setIsModalOpen(true);
  };

  const openEdit = (prod: InventoryProduct) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPresentation(prod.presentation);
    setPrice(prod.price);
    setStock(prod.stock !== undefined ? String(prod.stock) : '');
    setCategory(prod.category || 'General');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;
    setIsSaving(true);

    const parsedStock = stock.trim() !== '' ? Number(stock) : undefined;
    const payload = {
      name: name.trim(),
      presentation: presentation.trim() || 'Unidad',
      price: Number(price) || 0,
      stock: parsedStock,
      category: category.trim() || 'General',
    };

    if (editingProduct) {
      const updated = await dbService.updateInventoryProduct(editingProduct.id, payload);
      if (updated) {
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    } else {
      const created = await dbService.createInventoryProduct(payload);
      setProducts((prev) => [created, ...prev]);
    }

    setIsSaving(false);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (prod: InventoryProduct) => {
    if (!confirm(`¿Eliminar "${prod.name} (${prod.presentation})" del inventario?`)) return;
    await dbService.deleteInventoryProduct(prod.id);
    setProducts((prev) => prev.filter((p) => p.id !== prod.id));
  };

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category || 'General')))];

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.presentation.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);
    const matchCat = selectedCategory === 'all' || (p.category || 'General') === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex flex-col w-full pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary tracking-tight">
            Inventario de Productos
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {products.length} producto{products.length !== 1 ? 's' : ''} disponibles para venta en sesión
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white shadow-sm hover:bg-primary-container active:scale-95 transition-all text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          <span>+ Nuevo Producto</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-outline">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar producto por nombre, medida (ml, g) o categoría..."
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

      {/* Filtro por categoría */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-gutter-mobile px-gutter-mobile">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high hover:bg-surface-container'
              }`}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Lista de Productos */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
          <span className="text-xs font-medium">Cargando inventario...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 flex flex-col items-center gap-3 bg-surface-container-lowest rounded-3xl p-8 border border-dashed border-surface-container-high text-center">
          <span className="material-symbols-outlined text-5xl text-outline">inventory_2</span>
          <div>
            <span className="text-sm font-bold text-on-surface block">
              {products.length === 0 ? 'Tu inventario está vacío' : 'Sin resultados para tu búsqueda'}
            </span>
            <span className="text-xs text-on-surface-variant block mt-1 max-w-sm">
              Registra tus lociones, cremas, aceites o kits con su presentación (ej. 30 ml, 100 g) y precio para agregarlos al finalizar cada sesión.
            </span>
          </div>
          {products.length === 0 && (
            <button
              onClick={openCreate}
              className="mt-1 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container transition-all"
            >
              + Registrar Primer Producto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((prod) => {
            const lowStock = prod.stock !== undefined && prod.stock <= 3;
            return (
              <div
                key={prod.id}
                className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high/60 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-secondary-container/50 text-secondary text-[10px] font-bold">
                        {prod.presentation}
                      </span>
                      {prod.category && (
                        <span className="text-[10px] text-outline font-medium truncate">
                          {prod.category}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-base font-bold text-on-surface mt-1.5">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(prod)}
                      aria-label="Editar producto"
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-container/20 text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(prod)}
                      aria-label="Eliminar producto"
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error-container/40 text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/60">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-outline font-bold block">
                      Precio Venta
                    </span>
                    <span className="font-serif text-lg font-bold text-primary">
                      S/ {prod.price.toFixed(2)}
                    </span>
                  </div>

                  {prod.stock !== undefined && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        lowStock
                          ? 'bg-error-container/40 text-error border-error/30'
                          : 'bg-surface-container-low text-on-surface-variant border-surface-container-high'
                      }`}
                    >
                      Stock: {prod.stock} unid.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Agregar / Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 pb-8 sm:pb-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                </span>
                <h3 className="font-serif text-xl font-bold text-primary">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
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

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Gotas Antimicóticas / Crema Urea 20%"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Presentación / Medida (ml, g, unidad) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 30 ml, 100 g, Frasco..."
                  value={presentation}
                  onChange={(e) => setPresentation(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {PRESENTATION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPresentation(preset)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors border ${
                        presentation === preset
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-container-high text-on-surface-variant border-transparent hover:text-primary'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Precio Venta (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Stock Disponible (opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej. 15"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">
                  Categoría
                </label>
                <input
                  type="text"
                  placeholder="Ej. Podología / Antimicóticos"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {CATEGORY_PRESETS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors border ${
                        category === cat
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-surface-container-high text-on-surface-variant border-transparent hover:text-primary'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>{editingProduct ? 'Guardar Cambios' : 'Guardar Producto'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
