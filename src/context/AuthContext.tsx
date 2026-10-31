'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: 'recepcion',
  isAdmin: false,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const VALID_ROLES: UserRole[] = ['admin', 'recepcion', 'terapeuta'];

/**
 * El rol sale de `app_metadata.role`, que SOLO puede modificar el servidor con la
 * service role key (el usuario no puede editarlo). Si no tiene rol asignado, se
 * le da el de menor privilegio (recepción) hasta que un admin le asigne uno.
 */
function resolveRole(user: User | null): UserRole {
  const r = user?.app_metadata?.role as UserRole | undefined;
  return r && VALID_ROLES.includes(r) ? r : 'recepcion';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const role = resolveRole(user);

  useEffect(() => {
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
      // Modo local sin Supabase: sesión simulada con rol admin
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('adranna_auth_user') : null;
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
      const mockUser = {
        id: 'usr-admin',
        email,
        app_metadata: { role: 'admin' },
        user_metadata: { full_name: 'Administrador' },
      } as unknown as User;
      setUser(mockUser);
      localStorage.setItem('adranna_auth_user', JSON.stringify(mockUser));
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
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
      const mockUser = {
        id: `usr-${Date.now()}`,
        email,
        app_metadata: { role: 'admin' },
        user_metadata: { full_name: fullName },
      } as unknown as User;
      setUser(mockUser);
      localStorage.setItem('adranna_auth_user', JSON.stringify(mockUser));
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) return { error: error.message };

      if (data.user && !data.session) {
        return {
          error: null,
          message: 'Usuario registrado. Inicia sesión con tus credenciales.',
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adranna_auth_user');
      localStorage.removeItem('adranna_user_role');
    }
  };

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{ user, session, role, isAdmin, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
