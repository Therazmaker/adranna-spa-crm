'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp, bypassLogin } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'terapeuta' | 'recepcion'>('terapeuta');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    if (mode === 'signin') {
      const res = await signIn(email, password);
      if (res.error) {
        setErrorMsg(res.error);
      }
    } else {
      if (!fullName) {
        setErrorMsg('Por favor ingresa tu nombre completo.');
        setIsLoading(false);
        return;
      }
      const res = await signUp(email, password, fullName);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.message) {
        setSuccessMsg(res.message);
      }
    }
    setIsLoading(false);
  };

  const handleDemoLogin = (role: 'admin' | 'terapeuta' | 'recepcion') => {
    if (role === 'admin') {
      bypassLogin('admin@adranna.com', 'Dra. Elena Valdés', 'admin');
    } else if (role === 'terapeuta') {
      bypassLogin('terapeuta@adranna.com', 'Lic. Claudia Nájera', 'terapeuta');
    } else {
      bypassLogin('recepcion@adranna.com', 'Recepción Polanco', 'recepcion');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-surface relative overflow-hidden">
      {/* Elementos decorativos de fondo en tonos clínicos */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary-container/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-xl border border-surface-container-high/80 relative z-10 space-y-6">
        {/* Cabecera / Identidad de Marca */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container/10 border border-primary-container/20 text-primary shadow-xs mb-1">
            <span className="material-symbols-outlined text-[32px]">spa</span>
          </div>
          <div>
            <span className="font-serif text-3xl font-bold text-primary tracking-tight block">
              Adranna Spa
            </span>
            <span className="text-xs uppercase tracking-widest text-secondary font-bold font-sans">
              Clínica Podológica & Terapias
            </span>
          </div>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto pt-1">
            Acceso seguro con permisos por rol y protección de expedientes de salud.
          </p>
        </div>

        {/* Selector de Modo: Iniciar Sesión vs Registro */}
        <div className="grid grid-cols-2 bg-surface-container p-1 rounded-2xl border border-surface-container-high text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Alertas de error o éxito */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex items-start gap-2.5 text-xs text-error font-medium">
            <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-tertiary-fixed/60 border border-tertiary/20 flex items-start gap-2.5 text-xs text-on-tertiary-fixed font-bold">
            <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant block">
                Nombre y Título Profesional
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  badge
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dra. Elena Valdés"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant block">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                mail
              </span>
              <input
                type="email"
                required
                placeholder="profesional@adranna.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant block">
              Contraseña
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>{mode === 'signin' ? 'Ingresar al CRM' : 'Registrar Cuenta'}</span>
              </>
            )}
          </button>
        </form>

        {/* Acceso Rápido de Demostración */}
        <div className="pt-2 border-t border-surface-container-high space-y-2.5">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider block text-center">
            Acceso Rápido por Rol
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high hover:border-primary text-left transition-all"
            >
              <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                <span>Dra. Elena</span>
              </div>
              <span className="text-[10px] text-outline block">Podóloga Titular / Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('terapeuta')}
              className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high hover:border-secondary text-left transition-all"
            >
              <div className="flex items-center gap-1.5 text-secondary text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">spa</span>
                <span>Lic. Claudia</span>
              </div>
              <span className="text-[10px] text-outline block">Masoterapia & Bienestar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
