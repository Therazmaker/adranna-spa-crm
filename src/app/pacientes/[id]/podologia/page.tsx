'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_SOFIA_PODOLOGY_RECORD, EMPTY_CLIENT } from '@/lib/mockData';
import { dbService } from '@/lib/dbService';
import { PodologyRecord, FootFinding, Client } from '@/types/database';
import AnatomicalFootMap from '@/components/AnatomicalFootMap';
import SignaturePad from '@/components/SignaturePad';

export default function PodologiaRecordPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client>(EMPTY_CLIENT);
  const [record, setRecord] = useState<PodologyRecord>(INITIAL_SOFIA_PODOLOGY_RECORD);
  const [isSavedBannerVisible, setIsSavedBannerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Risk Factors State
  const [diabetes, setDiabetes] = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [circulation, setCirculation] = useState(false);
  const [latexAllergy, setLatexAllergy] = useState(false);
  const [medications, setMedications] = useState('');
  const [consultationReason, setConsultationReason] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [showAntecedentes, setShowAntecedentes] = useState(false);

  useEffect(() => {
    Promise.all([dbService.getClients(), dbService.getPodologyRecord(clientId)]).then(
      ([clients, rec]) => {
        const found = clients.find((c) => c.id === clientId);
        if (found) {
          setClient(found);
        }

        const preConds = found?.preexistingConditions || [];
        const hasDiabFromClient = found?.hasMedicalAlert || preConds.includes('Diabetes Mellitus');
        const hasHyperFromClient = preConds.includes('Hipertensión');
        const hasCircFromClient = preConds.includes('Mala Circulación');
        const hasLatexFromClient = preConds.includes('Alergia al Látex');
        const medsFromClient = found?.currentMedications || '';

        if (rec) {
          setRecord(rec);
          setDiabetes(rec.diabetesMellitus || hasDiabFromClient);
          setHypertension(rec.hypertension || hasHyperFromClient);
          setCirculation(rec.peripheralCirculation || hasCircFromClient);
          setLatexAllergy(rec.latexAllergy || hasLatexFromClient);
          setTreatmentNotes(rec.appliedTreatment || '');
          setMedications(
            (rec.currentMedications && rec.currentMedications.length > 0)
              ? rec.currentMedications.join(', ')
              : medsFromClient
          );
          setConsultationReason(rec.consultationReason || '');
          if (
            rec.diabetesMellitus ||
            rec.hypertension ||
            rec.peripheralCirculation ||
            rec.latexAllergy ||
            (rec.currentMedications && rec.currentMedications.length > 0) ||
            preConds.length > 0 ||
            medsFromClient
          ) {
            setShowAntecedentes(true);
          }
        } else {
          // Si es nueva ficha, auto-poblar antecedentes desde la ficha general
          setDiabetes(hasDiabFromClient);
          setHypertension(hasHyperFromClient);
          setCirculation(hasCircFromClient);
          setLatexAllergy(hasLatexFromClient);
          setMedications(medsFromClient);
          if (preConds.length > 0 || medsFromClient || hasDiabFromClient) {
            setShowAntecedentes(true);
          }
        }
      }
    );
  }, [clientId]);

  const handleAddFinding = (newFinding: FootFinding) => {
    setRecord((prev) => ({
      ...prev,
      findings: [...prev.findings, newFinding],
    }));
  };

  const handleUpdateFinding = (updatedFinding: FootFinding) => {
    setRecord((prev) => ({
      ...prev,
      findings: prev.findings.map((f) => (f.id === updatedFinding.id ? updatedFinding : f)),
    }));
  };

  const handleDeleteFinding = (findingId: string) => {
    setRecord((prev) => ({
      ...prev,
      findings: prev.findings.filter((f) => f.id !== findingId),
    }));
  };

  const handleSaveRecord = async () => {
    setIsSaving(true);
    const updatedRecord: PodologyRecord = {
      ...record,
      clientId,
      diabetesMellitus: diabetes,
      hypertension,
      peripheralCirculation: circulation,
      latexAllergy,
      consultationReason: consultationReason.trim(),
      currentMedications: medications.split(',').map((m) => m.trim()).filter(Boolean),
      appliedTreatment: treatmentNotes.trim(),
      audit: {
        lastEditedBy: 'Especialista en Podología',
        professionalLicense: '',
        lastEditedAt: new Date().toLocaleString('es-MX'),
        cabin: 'Cabina 1',
      },
    };

    await dbService.savePodologyRecord(updatedRecord);
    setRecord(updatedRecord);
    setIsSaving(false);
    setIsSavedBannerVisible(true);
    setTimeout(() => setIsSavedBannerVisible(false), 3500);
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

  const hasAnyAlert = client.hasMedicalAlert || diabetes || latexAllergy;

  return (
    <div className="flex flex-col w-full pb-12 space-y-5">
      {/* Banner de confirmación flotante */}
      {isSavedBannerVisible && (
        <div className="fixed top-20 right-4 z-50 bg-tertiary text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Expediente Podológico Guardado con Éxito</span>
        </div>
      )}

      {/* CABECERA DE LA FICHA DEL PACIENTE */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              {client.avatarUrl ? (
                <img
                  src={client.avatarUrl}
                  alt={client.name}
                  className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-primary-container/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-container/15 border border-primary-container/30 text-primary font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-xs">
                  {getInitials(client.name || 'Paciente')}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-primary-container/10 text-primary px-2 py-0.5 rounded-full text-xs uppercase tracking-wider font-bold">
                  Ficha Podológica
                </span>
                <span className="bg-secondary-fixed/50 text-on-secondary-fixed text-xs px-2 py-0.5 rounded-full font-bold">
                  {client.totalVisits || 1} {client.totalVisits === 1 ? 'Visita' : 'Visitas'}
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl text-on-surface font-bold truncate mt-0.5">
                {client.name}
              </h2>
              <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5 font-medium">
                <span className="material-symbols-outlined text-sm text-secondary">phone_iphone</span>
                <span>{client.phone || 'Sin teléfono'}</span>
                {client.email && (
                  <>
                    <span>•</span>
                    <span className="truncate">{client.email}</span>
                  </>
                )}
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

        {/* ALERTA MÉDICA SI EXISTE REALMENTE */}
        {hasAnyAlert && (
          <div className="bg-error-container/40 border border-error/20 p-3 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-base text-error mt-0.5">warning</span>
            <div className="flex-1 text-xs font-semibold text-on-surface">
              <span className="font-bold text-error block">Alerta Clínica Activa:</span>
              <span>
                {diabetes && '• Diabetes Mellitus registrada '}
                {latexAllergy && '• Alergia Severa a Látex '}
                {client.medicalAlertDescription && `• ${client.medicalAlertDescription}`}
              </span>
            </div>
          </div>
        )}

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
        </div>
      </section>

      {/* 1. MAPEO ANATÓMICO PODOLÓGICO INTERACTIVO (Ahora al inicio) */}
      <AnatomicalFootMap
        findings={record.findings}
        onAddFinding={handleAddFinding}
        onUpdateFinding={handleUpdateFinding}
        onDeleteFinding={handleDeleteFinding}
      />

      {/* 2. TRATAMIENTO CLÍNICO APLICADO */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">medical_services</span>
            <h3 className="font-serif text-lg text-on-surface font-bold">
              Tratamiento Clínico Aplicado
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          <textarea
            rows={4}
            value={treatmentNotes}
            onChange={(e) => setTreatmentNotes(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs leading-relaxed font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Describe aquí el procedimiento realizado (corte anatómico, espiculotomía, desbridamiento, curación oclusiva, etc.)..."
          />
        </div>
      </section>

      {/* 3. ANTECEDENTES PATOLÓGICOS, FACTORES DE RIESGO & MEDICACIÓN (Al final y activable según necesidad) */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high/60 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-secondary"></span>
            <h3 className="font-serif text-lg text-on-surface font-bold">
              Antecedentes Patológicos & Factores de Riesgo
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAntecedentes(!showAntecedentes)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>{showAntecedentes ? 'Ocultar' : 'Activar / Registrar'}</span>
            <span className="material-symbols-outlined text-[16px]">
              {showAntecedentes ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>

        {showAntecedentes ? (
          <div className="space-y-4 pt-1 animate-fadeIn">
            {/* Factores de riesgo activos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => setDiabetes(!diabetes)}
                className="flex items-center gap-2.5 bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-surface-container-high cursor-pointer transition-all hover:border-primary"
              >
                <span className={`material-symbols-outlined text-lg ${diabetes ? 'text-primary font-bold' : 'text-outline-variant'}`}>
                  {diabetes ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span className="text-xs text-on-surface font-bold">Diabetes Mellitus</span>
              </div>

              <div
                onClick={() => setCirculation(!circulation)}
                className="flex items-center gap-2.5 bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-surface-container-high cursor-pointer transition-all hover:border-primary"
              >
                <span className={`material-symbols-outlined text-lg ${circulation ? 'text-primary font-bold' : 'text-outline-variant'}`}>
                  {circulation ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span className="text-xs text-on-surface font-bold">Compromiso Circulación Periférica</span>
              </div>

              <div
                onClick={() => setLatexAllergy(!latexAllergy)}
                className="flex items-center gap-2.5 bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-surface-container-high cursor-pointer transition-all hover:border-primary"
              >
                <span className={`material-symbols-outlined text-lg ${latexAllergy ? 'text-error font-bold' : 'text-outline-variant'}`}>
                  {latexAllergy ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span className="text-xs text-on-surface font-bold">Alergia Severa a Látex</span>
              </div>

              <div
                onClick={() => setHypertension(!hypertension)}
                className="flex items-center gap-2.5 bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-surface-container-high cursor-pointer transition-all hover:border-primary"
              >
                <span className={`material-symbols-outlined text-lg ${hypertension ? 'text-primary font-bold' : 'text-outline-variant'}`}>
                  {hypertension ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span className="text-xs text-on-surface font-bold">Hipertensión Arterial</span>
              </div>
            </div>

            {/* Medicación habitual editable */}
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Medicación habitual que toma el paciente:
              </label>
              <input
                type="text"
                placeholder="Ej. Ninguna, o Metformina 850mg, Losartán 50mg, etc..."
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Motivo de consulta editable */}
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-1">
                Motivo de Consulta Principal:
              </label>
              <textarea
                rows={2}
                placeholder="Escribe por qué asiste el paciente a consulta hoy (ej. Dolor en uña de primer dedo derecho al caminar)..."
                value={consultationReason}
                onChange={(e) => setConsultationReason(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-outline italic">
            Sin antecedentes especiales activos. Si el paciente presenta diabetes, alergias o toma medicamentos, pulsa &quot;Activar / Registrar&quot; arriba.
          </p>
        )}
      </section>

      {/* 4. CONSENTIMIENTO INFORMADO & FIRMA DIGITAL */}
      <SignaturePad
        signerName={client.name}
        idDoc={record.informedConsent?.signerIdDoc || 'DOC-REG'}
        initialSignatureSvg={record.informedConsent?.signatureSvg}
        initialTimestamp={record.informedConsent?.signatureTimestamp}
        initialHash={record.informedConsent?.sha256Hash}
      />

      {/* 5. BOTONES DE GUARDAR / IMPRIMIR */}
      <section className="bg-surface-container-low p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs border border-surface-container-high">
        <span className="text-xs text-on-surface-variant font-medium">
          Asegúrate de guardar los cambios antes de salir de la ficha.
        </span>

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
            disabled={isSaving}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-container text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Guardar Ficha Podológica</span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
