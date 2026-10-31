'use client';

import React, { useState } from 'react';
import { FootFinding } from '@/types/database';

interface AnatomicalFootMapProps {
  findings: FootFinding[];
  onAddFinding?: (finding: FootFinding) => void;
  onUpdateFinding?: (finding: FootFinding) => void;
  onDeleteFinding?: (id: string) => void;
}

const CONDITIONS: { label: string; value: FootFinding['condition'] }[] = [
  { label: 'Hiperqueratosis / Dureza', value: 'hiperqueratosis' },
  { label: 'Uña encarnada (Onicocriptosis)', value: 'onicocriptosis' },
  { label: 'Micosis / Hongos', value: 'micosis' },
  { label: 'Papiloma / Verruga', value: 'verruga' },
];

export default function AnatomicalFootMap({
  findings,
  onAddFinding,
  onUpdateFinding,
  onDeleteFinding,
}: AnatomicalFootMapProps) {
  const [activeView, setActiveView] = useState<'dorsal' | 'plantar'>('dorsal');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(findings[0]?.id || null);
  const [editingFinding, setEditingFinding] = useState<FootFinding | null>(null);

  const selectedFinding = findings.find((f) => f.id === selectedFindingId);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onAddFinding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const foot = x < 50 ? 'izquierdo' : 'derecho';
    const newNumber = findings.length + 1;

    const newFinding: FootFinding = {
      id: `f-${Date.now()}`,
      markerNumber: newNumber,
      foot,
      view: activeView,
      condition: 'hiperqueratosis',
      title: `Hallazgo #${newNumber} (Pie ${foot === 'derecho' ? 'Derecho' : 'Izquierdo'})`,
      severity: 'Seguimiento',
      description: `Punto localizado en vista ${activeView}. Escribe aquí el diagnóstico...`,
      markerCoords: { x, y },
    };

    onAddFinding(newFinding);
    setSelectedFindingId(newFinding.id);
    // Abrir automáticamente el editor para que el usuario escriba lo que es
    setEditingFinding(newFinding);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFinding || !onUpdateFinding) return;
    onUpdateFinding(editingFinding);
    setEditingFinding(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este marcador de hallazgo?')) return;
    onDeleteFinding?.(id);
    if (selectedFindingId === id) setSelectedFindingId(null);
    if (editingFinding?.id === id) setEditingFinding(null);
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-secondary"></span>
          <h3 className="font-serif text-lg text-primary font-bold">
            Mapeo Anatómico Podológico
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-1 rounded-full font-bold">
            {findings.length} Hallazgos Registrados
          </span>
        </div>
      </div>

      {/* Canvas View Container */}
      <div className="relative bg-surface-container-low rounded-2xl p-4 flex flex-col items-center justify-center overflow-hidden border border-surface-container-high/80">
        {/* Selector Dorsal / Plantar */}
        <div className="self-end mb-2 flex bg-surface-container-highest p-0.5 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveView('dorsal')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'dorsal'
                ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Vista Dorsal
          </button>
          <button
            type="button"
            onClick={() => setActiveView('plantar')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'plantar'
                ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Vista Plantar
          </button>
        </div>

        {/* Anatomical SVG Diagram with clickable overlay */}
        <div
          onClick={handleCanvasClick}
          className="relative w-full max-w-[340px] h-72 flex items-center justify-center select-none cursor-crosshair group"
          title="Haz clic sobre cualquier zona del pie para registrar un nuevo hallazgo"
        >
          <svg
            className="w-full h-full drop-shadow-sm"
            fill="none"
            viewBox="0 0 300 240"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Pie Izquierdo */}
            <g opacity="0.9" className="transition-all hover:opacity-100">
              <path
                d="M100 20 C75 22 55 45 52 75 C48 115 58 160 62 195 C64 212 75 225 90 225 C105 225 115 212 118 195 C122 160 132 115 128 75 C125 45 115 20 100 20 Z"
                fill="#F3F0EC"
                stroke="#0F4C5C"
                strokeWidth="2.5"
              />
              <ellipse cx="62" cy="38" rx="8" ry="14" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
              <ellipse cx="78" cy="28" rx="6.5" ry="11" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
              <ellipse cx="90" cy="22" rx="6" ry="10" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
              <ellipse cx="102" cy="18" rx="5.5" ry="9" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
              <ellipse cx="114" cy="16" rx="5" ry="8" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
            </g>

            {/* Pie Derecho */}
            <g opacity="0.9" className="transition-all hover:opacity-100">
              <path
                d="M200 20 C215 20 225 45 228 75 C232 115 222 160 218 195 C215 212 205 225 190 225 C175 225 164 212 162 195 C158 160 148 115 152 75 C155 45 175 22 200 20 Z"
                fill="#F3F0EC"
                stroke="#0F4C5C"
                strokeWidth="2.5"
              />
              <ellipse cx="186" cy="16" rx="5" ry="8" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
              <ellipse cx="198" cy="18" rx="5.5" ry="9" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
              <ellipse cx="210" cy="22" rx="6" ry="10" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
              <ellipse cx="222" cy="28" rx="6.5" ry="11" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
              <ellipse cx="238" cy="38" rx="8" ry="14" fill="#F3F0EC" stroke="#0F4C5C" strokeWidth="1.5" />
            </g>

            {activeView === 'plantar' ? (
              <text x="150" y="130" textAnchor="middle" fill="#0F4C5C" fontSize="12" fontWeight="bold" opacity="0.4">
                VISTA PLANTAR
              </text>
            ) : (
              <text x="150" y="130" textAnchor="middle" fill="#0F4C5C" fontSize="12" fontWeight="bold" opacity="0.4">
                VISTA DORSAL
              </text>
            )}
          </svg>

          {/* Marcadores sobre el mapa */}
          {findings.map((f) => {
            const isSelected = f.id === selectedFindingId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFindingId(f.id);
                  setEditingFinding(f);
                }}
                style={{
                  top: `${f.markerCoords.y}%`,
                  left: `${f.markerCoords.x}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute z-10 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-transform hover:scale-125 ${
                  isSelected
                    ? 'ring-4 ring-primary-container scale-110 z-20'
                    : ''
                } ${
                  f.severity === 'Agudo'
                    ? 'bg-error text-white'
                    : f.severity === 'Crónico'
                    ? 'bg-secondary text-white'
                    : 'bg-primary-container text-white'
                }`}
                title={`${f.title} (Clic para editar)`}
              >
                <span>{f.markerNumber}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-outline font-medium text-center mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">touch_app</span>
          Haz clic en cualquier parte del pie para agregar un punto, o toca un marcador para editarlo.
        </p>
      </div>

      {/* Editor del Hallazgo Seleccionado */}
      {editingFinding && (
        <form
          onSubmit={handleSaveEdit}
          className="bg-primary-container/10 border-2 border-primary/30 rounded-2xl p-4 space-y-3 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center">
                {editingFinding.markerNumber}
              </span>
              <h4 className="font-serif font-bold text-primary text-sm">
                Editar Diagnóstico del Hallazgo #{editingFinding.markerNumber}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(editingFinding.id)}
              className="px-2.5 py-1 rounded-lg bg-error-container/40 text-error hover:bg-error-container text-xs font-bold flex items-center gap-1 transition-colors"
              title="Borrar hallazgo"
            >
              <span className="material-symbols-outlined text-[15px]">delete</span>
              <span>Eliminar</span>
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">
              Nombre / Diagnóstico del Hallazgo *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Uña encarnada lateral / Heloma interdigital / Verruga plantar"
              value={editingFinding.title}
              onChange={(e) => setEditingFinding({ ...editingFinding, title: e.target.value })}
              className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Tipo de Condición
              </label>
              <select
                value={editingFinding.condition}
                onChange={(e) => setEditingFinding({ ...editingFinding, condition: e.target.value as FootFinding['condition'] })}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Severidad
              </label>
              <select
                value={editingFinding.severity}
                onChange={(e) => setEditingFinding({ ...editingFinding, severity: e.target.value as FootFinding['severity'] })}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Agudo">Agudo (Dolor / Inflamación)</option>
                <option value="Crónico">Crónico (Recurrente)</option>
                <option value="Seguimiento">Seguimiento / Preventivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface-variant block mb-1">
              Descripción Clínica & Observaciones
            </label>
            <textarea
              rows={2}
              placeholder="Describe estado de la uña, tejido, profundidad, dolor referido por el paciente..."
              value={editingFinding.description}
              onChange={(e) => setEditingFinding({ ...editingFinding, description: e.target.value })}
              className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingFinding(null)}
              className="px-3.5 py-2 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-bold hover:bg-surface-container"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-container flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Guardar Hallazgo</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Hallazgos */}
      <div className="space-y-2 pt-1">
        {findings.length === 0 ? (
          <p className="text-xs text-outline text-center py-4 bg-surface-container-low rounded-xl">
            No hay hallazgos marcados en el pie. Haz clic en el diagrama anatómico para registrar uno.
          </p>
        ) : (
          findings.map((finding) => (
            <div
              key={finding.id}
              onClick={() => {
                setSelectedFindingId(finding.id);
                setEditingFinding(finding);
              }}
              className={`p-3 rounded-xl flex items-start justify-between gap-3 cursor-pointer transition-all border ${
                finding.id === selectedFindingId
                  ? 'bg-surface-container-low border-primary/40 shadow-xs'
                  : 'bg-surface-container-low/60 border-transparent hover:bg-surface-container-low'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 text-white ${
                    finding.severity === 'Agudo'
                      ? 'bg-error'
                      : finding.severity === 'Crónico'
                      ? 'bg-secondary'
                      : 'bg-primary-container'
                  }`}
                >
                  {finding.markerNumber}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-semibold text-sm text-on-surface truncate">
                      {finding.title}
                    </h5>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        finding.severity === 'Agudo'
                          ? 'bg-error-container text-on-error-container'
                          : finding.severity === 'Crónico'
                          ? 'bg-secondary-fixed text-on-secondary-fixed'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {finding.severity}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                    {finding.description}
                  </p>
                  <span className="text-[10px] text-outline mt-1 block">
                    Pie {finding.foot} ({finding.view}) • Haz clic para editar
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(finding.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-error-container/40 text-error flex-shrink-0"
                title="Eliminar hallazgo"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
