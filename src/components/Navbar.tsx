'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  title?: string;
  showBack?: boolean;
}

export default function Navbar({ title, showBack = false }: NavbarProps) {
  const { user, role, signOut } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email || 'Usuario';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleLabel = {
    admin: 'Admin / Titular',
    terapeuta: 'Terapeuta',
    recepcion: 'Recepción',
  }[role] ?? 'Clínica';

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
            <span className="font-serif text-2xl font-bold text-primary tracking-tight">
              Adranna
            </span>
            <span className="text-xs uppercase tracking-widest text-secondary font-semibold font-sans">
              Spa
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-container/10 text-primary border border-primary-container/15">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
            <span className="text-xs font-medium">{roleLabel}</span>
          </div>
        </div>

        {title && (
          <h1 className="hidden md:block font-serif text-lg font-semibold text-primary truncate max-w-md">
            {title}
          </h1>
        )}

        <div className="flex items-center gap-2">
          <div className="sm:hidden flex items-center px-2 py-0.5 rounded-full bg-primary-container/10 text-primary text-[11px] font-semibold">
            Polanco
          </div>

          <button
            aria-label="Notificaciones"
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high/60 transition-colors relative"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface"></span>
          </button>

          {/* Avatar con monograma e identidad */}
          <div className="relative group flex items-center pl-1">
            <button
              title={`${displayName} — Cerrar Sesión`}
              onClick={signOut}
              className="flex items-center gap-2 rounded-full hover:bg-surface-container-high/60 px-1.5 py-1 transition-colors"
              type="button"
              aria-label="Cerrar Sesión"
            >
              <div className="w-9 h-9 rounded-full bg-primary-container/20 border-2 border-primary/20 text-primary font-bold text-sm flex items-center justify-center shadow-xs select-none">
                {initials}
              </div>
              {/* Nombre visible en pantallas medianas */}
              <span className="hidden md:block text-xs font-semibold text-on-surface-variant max-w-[100px] truncate">
                {displayName.split(' ')[0]}
              </span>
              <span className="hidden md:block material-symbols-outlined text-[16px] text-outline">logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
