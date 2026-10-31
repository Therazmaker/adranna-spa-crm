'use client';

import BrandLogo from '@/components/BrandLogo';
import React from 'react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import LoginScreen from '@/components/LoginScreen';
import { useAuth } from '@/context/AuthContext';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  // Pantalla de carga inicial mientras Supabase verifica la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-surface">
        <div className="animate-pulse">
          <BrandLogo variant="full" size={180} />
        </div>
        <div className="text-center space-y-1">
          <span className="text-xs text-on-surface-variant">Verificando sesión clínica...</span>
        </div>
        <span className="material-symbols-outlined text-primary text-[28px] animate-spin">sync</span>
      </div>
    );
  }

  // Sin sesión → mostrar pantalla de login
  if (!user) {
    return <LoginScreen />;
  }

  // Autenticado → mostrar app completa
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-7xl mx-auto px-gutter-mobile">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
