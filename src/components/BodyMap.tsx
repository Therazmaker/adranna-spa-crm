'use client';

import React, { useState } from 'react';

interface BodyMapProps {
  selectedZones: string[];
  onToggleZone: (zone: string) => void;
  preferredPressure: 'Suave' | 'Media' | 'Firme' | 'Tejido Profundo';
  onSelectPressure: (pressure: 'Suave' | 'Media' | 'Firme' | 'Tejido Profundo') => void;
  aromatherapyOil: string;
  onSelectAromatherapy: (oil: string) => void;
}

const BODY_ZONES = [
  { id: 'cervical', label: 'Cuello & Cervicales', top: '12%', left: '50%' },
  { id: 'trapecio', label: 'Hombros & Trapecio', top: '22%', left: '50%' },
  { id: 'escapular_izq', label: 'Escapular Izquierdo', top: '30%', left: '38%' },
  { id: 'escapular_der', label: 'Escapular Derecho', top: '30%', left: '62%' },
  { id: 'lumbar', label: 'Zona Lumbar', top: '45%', left: '50%' },
  { id: 'gluteos', label: 'Glúteos & Piramidal', top: '56%', left: '50%' },
  { id: 'muslos', label: 'Muslos & Isquiotibiales', top: '68%', left: '50%' },
  { id: 'gemelos', label: 'Gemelos & Pantorrillas', top: '82%', left: '50%' },
];

const DEFAULT_OILS = [
  'Romero silvestre & Cedro blanco',
  'Eucalipto & Menta revitalizante',
  'Lavanda francesa relajante',
  'Árnica desinflamante & Caléndula',
];

export default function BodyMap({
  selectedZones,
  onToggleZone,
  preferredPressure,
  onSelectPressure,
  aromatherapyOil,
  onSelectAromatherapy,
}: BodyMapProps) {
  const pressureLevels: ('Suave' | 'Media' | 'Firme' | 'Tejido Profundo')[] = [
    'Suave',
    'Media',
    'Firme',
    'Tejido Profundo',
  ];

  const [customOil, setCustomOil] = useState('');

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-secondary"></span>
          <h3 className="font-serif text-lg text-primary font-bold">
            Mapa Corporal de Tensión & Masoterapia
          </h3>
        </div>
        <span className="text-xs bg-secondary-fixed text-on-secondary-fixed px-2.5 py-1 rounded-full font-bold">
          {selectedZones.length} Zonas Marcadas
        </span>
      </div>

      {/* Interactive Body Silhouette */}
      <div className="relative bg-surface-container-low rounded-2xl p-4 flex flex-col items-center justify-center border border-surface-container-high/80">
        <div className="relative w-full max-w-[240px] h-96 flex items-center justify-center select-none">
          <svg
            className="w-full h-full drop-shadow-sm"
            viewBox="0 0 200 360"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Cabeza */}
            <circle cx="100" cy="35" r="20" fill="#E3E2E0" stroke="#C0C8CB" strokeWidth="2" />
            {/* Cuello */}
            <path d="M92 55 L92 70 L108 70 L108 55 Z" fill="#E3E2E0" stroke="#C0C8CB" strokeWidth="2" />
            {/* Torso & Espalda */}
            <path
              d="M60 75 Q100 65 140 75 Q155 120 135 180 Q145 220 130 240 L70 240 Q55 220 65 180 Q45 120 60 75 Z"
              fill="#E3E2E0"
              stroke="#C0C8CB"
              strokeWidth="2"
            />
            {/* Brazos */}
            <path d="M58 85 Q40 130 35 180 L48 185 Q52 140 68 95 Z" fill="#E3E2E0" stroke="#C0C8CB" strokeWidth="1.5" />
            <path d="M142 85 Q160 130 165 180 L152 185 Q148 140 132 95 Z" fill="#E3E2E0" stroke="#C0C8CB" strokeWidth="1.5" />
            {/* Piernas */}
            <path d="M72 240 L65 340 L88 340 L96 240 Z" fill="#E3E2E0" stroke="#C0C8CB" strokeWidth="2" />
            <path d="M128 240 L135 340 L112 340 L104 240 Z" fill="#E3E2E0" stroke="#C0C8CB" strokeWidth="2" />
          </svg>

          {/* Clickable Zone Pin Buttons */}
          {BODY_ZONES.map((zone) => {
            const isSelected = selectedZones.includes(zone.id);
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => onToggleZone(zone.id)}
                style={{ top: zone.top, left: zone.left, transform: 'translate(-50%, -50%)' }}
                className={`absolute z-10 px-2 py-1 rounded-full text-[11px] font-bold transition-all shadow-sm ${
                  isSelected
                    ? 'bg-secondary text-white scale-110 ring-2 ring-secondary/50'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container-high'
                }`}
              >
                {zone.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Presión Preferida */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-secondary font-bold block">
          Nivel de Presión del Masaje
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {pressureLevels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onSelectPressure(lvl)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                preferredPressure === lvl
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container border-transparent'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Aromaterapia / Aceites Esenciales */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-secondary font-bold block">
          Aceite Esencial & Aromaterapia
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEFAULT_OILS.map((oil) => (
            <button
              key={oil}
              type="button"
              onClick={() => onSelectAromatherapy(oil)}
              className={`p-2.5 rounded-xl text-xs text-left font-medium transition-all border flex items-center justify-between ${
                aromatherapyOil === oil
                  ? 'bg-secondary-container/40 text-on-secondary-container border-secondary font-bold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container border-transparent'
              }`}
            >
              <span>{oil}</span>
              {aromatherapyOil === oil && (
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  check_circle
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Campo para ingresar / personalizar el aceite en stock */}
        <div className="pt-1 flex items-center gap-2">
          <input
            type="text"
            placeholder="O escribe otro aceite disponible en cabina (ej. Almendras & Naranja)..."
            value={customOil}
            onChange={(e) => setCustomOil(e.target.value)}
            className="flex-1 bg-surface-container-low border border-surface-container-high rounded-xl p-2.5 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <button
            type="button"
            onClick={() => {
              if (customOil.trim()) {
                onSelectAromatherapy(customOil.trim());
                setCustomOil('');
              }
            }}
            className="px-3 py-2.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary/90 transition-colors"
          >
            Usar Este
          </button>
        </div>

        {aromatherapyOil && !DEFAULT_OILS.includes(aromatherapyOil) && (
          <div className="p-2 rounded-lg bg-secondary-container/30 border border-secondary/20 text-xs font-bold text-secondary flex items-center justify-between">
            <span>Aceite seleccionado: {aromatherapyOil}</span>
            <button
              type="button"
              onClick={() => onSelectAromatherapy('')}
              className="text-outline hover:text-error"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
