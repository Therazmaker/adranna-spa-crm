'use client';

import React from 'react';
import Link from 'next/link';

interface NavbarProps {
  title?: string;
  showBack?: boolean;
}

export default function Navbar({ title, showBack = false }: NavbarProps) {
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
            <span className="text-xs font-medium">Recepción / Clínica</span>
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

          <div className="flex items-center pl-1">
            <img
              alt="Dra. Elena Valdés"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-secondary/30 shadow-xs"
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
