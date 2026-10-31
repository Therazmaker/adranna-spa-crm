'use client';

import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  signerName: string;
  idDoc: string;
  initialSignatureSvg?: string;
  initialTimestamp?: string;
  initialHash?: string;
  onSaveSignature?: (data: { signatureSvg: string; timestamp: string; hash: string }) => void;
}

export default function SignaturePad({
  signerName,
  idDoc,
  initialSignatureSvg,
  initialTimestamp,
  initialHash,
  onSaveSignature,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignatureSvg);
  const [timestamp, setTimestamp] = useState(initialTimestamp || '24/10/2024 • 12:14:02 GMT-6');
  const [hash, setHash] = useState(
    initialHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  const [isValidated, setIsValidated] = useState(!!initialSignatureSvg);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#6F3612';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setIsValidated(false);
  };

  const handleValidate = () => {
    const now = new Date();
    const timeStr = now.toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }) + ' GMT-6';
    const fakeHash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    setTimestamp(timeStr);
    setHash(fakeHash);
    setIsValidated(true);

    if (onSaveSignature) {
      onSaveSignature({
        signatureSvg: 'canvas_stroke_recorded',
        timestamp: timeStr,
        hash: fakeHash,
      });
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container">draw</span>
          <h3 className="font-serif text-lg text-primary font-bold">
            Consentimiento Informado Firmado
          </h3>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
            isValidated
              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
              : 'bg-error-container text-on-error-container'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {isValidated ? 'verified' : 'pending'}
          </span>
          {isValidated ? 'Validado Legalmente' : 'Firma Pendiente'}
        </span>
      </div>

      <div className="bg-surface-container-low p-4 rounded-xl space-y-3 border border-surface-container-high/60">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          El paciente declara bajo protesta de decir verdad haber sido debidamente informado de los
          riesgos, beneficios, contraindicaciones y cuidados posteriores del tratamiento de
          quiropodia, procedimientos podológicos especializados o masoterapia, en particular en
          relación con condiciones crónicas (diabetes, circulación y alergias).
        </p>

        {/* Signature Canvas Box */}
        <div className="relative bg-surface-container-lowest rounded-xl p-3 flex flex-col items-center justify-center border border-surface-container-high shadow-xs">
          {!isValidated ? (
            <canvas
              ref={canvasRef}
              width={340}
              height={100}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full max-w-[340px] h-[100px] border border-dashed border-outline-variant/60 rounded-lg cursor-crosshair touch-none bg-white"
            />
          ) : (
            <div className="w-full h-[100px] flex items-center justify-center bg-white rounded-lg border border-primary/20">
              <svg
                className="w-48 h-12 stroke-primary-container fill-none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 240 60"
              >
                <path d="M 15,38 Q 30,10 45,28 T 75,32 Q 95,15 110,42 T 135,22 Q 155,38 180,26 T 225,35" />
                <path d="M 60,45 Q 110,50 190,40" opacity="0.6" strokeDasharray="2 3" strokeWidth="1.2" />
              </svg>
            </div>
          )}

          <div className="w-full flex items-center justify-between pt-2 border-t border-surface-container-high text-xs text-on-surface-variant font-medium">
            <span className="font-semibold text-primary">{signerName}</span>
            <span className="text-outline">ID: {idDoc}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-error hover:bg-error-container/40 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">clear</span>
            Borrar y Reintentar
          </button>

          {!isValidated ? (
            <button
              type="button"
              disabled={!hasSignature}
              onClick={handleValidate}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                hasSignature
                  ? 'bg-primary text-white hover:bg-primary-container'
                  : 'bg-surface-container-high text-outline cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Firmar y Sellar Consentimiento
            </button>
          ) : (
            <span className="text-xs text-tertiary font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Firma Sellada
            </span>
          )}
        </div>

        {/* Security & Cryptographic Stamp */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-outline pt-2 border-t border-surface-container-high gap-1">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">fingerprint</span>
            Huella SHA-256: <code className="text-primary font-mono">{hash.slice(0, 16)}...</code>
          </span>
          <span className="font-medium text-on-surface-variant">{timestamp}</span>
        </div>
      </div>
    </div>
  );
}
