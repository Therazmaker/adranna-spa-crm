'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  title?: string;
  showBack?: boolean;
}

export default function Navbar({ title, showBack = false }: NavbarProps) {
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email || 'Usuario';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
          </nav>
        </div>

        {title && (
          <h1 className="hidden lg:block font-serif text-lg font-semibold text-primary truncate max-w-xs">
            {title}
          </h1>
        )}

        <div className="flex items-center gap-2">
          {/* Avatar con monograma e identidad real */}
          <div className="relative group flex items-center pl-1">
            <button
              title={`${displayName} — Cerrar Sesión`}
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
