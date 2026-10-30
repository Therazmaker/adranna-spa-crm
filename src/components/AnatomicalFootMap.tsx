'use client';

import React, { useState } from 'react';
import { FootFinding } from '@/types/database';

interface AnatomicalFootMapProps {
  findings: FootFinding[];
  onAddFinding?: (finding: FootFinding) => void;
}

export default function AnatomicalFootMap({ findings, onAddFinding }: AnatomicalFootMapProps) {
  const [activeView, setActiveView] = useState<'dorsal' | 'plantar'>('dorsal');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(findings[0]?.id || null);

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
      title: `Nuevo Hallazgo en Pie ${foot === 'derecho' ? 'Derecho' : 'Izquierdo'}`,
      severity: 'Seguimiento',
      description: `Punto localizado en vista ${activeView} (${x}%, ${y}%). Registrar diagnóstico específico.`,
      markerCoords: { x, y },
    };

    onAddFinding(newFinding);
    setSelectedFindingId(newFinding.id);
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
                d="M75 30 C65 30 55 45 55 65 C55 90 60 115 62 135 C64 155 60 175 60 195 C60 215 75 225 90 225 C105 225 118 215 118 190 C118 165 112 140 112 110 C112 80 118 55 112 40 C108 28 95 30 75 30 Z"
                fill={activeView === 'dorsal' ? '#E3E2E0' : '#D8D5D0'}
                stroke="#C0C8CB"
                strokeWidth="1.5"
              />
              {/* Dedos izquierdos */}
              <ellipse cx="65" cy="32" rx="7" ry="11" fill="#C9C7C1" stroke="#A8B0B3" />
              <ellipse cx="80" cy="24" rx="6" ry="10" fill="#C9C7C1" stroke="#A8B0B3" />
              <ellipse cx="93" cy="27" rx="5" ry="9" fill="#C9C7C1" stroke="#A8B0B3" />
              <ellipse cx="104" cy="33" rx="4.5" ry="8" fill="#C9C7C1" stroke="#A8B0B3" />
              <ellipse cx="113" cy="42" rx="4" ry="7" fill="#C9C7C1" stroke="#A8B0B3" />
              <text
                x="85"
                y="160"
                fill="#70787C"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fontSize="9"
                fontWeight="700"
                letterSpacing="1"
                textAnchor="middle"
              >
                PIE IZQUIERDO
              </text>
            </g>

            {/* Pie Derecho */}
            <g opacity="0.9" className="transition-all hover:opacity-100">
              <path
                d="M225 30 C245 30 255 45 255 65 C255 90 250 115 248 135 C246 155 250 175 250 195 C250 215 235 225 220 225 C205 225 192 215 192 190 C192 165 198 140 198 110 C198 80 192 55 198 40 C202 28 215 30 225 30 Z"
                fill={activeView === 'dorsal' ? '#E3E2E0' : '#D8D5D0'}
                stroke="#C0C8CB"
                strokeWidth="1.5"
              />
              {/* Dedos derechos */}
              <ellipse cx="245" cy="32" rx="7" ry="11" fill="#C9C7C1" stroke="#A8B0B3" />
              <ellipse cx="230" cy="24" rx="6" ry="10" fill="#C9C7C1" stroke="#A8B0B3" />
              <ellipse cx="217" cy="27" rx="5" ry="9" fill="#C9C7C1" stroke="#A8B0B3" />
              <ellipse cx="206" cy="33" rx="4.5" ry="8" fill="#C9C7C1" stroke="#A8B0B3" />
              <ellipse cx="197" cy="42" rx="4" ry="7" fill="#C9C7C1" stroke="#A8B0B3" />
              <text
                x="225"
                y="160"
                fill="#70787C"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fontSize="9"
                fontWeight="700"
                letterSpacing="1"
                textAnchor="middle"
              >
                PIE DERECHO
              </text>
            </g>
          </svg>

          {/* Interactive Marker Pins */}
          {findings.map((f) => {
            const isSelected = f.id === selectedFindingId;
            const bgClass =
              f.severity === 'Agudo'
                ? 'bg-error text-on-error'
                : f.severity === 'Crónico'
                ? 'bg-secondary text-on-secondary'
                : 'bg-primary-container text-on-primary';

            return (
              <button
                key={f.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFindingId(f.id);
                }}
                style={{
                  left: `${f.markerCoords.x}%`,
                  top: `${f.markerCoords.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute z-20 focus:outline-none transition-transform ${
                  isSelected ? 'scale-125 ring-4 ring-primary/30 z-30' : 'hover:scale-110'
                }`}
                aria-label={`Hallazgo ${f.markerNumber}: ${f.title}`}
              >
                <span className="relative flex h-7 w-7">
                  {f.severity === 'Agudo' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-40"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-7 w-7 ${bgClass} items-center justify-center font-bold text-xs shadow-md border-2 border-surface`}
                  >
                    {f.markerNumber}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-outline font-medium text-center mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">touch_app</span>
          Toca cualquier marcador para ver diagnóstico o haz clic en el pie para agregar uno nuevo.
        </p>
      </div>

      {/* Selected Finding Detail Box */}
      {selectedFinding && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-3.5 space-y-1.5 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center text-white ${
                  selectedFinding.severity === 'Agudo'
                    ? 'bg-error'
                    : selectedFinding.severity === 'Crónico'
                    ? 'bg-secondary'
                    : 'bg-primary-container'
                }`}
              >
                {selectedFinding.markerNumber}
              </span>
              <h4 className="font-semibold text-primary text-sm">
                {selectedFinding.title}
              </h4>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                selectedFinding.severity === 'Agudo'
                  ? 'bg-error-container text-on-error-container'
                  : selectedFinding.severity === 'Crónico'
                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {selectedFinding.severity}
            </span>
          </div>
          <p className="text-xs text-on-surface leading-relaxed">
            {selectedFinding.description}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-outline pt-1">
            <span>Ubicación: Pie {selectedFinding.foot} ({selectedFinding.view})</span>
            <span>•</span>
            <span className="capitalize">Condición: {selectedFinding.condition}</span>
          </div>
        </div>
      )}

      {/* Findings List Table */}
      <div className="space-y-2 pt-1">
        {findings.map((finding) => (
          <div
            key={finding.id}
            onClick={() => setSelectedFindingId(finding.id)}
            className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-all border ${
              finding.id === selectedFindingId
                ? 'bg-surface-container-low border-primary/30 shadow-xs'
                : 'bg-surface-container-low/60 border-transparent hover:bg-surface-container-low'
            }`}
          >
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
