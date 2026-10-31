'use client';

import React, { useState, useEffect } from 'react';
import { Appointment, InventoryProduct, SoldProductItem } from '@/types/database';
import { dbService } from '@/lib/dbService';

interface FinalizeSessionModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onFinalized: (updated: Appointment) => void;
}

export default function FinalizeSessionModal({
  appointment,
  onClose,
  onFinalized,
}: FinalizeSessionModalProps) {
  const [wantsProducts, setWantsProducts] = useState<boolean>(false);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick product creation inline
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPres, setNewProdPres] = useState('30 ml');
  const [newProdPrice, setNewProdPrice] = useState<number>(35);

  useEffect(() => {
    if (appointment) {
      setWantsProducts(false);
      setCart({});
      setSearchQuery('');
      setSessionNotes(appointment.notes || '');
      setShowQuickCreate(false);
      dbService.getInventory().then(setInventory);
    }
  }, [appointment]);

  if (!appointment) return null;

  const baseServicePrice =
    appointment.servicePrice !== undefined ? appointment.servicePrice : Number(appointment.price) || 0;

  const soldProducts: SoldProductItem[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([prodId, qty]) => {
      const p = inventory.find((item) => item.id === prodId);
      if (!p) return null;
      return {
        productId: p.id,
        name: p.name,
        presentation: p.presentation,
        unitPrice: p.price,
        quantity: qty,
      };
    })
    .filter(Boolean) as SoldProductItem[];

  const productsTotal = soldProducts.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const finalTotal = baseServicePrice + productsTotal;

  const updateQty = (prodId: string, delta: number) => {
    setCart((prev) => {
      const next = (prev[prodId] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[prodId];
        return copy;
      }
      return { ...prev, [prodId]: next };
    });
  };

  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    const created = await dbService.createInventoryProduct({
      name: newProdName.trim(),
      presentation: newProdPres.trim() || 'Unidad',
      price: Number(newProdPrice) || 0,
      stock: 10,
      category: 'General',
    });
    setInventory((prev) => [created, ...prev]);
    setCart((prev) => ({ ...prev, [created.id]: 1 }));
    setNewProdName('');
    setShowQuickCreate(false);
  };

  const handleConfirmFinalize = async (withProducts: boolean) => {
    if (isSaving) return;
    setIsSaving(true);

    const itemsToSave = withProducts ? soldProducts : [];
    const prodSum = withProducts ? productsTotal : 0;
    const totalPrice = baseServicePrice + prodSum;

    // 1. Descontar stock de los productos vendidos
    if (itemsToSave.length > 0) {
      for (const sold of itemsToSave) {
        const found = inventory.find((p) => p.id === sold.productId);
        if (found && found.stock !== undefined) {
          const nextStock = Math.max(0, found.stock - sold.quantity);
          await dbService.updateInventoryProduct(found.id, { stock: nextStock });
        }
      }
    }

    // 2. Actualizar cita como completada con el desglose de productos y notas
    const updates: Partial<Appointment> = {
      status: 'completado',
      servicePrice: baseServicePrice,
      soldProducts: itemsToSave,
      productsTotal: prodSum,
      price: totalPrice,
      notes: sessionNotes.trim() || undefined,
    };

    await dbService.updateAppointment(appointment.id, updates);

    // 3. Actualizar fecha de última visita y contador del paciente en su perfil
    if (appointment.clientId) {
      const clients = await dbService.getClients();
      const client = clients.find((c) => c.id === appointment.clientId);
      if (client) {
        const completedCount = (await dbService.getAppointments()).filter(
          (a) =>
            (a.clientId === client.id ||
              a.clientName.toLowerCase() === client.name.toLowerCase()) &&
            a.status === 'completado'
        ).length;
        await dbService.updateClient(client.id, {
          lastVisit: appointment.date || new Date().toISOString().slice(0, 10),
          totalVisits: Math.max(client.totalVisits || 1, completedCount),
        });
      }
    }

    setIsSaving(false);
    onFinalized({
      ...appointment,
      ...updates,
    });
  };

  const filteredInventory = inventory.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.presentation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 pb-8 sm:pb-5 shadow-2xl border border-surface-container-high space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
            </span>
            <div>
              <h3 className="font-serif text-xl font-bold text-primary">
                Finalizar Sesión
              </h3>
              <p className="text-xs text-on-surface-variant">
                {appointment.clientName} · {appointment.serviceName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Resumen Servicio + Motivo / Observaciones para el Perfil del Cliente */}
        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">
              Atendido por: <strong className="text-on-surface">{appointment.professionalName}</strong> ({appointment.date} · {appointment.time})
            </span>
            <span className="font-serif text-sm font-bold text-primary">
              S/ {baseServicePrice.toFixed(2)}
            </span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
              Motivo / Qué se le realizó en esta visita (se guardará en el perfil del cliente):
            </label>
            <input
              type="text"
              placeholder="Ej. Profilaxis podológica, extracción de espícula, masaje cervical..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Pregunta de Venta de Productos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">shopping_bag</span>
              ¿El cliente va a comprar algún producto?
            </span>
          </div>

          {!wantsProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleConfirmFinalize(false)}
                className="py-3.5 px-4 rounded-2xl bg-emerald-700 text-white text-xs font-bold shadow-md hover:bg-emerald-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>No, finalizar solo sesión (S/ {baseServicePrice.toFixed(2)})</span>
              </button>

              <button
                type="button"
                onClick={() => setWantsProducts(true)}
                className="py-3.5 px-4 rounded-2xl bg-secondary text-white text-xs font-bold shadow-sm hover:bg-secondary/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>Sí, seleccionar productos</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 border border-secondary/30 bg-secondary-container/10 rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary">
                  Selecciona los productos vendidos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickCreate((v) => !v)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                    <span>{showQuickCreate ? 'Cerrar' : '+ Crear Producto'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWantsProducts(false);
                      setCart({});
                    }}
                    className="text-[11px] text-outline hover:text-error font-semibold"
                  >
                    Sin productos
                  </button>
                </div>
              </div>

              {/* Crear producto rápido si no existe aún */}
              {showQuickCreate && (
                <form
                  onSubmit={handleQuickCreateProduct}
                  className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-2"
                >
                  <span className="text-[10px] uppercase tracking-wider font-bold text-secondary block">
                    Agregar nuevo producto al inventario
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Nombre..."
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="col-span-2 bg-surface-container-low border border-surface-container-high rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface"
                    />
                    <input
                      type="text"
                      placeholder="Ej. 30 ml"
                      value={newProdPres}
                      onChange={(e) => setNewProdPres(e.target.value)}
                      className="bg-surface-container-low border border-surface-container-high rounded-lg px-2 py-1.5 text-xs font-semibold text-on-surface"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-xs font-bold text-on-surface-variant">Precio S/</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(Number(e.target.value))}
                        className="w-24 bg-surface-container-low border border-surface-container-high rounded-lg px-2 py-1 text-xs font-bold text-primary"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold"
                    >
                      Guardar y Agregar
                    </button>
                  </div>
                </form>
              )}

              {/* Buscador de productos */}
              {inventory.length > 3 && (
                <input
                  type="text"
                  placeholder="Buscar producto en inventario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}

              {/* Lista de productos del inventario */}
              {filteredInventory.length === 0 ? (
                <div className="py-4 text-center text-xs text-on-surface-variant">
                  No hay productos registrados en el inventario todavía. Usa <strong>+ Crear Producto</strong> arriba para registrar el primero.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredInventory.map((prod) => {
                    const qty = cart[prod.id] || 0;
                    return (
                      <div
                        key={prod.id}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-colors ${
                          qty > 0
                            ? 'bg-surface-container-lowest border-primary shadow-2xs'
                            : 'bg-surface-container-lowest/70 border-surface-container-high'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">
                            {prod.name}{' '}
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary-container/50 text-secondary ml-1">
                              {prod.presentation}
                            </span>
                          </p>
                          <p className="text-[11px] font-bold text-primary">
                            S/ {prod.price.toFixed(2)}
                            {prod.stock !== undefined && (
                              <span className="text-[10px] text-outline font-normal ml-2">
                                (Stock: {prod.stock})
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {qty > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => updateQty(prod.id, -1)}
                                className="w-7 h-7 rounded-lg bg-surface-container-high text-on-surface font-bold text-sm flex items-center justify-center hover:bg-surface-variant"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-primary">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(prod.id, 1)}
                                className="w-7 h-7 rounded-lg bg-primary text-white font-bold text-sm flex items-center justify-center hover:bg-primary-container"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateQty(prod.id, 1)}
                              className="px-2.5 py-1 rounded-lg bg-primary-container/15 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors"
                            >
                              + Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Desglose de Totales */}
              <div className="pt-2 border-t border-surface-container-high space-y-1 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Servicio ({appointment.serviceName}):</span>
                  <span className="font-semibold">S/ {baseServicePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-secondary font-semibold">
                  <span>Productos ({soldProducts.reduce((s, i) => s + i.quantity, 0)} unid.):</span>
                  <span>+ S/ {productsTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-primary pt-1 border-t border-surface-container-high/60">
                  <span>Total Sesión + Productos:</span>
                  <span className="font-serif text-base">S/ {finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleConfirmFinalize(true)}
                className="w-full py-3.5 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-md hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                <span>
                  {isSaving
                    ? 'Guardando...'
                    : `Confirmar y Finalizar Sesión (S/ ${finalTotal.toFixed(2)})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
