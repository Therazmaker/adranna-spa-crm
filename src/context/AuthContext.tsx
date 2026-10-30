'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: 'admin' | 'terapeuta' | 'recepcion';
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; message?: string }>;
  signOut: () => Promise<void>;
  bypassLogin: (mockEmail: string, mockName: string, role: 'admin' | 'terapeuta' | 'recepcion') => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: 'admin',
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  bypassLogin: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'terapeuta' | 'recepcion'>('admin');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sesión activa en Supabase
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Verificar si hay sesión en localStorage
      const savedUser = localStorage.getItem('adranna_auth_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured()) {
      // Mock login si no hay supabase
      const mockUser = { id: 'usr-demo', email, user_metadata: { full_name: 'Dra. Elena Valdés' } } as unknown as User;
      setUser(mockUser);
      localStorage.setItem('adranna_auth_user', JSON.stringify(mockUser));
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      setUser(data.user);
      setSession(data.session);
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al iniciar sesión';
      return { error: message };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: string | null; message?: string }> => {
    if (!isSupabaseConfigured()) {
      const mockUser = { id: `usr-${Date.now()}`, email, user_metadata: { full_name: fullName } } as unknown as User;
      setUser(mockUser);
      localStorage.setItem('adranna_auth_user', JSON.stringify(mockUser));
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'terapeuta',
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      // Si Supabase requiere confirmación de email:
      if (data.user && !data.session) {
        return {
          error: null,
          message: 'Usuario registrado. Revisa tu correo para confirmar la cuenta (o inicia sesión si tu Supabase tiene confirmación desactivada).',
        };
      }

      setUser(data.user);
      setSession(data.session);
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar usuario';
      return { error: message };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem('adranna_auth_user');
  };

  const bypassLogin = (mockEmail: string, mockName: string, selectedRole: 'admin' | 'terapeuta' | 'recepcion') => {
    const mockUser = {
      id: `usr-${Date.now()}`,
      email: mockEmail,
      user_metadata: { full_name: mockName },
    } as unknown as User;
    setUser(mockUser);
    setRole(selectedRole);
    localStorage.setItem('adranna_auth_user', JSON.stringify(mockUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        signIn,
        signUp,
        signOut,
        bypassLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
