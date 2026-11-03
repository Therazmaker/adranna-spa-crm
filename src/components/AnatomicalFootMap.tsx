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
  { label: 'Uña encarnada (Onicocriptosis)', value: 'onicocriptosis' },
  { label: 'Hiperqueratosis / Dureza plantar', value: 'hiperqueratosis' },
  { label: 'Micosis / Onicomicosis (Hongos)', value: 'micosis' },
  { label: 'Papiloma / Verruga plantar', value: 'verruga' },
  { label: 'Heloma (Callo interdigital / dorsal)', value: 'heloma' },
  { label: 'Otro hallazgo clínico', value: 'otro' },
];

const QUICK_PRESETS: { title: string; condition: FootFinding['condition']; desc: string; view: 'dorsal' | 'plantar' }[] = [
  {
    title: 'Onicocriptosis (Uña encarnada)',
    condition: 'onicocriptosis',
    desc: 'Inflamación y espícula ungueal en canal lateral.',
    view: 'dorsal',
  },
  {
    title: 'Onicomicosis (Hongo ungueal)',
    condition: 'micosis',
    desc: 'Engrosamiento, cambio de coloración y distrofia de la lámina.',
    view: 'dorsal',
  },
  {
    title: 'Hiperqueratosis plantar (Dureza)',
    condition: 'hiperqueratosis',
    desc: 'Engrosamiento de la capa córnea por hiperpresión de apoyo.',
    view: 'plantar',
  },
  {
    title: 'Heloma / Ojo de gallo',
    condition: 'heloma',
    desc: 'Núcleo hiperqueratósico doloroso a la presión digital.',
    view: 'plantar',
  },
  {
    title: 'Papiloma / Verruga plantar',
    condition: 'verruga',
    desc: 'Lesión viral con puntos negros y dolor al pellizco.',
    view: 'plantar',
  },
  {
    title: 'Grietas / Fisuras en talón',
    condition: 'hiperqueratosis',
    desc: 'Sequedad extrema y fisuración en borde de talón.',
    view: 'plantar',
  },
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

  const dorsalFindings = findings.filter((f) => (f.view || 'dorsal') === 'dorsal');
  const plantarFindings = findings.filter((f) => f.view === 'plantar');
  const activeViewFindings = activeView === 'dorsal' ? dorsalFindings : plantarFindings;
  const otherViewCount = activeView === 'dorsal' ? plantarFindings.length : dorsalFindings.length;

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onAddFinding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const foot = x < 50 ? 'izquierdo' : 'derecho';
    const newNumber = findings.length + 1;

    const defaultTitle =
      activeView === 'dorsal'
        ? `Hallazgo #${newNumber} (Dorsal - Pie ${foot === 'derecho' ? 'Der.' : 'Izq.'})`
        : `Hallazgo #${newNumber} (Plantar - Pie ${foot === 'derecho' ? 'Der.' : 'Izq.'})`;

    const newFinding: FootFinding = {
      id: `f-${Date.now()}`,
      markerNumber: newNumber,
      foot,
      view: activeView,
      condition: activeView === 'dorsal' ? 'onicocriptosis' : 'hiperqueratosis',
      title: defaultTitle,
      severity: 'Seguimiento',
      description: `Ubicado en ${activeView === 'dorsal' ? 'empeine / uña dorsal' : 'planta / apoyo plantar'}.`,
      markerCoords: { x, y },
    };

    onAddFinding(newFinding);
    setSelectedFindingId(newFinding.id);
    setEditingFinding(newFinding);
  };

  const handleSelectFinding = (finding: FootFinding) => {
    if (finding.view && finding.view !== activeView) {
      setActiveView(finding.view);
    }
    setSelectedFindingId(finding.id);
    setEditingFinding(finding);
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

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    if (!editingFinding) return;
    setEditingFinding({
      ...editingFinding,
      title: preset.title,
      condition: preset.condition,
      description: preset.desc,
      view: preset.view,
    });
    if (preset.view !== activeView) {
      setActiveView(preset.view);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/60 p-4 sm:p-5 space-y-4">
      {/* Cabecera del componente */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">footprint</span>
          </span>
          <div>
            <h3 className="font-serif text-lg text-primary font-bold">
              Mapeo Anatómico Podológico
            </h3>
            <p className="text-[11px] text-on-surface-variant">
              Registra afecciones, uñas encarnadas, callosidades y puntos de dolor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary-container/20 text-primary px-3 py-1 rounded-full font-bold">
            {findings.length} {findings.length === 1 ? 'Hallazgo' : 'Hallazgos'}
          </span>
        </div>
      </div>

      {/* Contenedor del Diagrama Anatómico */}
      <div className="relative bg-surface-container-low rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center border border-surface-container-high/80">
        {/* Barra Superior con Selector Dorsal vs Plantar */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
            <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
            <span>
              Vista activa:{' '}
              <strong className="text-primary font-bold">
                {activeView === 'dorsal' ? 'Dorsal (Empeine & Uñas)' : 'Plantar (Planta & Apoyos)'}
              </strong>
            </span>
          </div>

          {/* Botones de Cambio de Vista */}
          <div className="flex bg-surface-container-high/70 p-1 rounded-xl text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveView('dorsal')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'dorsal'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">pan_tool_alt</span>
              <span>Vista Dorsal ({dorsalFindings.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('plantar')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === 'plantar'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">do_not_step</span>
              <span>Vista Plantar ({plantarFindings.length})</span>
            </button>
          </div>
        </div>

        {/* Aviso si hay hallazgos en la otra vista */}
        {otherViewCount > 0 && (
          <div className="mb-2 px-3 py-1 rounded-full bg-secondary-container/30 border border-secondary/20 text-[11px] font-semibold text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            <span>
              Hay {otherViewCount} hallazgo(s) en la{' '}
              {activeView === 'dorsal' ? 'Vista Plantar' : 'Vista Dorsal'}.
            </span>
            <button
              type="button"
              onClick={() => setActiveView(activeView === 'dorsal' ? 'plantar' : 'dorsal')}
              className="underline font-bold hover:text-primary ml-1"
            >
              Cambiar vista
            </button>
          </div>
        )}

        {/* Lienzo Interactivo con SVG Anatómico Profesional */}
        <div
          onClick={handleCanvasClick}
          className="relative w-full max-w-[500px] aspect-[540/450] flex items-center justify-center select-none cursor-crosshair group my-1"
          title="Haz clic sobre cualquier zona del pie para registrar un nuevo hallazgo"
        >
          {activeView === 'dorsal' ? (
            /* ═══════════════════════════════════════════════════════════════════
               VISTA DORSAL: Empeine, dedos con uñas (láminas ungueales)
               ═══════════════════════════════════════════════════════════════════ */
            <svg
              className="w-full h-full drop-shadow-md transition-opacity duration-200"
              fill="none"
              viewBox="0 0 540 460"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="skinDorsal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FCFAF7" />
                  <stop offset="50%" stopColor="#F6EFE6" />
                  <stop offset="100%" stopColor="#EEDFD0" />
                </linearGradient>
                <linearGradient id="nailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="55%" stopColor="#FDF7F2" />
                  <stop offset="100%" stopColor="#EED5C0" />
                </linearGradient>
                <filter id="shadowDorsal" x="-6%" y="-6%" width="112%" height="112%">
                  <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#5C3218" floodOpacity="0.14" />
                </filter>
              </defs>

              {/* Pie Izquierdo Dorsal */}
              <g id="pie-izq-dorsal" filter="url(#shadowDorsal)">
                {/* Contorno anatómico con curvatura podológica real */}
                <path
                  d="
                    M 165 418
                    C 135 418 116 398 112 368
                    C 107 330 96 260 88 200
                    C 82 150 85 105 100 86
                    C 107 77 116 80 120 95
                    C 123 72 134 62 143 67
                    C 151 72 153 86 154 98
                    C 157 65 168 52 179 57
                    C 187 62 189 77 189 94
                    C 193 54 206 42 217 48
                    C 226 54 227 72 227 94
                    C 232 44 250 34 262 44
                    C 274 54 274 78 271 115
                    C 267 165 258 215 252 260
                    C 245 315 240 365 236 386
                    C 230 412 202 418 165 418 Z
                  "
                  fill="url(#skinDorsal)"
                  stroke="#6B3A1E"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* Láminas Ungueales (Uñas) */}
                {/* Dedo 1 - Hallux (Uña mayor) */}
                <path
                  d="M 244 52 C 250 42 260 42 265 49 C 269 56 268 67 266 75 C 260 77 250 77 245 75 C 242 67 241 57 244 52 Z"
                  fill="url(#nailGrad)"
                  stroke="#7A4222"
                  strokeWidth="1.6"
                />
                <path d="M 247 71 C 253 73 259 73 263 71" stroke="#B87B52" strokeWidth="1" strokeLinecap="round" />

                {/* Dedo 2 */}
                <path
                  d="M 205 54 C 210 47 218 49 221 54 C 223 60 222 67 221 72 C 217 74 209 74 205 72 C 203 67 203 59 205 54 Z"
                  fill="url(#nailGrad)"
                  stroke="#7A4222"
                  strokeWidth="1.3"
                />

                {/* Dedo 3 */}
                <path
                  d="M 168 62 C 172 56 179 57 182 62 C 184 67 183 74 182 78 C 178 80 171 80 168 78 C 166 73 166 67 168 62 Z"
                  fill="url(#nailGrad)"
                  stroke="#7A4222"
                  strokeWidth="1.3"
                />

                {/* Dedo 4 */}
                <path
                  d="M 134 72 C 138 67 144 68 147 72 C 149 76 148 82 147 85 C 143 87 137 87 134 85 C 132 81 132 76 134 72 Z"
                  fill="url(#nailGrad)"
                  stroke="#7A4222"
                  strokeWidth="1.2"
                />

                {/* Dedo 5 (Meñique) */}
                <path
                  d="M 105 85 C 108 81 114 82 116 85 C 118 89 117 94 116 97 C 113 98 108 98 105 97 C 104 93 104 89 105 85 Z"
                  fill="url(#nailGrad)"
                  stroke="#7A4222"
                  strokeWidth="1.2"
                />

                {/* Tendones extensores sutiles */}
                <path d="M 250 95 C 244 140 232 190 222 230" stroke="#7A4222" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                <path d="M 214 92 C 210 140 200 190 194 230" stroke="#7A4222" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
                <path d="M 176 98 C 174 145 170 190 167 230" stroke="#7A4222" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />

                {/* Maléolos (tobillo) */}
                <path d="M 128 350 C 137 345 150 345 158 350" stroke="#7A4222" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
                <path d="M 212 353 C 220 349 230 350 236 355" stroke="#7A4222" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
              </g>

              {/* Pie Derecho Dorsal (Reflejo simétrico a través de x=270) */}
              <use href="#pie-izq-dorsal" transform="translate(540, 0) scale(-1, 1)" />

              {/* Rótulos de Orientación Anatómica */}
              <text x="175" y="445" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#6B3A1E" letterSpacing="1">
                PIE IZQUIERDO
              </text>
              <text x="365" y="445" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#6B3A1E" letterSpacing="1">
                PIE DERECHO
              </text>
            </svg>
          ) : (
            /* ═══════════════════════════════════════════════════════════════════
               VISTA PLANTAR: Suela, pulpejos (sin uñas), arco y talón
               ═══════════════════════════════════════════════════════════════════ */
            <svg
              className="w-full h-full drop-shadow-md transition-opacity duration-200"
              fill="none"
              viewBox="0 0 540 460"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="skinPlantar" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FCFAF7" />
                  <stop offset="45%" stopColor="#F5ECE1" />
                  <stop offset="100%" stopColor="#ECDCCB" />
                </linearGradient>
                <linearGradient id="padGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FBF4ED" />
                  <stop offset="100%" stopColor="#E5D1BE" />
                </linearGradient>
                <filter id="shadowPlantar" x="-6%" y="-6%" width="112%" height="112%">
                  <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#5C3218" floodOpacity="0.14" />
                </filter>
              </defs>

              {/* Pie Izquierdo Plantar */}
              <g id="pie-izq-plantar" filter="url(#shadowPlantar)">
                {/* Silueta plantar con marcada concavidad del arco interno */}
                <path
                  d="
                    M 165 418
                    C 135 418 116 398 112 368
                    C 106 330 96 260 88 195
                    C 82 145 84 105 98 86
                    C 105 77 114 80 119 95
                    C 122 72 133 62 142 67
                    C 150 72 152 86 153 98
                    C 156 65 167 52 178 57
                    C 186 62 188 77 188 94
                    C 192 54 205 42 216 48
                    C 225 54 226 72 226 94
                    C 231 44 249 34 261 44
                    C 273 54 273 78 270 115
                    C 266 148 255 178 245 200
                    C 222 245 218 290 224 335
                    C 228 368 230 388 226 400
                    C 220 414 195 418 165 418 Z
                  "
                  fill="url(#skinPlantar)"
                  stroke="#6B3A1E"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* Almohadilla Plantar Metatarsal (Antepié) */}
                <path
                  d="M 98 135 C 105 120 135 110 180 112 C 225 114 256 126 262 142 C 255 162 225 172 180 170 C 135 168 105 155 98 135 Z"
                  fill="url(#padGrad)"
                  stroke="#8C5532"
                  strokeWidth="1.3"
                  opacity="0.8"
                />

                {/* Almohadilla del Talón (Calcáneo) */}
                <ellipse
                  cx="166"
                  cy="378"
                  rx="42"
                  ry="30"
                  fill="url(#padGrad)"
                  stroke="#8C5532"
                  strokeWidth="1.3"
                  opacity="0.8"
                />

                {/* Pulpejos de los Dedos (Almohadillas carnosas, sin uñas) */}
                {/* Pulpejo Hallux */}
                <ellipse cx="251" cy="62" rx="14" ry="17" fill="url(#padGrad)" stroke="#7A4222" strokeWidth="1.5" />
                <path d="M 242 74 C 248 77 256 77 260 74" stroke="#8C5532" strokeWidth="1" strokeLinecap="round" />

                {/* Pulpejo Dedo 2 */}
                <ellipse cx="211" cy="67" rx="9" ry="13" fill="url(#padGrad)" stroke="#7A4222" strokeWidth="1.3" />
                <path d="M 205 76 C 210 78 215 78 218 76" stroke="#8C5532" strokeWidth="1" strokeLinecap="round" />

                {/* Pulpejo Dedo 3 */}
                <ellipse cx="174" cy="74" rx="8" ry="12" fill="url(#padGrad)" stroke="#7A4222" strokeWidth="1.3" />
                <path d="M 169 82 C 173 84 177 84 180 82" stroke="#8C5532" strokeWidth="1" strokeLinecap="round" />

                {/* Pulpejo Dedo 4 */}
                <ellipse cx="140" cy="82" rx="7" ry="10" fill="url(#padGrad)" stroke="#7A4222" strokeWidth="1.2" />
                <path d="M 136 89 C 139 91 143 91 145 89" stroke="#8C5532" strokeWidth="1" strokeLinecap="round" />

                {/* Pulpejo Dedo 5 */}
                <ellipse cx="110" cy="94" rx="6.5" ry="9" fill="url(#padGrad)" stroke="#7A4222" strokeWidth="1.2" />
                <path d="M 106 100 C 109 101 112 101 114 100" stroke="#8C5532" strokeWidth="1" strokeLinecap="round" />

                {/* Textura y relieve de la bóveda plantar */}
                <path d="M 235 240 C 220 270 215 305 218 340" stroke="#8C5532" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 4" opacity="0.45" />
                <path d="M 245 220 C 230 260 225 295 228 325" stroke="#8C5532" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
                <path d="M 100 180 C 106 230 115 300 120 340" stroke="#8C5532" strokeWidth="1" strokeLinecap="round" strokeDasharray="3 3" opacity="0.25" />
              </g>

              {/* Pie Derecho Plantar (Reflejo simétrico a través de x=270) */}
              <use href="#pie-izq-plantar" transform="translate(540, 0) scale(-1, 1)" />

              {/* Rótulos de Orientación Anatómica */}
              <text x="175" y="445" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#6B3A1E" letterSpacing="1">
                PIE IZQUIERDO
              </text>
              <text x="365" y="445" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#6B3A1E" letterSpacing="1">
                PIE DERECHO
              </text>
            </svg>
          )}

          {/* Marcadores sobre el mapa para la vista activa */}
          {activeViewFindings.map((f) => {
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
                className={`absolute z-10 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all hover:scale-125 ${
                  isSelected ? 'ring-4 ring-primary-container scale-110 z-20' : ''
                } ${
                  f.severity === 'Agudo'
                    ? 'bg-error text-white'
                    : f.severity === 'Crónico'
                    ? 'bg-secondary text-white'
                    : 'bg-primary text-white'
                }`}
                title={`#${f.markerNumber}: ${f.title} (Clic para editar)`}
              >
                <span>{f.markerNumber}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-outline font-medium text-center mt-2 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">touch_app</span>
          <span>
            Haz clic en cualquier punto del pie para agregar un hallazgo clínico en{' '}
            <strong className="text-on-surface">
              {activeView === 'dorsal' ? 'Vista Dorsal' : 'Vista Plantar'}
            </strong>
            .
          </span>
        </p>
      </div>

      {/* Editor del Hallazgo Seleccionado */}
      {editingFinding && (
        <form
          onSubmit={handleSaveEdit}
          className="bg-primary-container/10 border-2 border-primary/30 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center">
                {editingFinding.markerNumber}
              </span>
              <h4 className="font-serif font-bold text-primary text-sm sm:text-base">
                Editar Hallazgo #{editingFinding.markerNumber}
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

          {/* Chips de selección rápida para agilizar el diagnóstico */}
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
              Diagnósticos frecuentes (clic para autocompletar):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-surface-container-high hover:border-primary text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px] text-secondary">add_circle</span>
                  <span>{preset.title.split(' (')[0]}</span>
                </button>
              ))}
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Pie Afectado
              </label>
              <select
                value={editingFinding.foot}
                onChange={(e) =>
                  setEditingFinding({
                    ...editingFinding,
                    foot: e.target.value as FootFinding['foot'],
                  })
                }
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="izquierdo">Pie Izquierdo</option>
                <option value="derecho">Pie Derecho</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Cara / Vista
              </label>
              <select
                value={editingFinding.view}
                onChange={(e) => {
                  const newView = e.target.value as FootFinding['view'];
                  setEditingFinding({
                    ...editingFinding,
                    view: newView,
                  });
                  setActiveView(newView);
                }}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="dorsal">Vista Dorsal</option>
                <option value="plantar">Vista Plantar</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Tipo de Condición
              </label>
              <select
                value={editingFinding.condition}
                onChange={(e) =>
                  setEditingFinding({
                    ...editingFinding,
                    condition: e.target.value as FootFinding['condition'],
                  })
                }
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Severidad
              </label>
              <select
                value={editingFinding.severity}
                onChange={(e) =>
                  setEditingFinding({
                    ...editingFinding,
                    severity: e.target.value as FootFinding['severity'],
                  })
                }
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
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

      {/* Lista de Hallazgos Registrados */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface">
            Historial de Hallazgos Marcados ({findings.length})
          </span>
          <span className="text-[11px] text-outline">
            Toca cualquier hallazgo para ubicarlo en el pie
          </span>
        </div>

        {findings.length === 0 ? (
          <p className="text-xs text-outline text-center py-5 bg-surface-container-low rounded-xl border border-dashed border-surface-container-high">
            No hay hallazgos marcados. Haz clic sobre cualquier zona del pie en el diagrama para registrar uno.
          </p>
        ) : (
          findings.map((finding) => (
            <div
              key={finding.id}
              onClick={() => handleSelectFinding(finding)}
              className={`p-3 rounded-xl flex items-start justify-between gap-3 cursor-pointer transition-all border ${
                finding.id === selectedFindingId
                  ? 'bg-surface-container-low border-primary shadow-xs'
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
                      : 'bg-primary'
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
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        finding.view === 'plantar'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-blue-100 text-blue-900 border border-blue-200'
                      }`}
                    >
                      {finding.view === 'plantar' ? 'Planta' : 'Dorsal'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                      Pie {finding.foot === 'derecho' ? 'Derecho' : 'Izquierdo'}
                    </span>
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
