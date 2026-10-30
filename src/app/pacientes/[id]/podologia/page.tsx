'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_SOFIA_PODOLOGY_RECORD, INITIAL_CLIENTS } from '@/lib/mockData';
import { PodologyRecord, FootFinding } from '@/types/database';
import AnatomicalFootMap from '@/components/AnatomicalFootMap';
import SignaturePad from '@/components/SignaturePad';

export default function PodologiaRecordPage() {
  const params = useParams();
  const clientId = params.id as string;

  const client = INITIAL_CLIENTS.find((c) => c.id === clientId) || INITIAL_CLIENTS[0];
  const [record, setRecord] = useState<PodologyRecord>(INITIAL_SOFIA_PODOLOGY_RECORD);
  const [activeTab, setActiveTab] = useState<'podologia' | 'masajes' | 'historial' | 'resumen'>('podologia');
  const [isSavedBannerVisible, setIsSavedBannerVisible] = useState(false);

  // Risk Factors State
  const [diabetes, setDiabetes] = useState(record.diabetesMellitus);
  const [hypertension, setHypertension] = useState(record.hypertension);
  const [circulation, setCirculation] = useState(record.peripheralCirculation);
  const [latexAllergy, setLatexAllergy] = useState(record.latexAllergy);
  const [treatmentNotes, setTreatmentNotes] = useState(record.appliedTreatment);

  const handleAddFinding = (newFinding: FootFinding) => {
    setRecord({
      ...record,
      findings: [...record.findings, newFinding],
    });
  };

  const handleSaveRecord = () => {
    setIsSavedBannerVisible(true);
    setTimeout(() => setIsSavedBannerVisible(false), 3000);
  };

  return (
    <div className="flex flex-col w-full pb-12 space-y-5">
      {/* Banner de confirmación flotante */}
      {isSavedBannerVisible && (
        <div className="fixed top-20 right-4 z-50 bg-tertiary text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Expediente Clínico Guardado con Auditoría de Firma</span>
        </div>
      )}

      {/* CABECERA DE LA FICHA DEL PACIENTE */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={client.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                alt={client.name}
                className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-primary-container/20"
              />
              <div className="absolute -bottom-1 -right-1 bg-tertiary-fixed text-on-tertiary-fixed p-1 rounded-full shadow-xs flex items-center justify-center">
                <span className="material-symbols-outlined text-sm font-bold">verified</span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-primary-container/10 text-primary-container px-2 py-0.5 rounded-full text-xs uppercase tracking-wider font-bold">
                  Exp. #{record.expNumber}
                </span>
                <span className="bg-secondary-fixed/50 text-on-secondary-fixed text-xs px-2 py-0.5 rounded-full font-bold">
                  Ficha Activa
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl text-on-surface font-bold truncate mt-0.5">
                {client.name}
              </h2>
              <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5 font-medium">
                <span>34 años</span>
                <span>•</span>
                <span className="material-symbols-outlined text-sm text-secondary">phone_iphone</span>
                <span>{client.phone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => window.print()}
              aria-label="Imprimir ficha"
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
              title="Imprimir Ficha"
            >
              <span className="material-symbols-outlined text-base">print</span>
            </button>
          </div>
        </div>

        {/* BANNER DE ALERTA MÉDICA DESTACADA */}
        <div className="bg-error-container/40 border border-error/20 p-3.5 rounded-xl flex items-start gap-3">
          <div className="p-1.5 rounded-full bg-error-container text-on-error-container flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-base text-error">warning</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-error-container uppercase tracking-wide">
                Alerta Clínica Primaria
              </span>
              <span className="text-[10px] font-bold bg-error text-white px-2 py-0.5 rounded-full">
                Precaución Alta
              </span>
            </div>
            <p className="text-xs text-on-surface font-semibold mt-0.5 leading-relaxed">
              ⚠️ Alergia severa: <strong className="text-error">Látex</strong> • Condición:{' '}
              <strong className="text-on-error-container">Diabetes Mellitus Tipo II</strong> (Controlada).
              Se requiere uso exclusivo de guantes de nitrilo y asepsia con solución no iodada.
            </p>
          </div>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN DE LA FICHA */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <Link
            href={`/pacientes/${clientId}`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors whitespace-nowrap"
          >
            Resumen General
          </Link>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-primary shadow-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">footprint</span>
            <span>Podología Clínica</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed"></span>
          </button>
          <Link
            href={`/pacientes/${clientId}/masaje`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">spa</span>
            <span>Ficha Masajes</span>
          </Link>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors whitespace-nowrap"
          >
            Historial de Visitas (8)
          </button>
        </div>
      </section>

      {/* 1. ANTECEDENTES PATOLÓGICOS Y MOTIVO DE CONSULTA */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary-container"></span>
            <h3 className="font-serif text-lg text-on-surface font-bold">
              Antecedentes Patológicos & Factores de Riesgo
            </h3>
          </div>
          <span className="text-xs text-outline uppercase tracking-wider font-semibold">
            Protocolo CIE-11
          </span>
        </div>

        {/* Factores de riesgo interactivos */}
        <div className="bg-surface-container-low p-4 rounded-xl space-y-3 border border-surface-container-high/60">
          <p className="text-xs uppercase tracking-wider text-secondary font-bold">
            Factores de Riesgo Podológico Activos
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Checkbox 1: Diabetes */}
            <div
              onClick={() => setDiabetes(!diabetes)}
              className="flex items-center gap-2.5 bg-surface-container-lowest px-3.5 py-2.5 rounded-xl border border-surface-container-high/80 cursor-pointer transition-all hover:border-primary"
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  diabetes ? 'text-primary-container font-bold' : 'text-outline-variant'
                }`}
              >
                {diabetes ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span className="text-xs text-on-surface font-bold">
                Diabetes Mellitus Tipo II
              </span>
            </div>

            {/* Checkbox 2: Circulación periférica */}
            <div
              onClick={() => setCirculation(!circulation)}
              className="flex items-center gap-2.5 bg-surface-container-lowest px-3.5 py-2.5 rounded-xl border border-surface-container-high/80 cursor-pointer transition-all hover:border-primary"
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  circulation ? 'text-primary-container font-bold' : 'text-outline-variant'
                }`}
              >
                {circulation ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span className="text-xs text-on-surface font-bold">
                Compromiso Circulación Periférica
              </span>
            </div>

            {/* Checkbox 3: Alergia a Látex */}
            <div
              onClick={() => setLatexAllergy(!latexAllergy)}
              className="flex items-center gap-2.5 bg-surface-container-lowest px-3.5 py-2.5 rounded-xl border border-surface-container-high/80 cursor-pointer transition-all hover:border-primary"
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  latexAllergy ? 'text-error font-bold' : 'text-outline-variant'
                }`}
              >
                {latexAllergy ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span className="text-xs text-on-surface font-bold">
                Alergia Severa a Látex
              </span>
            </div>

            {/* Checkbox 4: Hipertensión */}
            <div
              onClick={() => setHypertension(!hypertension)}
              className="flex items-center gap-2.5 bg-surface-container-lowest px-3.5 py-2.5 rounded-xl border border-surface-container-high/80 cursor-pointer transition-all hover:border-primary"
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  hypertension ? 'text-primary-container font-bold' : 'text-outline-variant'
                }`}
              >
                {hypertension ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span className={`text-xs ${hypertension ? 'font-bold text-on-surface' : 'line-through text-outline'}`}>
                Hipertensión Arterial
              </span>
            </div>
          </div>

          {/* Medicación actual */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 border-t border-surface-container-high">
            <span className="text-on-surface-variant font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary-container">
                medication
              </span>
              Medicación habitual del paciente:
            </span>
            <span className="bg-surface-container-lowest text-primary font-bold px-3 py-1 rounded-lg border border-surface-container-high">
              Metformina 850mg (c/12 hrs) • Complejo B
            </span>
          </div>
        </div>

        {/* Motivo de consulta actual */}
        <div className="bg-primary/5 p-4 rounded-xl flex flex-col gap-1.5 border border-primary/15">
          <div className="flex items-center gap-1.5 text-primary">
            <span className="material-symbols-outlined text-base">clinical_notes</span>
            <span className="text-xs font-bold uppercase tracking-wider">
              Motivo de Consulta Principal
            </span>
          </div>
          <p className="font-serif text-sm text-on-surface italic leading-relaxed">
            &ldquo;{record.consultationReason}&rdquo;
          </p>
        </div>
      </section>

      {/* 2. MAPEO ANATÓMICO PODOLÓGICO INTERACTIVO */}
      <AnatomicalFootMap
        findings={record.findings}
        onAddFinding={handleAddFinding}
      />

      {/* 3. TRATAMIENTO CLÍNICO APLICADO */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">
              medical_services
            </span>
            <h3 className="font-serif text-lg text-on-surface font-bold">
              Tratamiento Clínico Aplicado
            </h3>
          </div>
          <span className="text-xs bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-1 rounded-full font-bold">
            Cabina 2 • 45 min
          </span>
        </div>

        <div className="bg-surface-container-low p-4 rounded-xl space-y-3 border border-surface-container-high/60">
          <textarea
            rows={4}
            value={treatmentNotes}
            onChange={(e) => setTreatmentNotes(e.target.value)}
            className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl p-3 text-xs leading-relaxed font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Describe el procedimiento podológico realizado..."
          />

          {/* Indicadores de Esterilización de la sesión */}
          <div className="flex items-center justify-between text-xs bg-surface-container-lowest p-3 rounded-xl border border-surface-container-high">
            <div className="flex items-center gap-2 text-tertiary font-bold">
              <span className="material-symbols-outlined text-base">sanitizer</span>
              <span>Autoclave Instrumental: Ciclo {record.autoclaveCycleNumber}</span>
            </div>
            <span className="text-xs font-bold text-tertiary bg-tertiary-fixed/40 px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              100% Estéril Validado
            </span>
          </div>
        </div>
      </section>

      {/* 4. GALERÍA FOTOGRÁFICA ANTES / DESPUÉS */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">
              photo_camera_back
            </span>
            <h3 className="font-serif text-lg text-on-surface font-bold">
              Evidencia Clínica Comparativa (Antes / Después)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => alert('Selector de captura de imagen o carga desde galería médica')}
            className="text-xs text-primary flex items-center gap-1 font-bold hover:underline"
          >
            <span className="material-symbols-outlined text-sm">add_a_photo</span>
            <span>+ Añadir Fotografía</span>
          </button>
        </div>

        {record.photos.map((photo) => (
          <div key={photo.id} className="grid grid-cols-2 gap-3">
            {/* Tarjeta Antes */}
            <div className="flex flex-col bg-surface-container-low rounded-2xl overflow-hidden shadow-xs border border-surface-container-high">
              <div className="relative h-40 w-full bg-surface-container">
                <img
                  src={photo.beforeUrl}
                  alt={photo.beforeDescription}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-error text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  Antes
                </span>
                <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
                  Sesión #{photo.sessionNumber}
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-on-surface truncate">
                  {photo.title}
                </p>
                <p className="text-[11px] text-outline mt-0.5">
                  {photo.beforeDescription}
                </p>
              </div>
            </div>

            {/* Tarjeta Después */}
            <div className="flex flex-col bg-surface-container-low rounded-2xl overflow-hidden shadow-xs border border-surface-container-high">
              <div className="relative h-40 w-full bg-surface-container">
                <img
                  src={photo.afterUrl}
                  alt={photo.afterDescription}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-tertiary-container text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  Después
                </span>
                <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
                  Curación Aséptica
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-on-surface truncate">
                  Canal liberado y antiséptico
                </p>
                <p className="text-[11px] text-outline mt-0.5">
                  {photo.afterDescription}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* 5. HISTORIAL EVOLUTIVO VISITA POR VISITA */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">history</span>
            <h3 className="font-serif text-lg text-on-surface font-bold">
              Historial Evolutivo Clínico Visita por Visita
            </h3>
          </div>
          <span className="text-xs text-secondary font-bold">
            {record.evolutionHistory.length} Registros Anteriores
          </span>
        </div>

        <div className="space-y-4 pl-2 relative">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-surface-container-high"></div>

          {record.evolutionHistory.map((item, idx) => (
            <div key={item.id} className="relative flex items-start gap-3.5 pl-2">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 shadow-xs ring-4 ring-surface-container-lowest ${
                  idx === 0
                    ? 'bg-primary-container text-white'
                    : 'bg-surface-container-highest text-outline'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white"></span>
              </div>
              <div className="bg-surface-container-low p-3.5 rounded-2xl flex-1 space-y-1 border border-surface-container-high/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    {item.date} • {item.practitionerName}
                  </span>
                  <span className="text-[11px] text-outline font-semibold">{item.time}</span>
                </div>
                <p className="text-xs text-on-surface leading-relaxed font-medium">
                  {item.description}
                </p>
                <p className="text-xs text-secondary font-bold pt-1">
                  Indicación médica: {item.indication}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. CONSENTIMIENTO INFORMADO & FIRMA DIGITAL */}
      <SignaturePad
        signerName={client.name}
        idDoc={record.informedConsent.signerIdDoc}
        initialSignatureSvg={record.informedConsent.signatureSvg}
        initialTimestamp={record.informedConsent.signatureTimestamp}
        initialHash={record.informedConsent.sha256Hash}
      />

      {/* 7. METADATOS, AUDITORÍA Y CONTROL DE ACCIÓN */}
      <section className="bg-surface-container-low p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs border border-surface-container-high">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm shadow-xs">
            EV
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface">
              {record.audit.lastEditedBy} ({record.audit.professionalLicense})
            </p>
            <p className="text-[11px] text-outline">
              Última edición: {record.audit.lastEditedAt} • {record.audit.cabin}
            </p>
          </div>
        </div>

        {/* Botones de Guardar / Imprimir */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-surface-container-highest text-on-surface hover:bg-surface-variant text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Imprimir Ficha</span>
          </button>
          <button
            type="button"
            onClick={handleSaveRecord}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Guardar Registro Clínico</span>
          </button>
        </div>
      </section>
    </div>
  );
}
