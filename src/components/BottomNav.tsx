'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Inicio', path: '/', icon: 'spa' },
    { label: 'Agenda', path: '/agenda', icon: 'calendar_today' },
    { label: 'Clientes', path: '/clientes', icon: 'group' },
    { label: 'Servicios', path: '/servicios', icon: 'medical_services' },
    { label: 'Equipo', path: '/equipo', icon: 'badge' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/92 backdrop-blur-xl border-t border-surface-container-high/80 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-lg mx-auto flex items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? pathname === '/'
              : pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all ${
                isActive
                  ? 'text-primary font-bold scale-105'
                  : 'text-on-surface-variant/80 hover:text-primary font-medium'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[24px] ${
                  isActive ? 'fill-1' : ''
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[11px] tracking-tight mt-0.5">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5 animate-pulse"></span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
