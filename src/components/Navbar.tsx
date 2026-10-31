'use client';

import BrandLogo from '@/components/BrandLogo';
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  title?: string;
  showBack?: boolean;
}

export default function Navbar({ title, showBack = false }: NavbarProps) {
  const { user, role, isAdmin, signOut } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email || 'Usuario';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    recepcion: { label: 'Recepción', color: 'bg-sky-100 text-sky-800 border-sky-300' },
    terapeuta: { label: 'Terapeuta', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  };

  const currentRole = roleLabels[role] || roleLabels.admin;

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60 shadow-xs">
      <div className="h-16 px-gutter-mobile flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-space-sm">
          {showBack ? (
            <button
              onClick={() => window.history.back()}
              aria-label="Volver"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-on-surface hover:text-primary hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          ) : null}

          <Link href="/" className="flex items-center gap-space-xs">
            <BrandLogo variant="emblem" size={44} />
            <span className="font-serif text-2xl font-bold text-primary tracking-tight">
              Adranna
            </span>
            <span className="text-xs uppercase tracking-widest text-secondary font-semibold font-sans">
              Spa
            </span>
          </Link>

          {/* Links directos en pantallas medianas y grandes */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-surface-container-high/80">
            <Link href="/" className="px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
              Inicio
            </Link>
            <Link href="/agenda" className="px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
              Agenda
            </Link>
            <Link href="/clientes" className="px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
              Clientes
            </Link>
            <Link href="/servicios" className="px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
              Servicios
            </Link>
            <Link href="/equipo" className="px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
              Equipo
            </Link>
            {isAdmin && (
              <Link href="/contabilidad" className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                Contabilidad
              </Link>
            )}
          </nav>
        </div>

        {title && (
          <h1 className="hidden lg:block font-serif text-lg font-semibold text-primary truncate max-w-xs">
            {title}
          </h1>
        )}

        <div className="flex items-center gap-2">
          {/* Badge de Rol */}
          <span className={`hidden sm:inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${currentRole.color}`}>
            {currentRole.label}
          </span>

          {/* Avatar con monograma e identidad real */}
          <div className="relative group flex items-center pl-1">
            <button
              title={`${displayName} (${currentRole.label}) — Cerrar Sesión`}
              onClick={signOut}
              className="flex items-center gap-2 rounded-full hover:bg-surface-container-high/60 px-2 py-1 transition-colors border border-surface-container-high"
              type="button"
              aria-label="Cerrar Sesión"
            >
              <div className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary/30 text-primary font-bold text-xs flex items-center justify-center shadow-xs select-none">
                {initials}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-on-surface-variant max-w-[120px] truncate">
                {displayName}
              </span>
              <span className="material-symbols-outlined text-[16px] text-outline hover:text-error transition-colors" title="Cerrar Sesión">
                logout
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
