'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: string | null; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: 'admin',
  setRole: () => {},
  isAdmin: true,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRoleState] = useState<UserRole>('admin');
  const [isLoading, setIsLoading] = useState(true);

  // Helper para asignar rol y guardarlo
  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adranna_user_role', newRole);
    }
  };

  useEffect(() => {
    // 1. Obtener rol guardado en localStorage si existe
    const savedRole = (typeof window !== 'undefined' ? localStorage.getItem('adranna_user_role') : null) as UserRole | null;

    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        const metadataRole = currentUser?.user_metadata?.role as UserRole | undefined;
        if (savedRole) {
          setRoleState(savedRole);
        } else if (metadataRole) {
          setRoleState(metadataRole);
        } else {
          setRoleState('admin'); // Por defecto el primer usuario registrado es admin
        }

        setIsLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        const metadataRole = currentUser?.user_metadata?.role as UserRole | undefined;
        if (savedRole) {
          setRoleState(savedRole);
        } else if (metadataRole) {
          setRoleState(metadataRole);
        }

        setIsLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('adranna_auth_user') : null;
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          setRoleState(savedRole || (parsed.user_metadata?.role as UserRole) || 'admin');
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured()) {
      const mockUser = { id: 'usr-admin', email, user_metadata: { full_name: 'Administrador', role: 'admin' } } as unknown as User;
      setUser(mockUser);
      setRole('admin');
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

      const assignedRole = (data.user?.user_metadata?.role as UserRole) || 'admin';
      setRole(assignedRole);

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al iniciar sesión';
      return { error: message };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    assignedRole: UserRole = 'terapeuta'
  ): Promise<{ error: string | null; message?: string }> => {
    if (!isSupabaseConfigured()) {
      const mockUser = { id: `usr-${Date.now()}`, email, user_metadata: { full_name: fullName, role: assignedRole } } as unknown as User;
      setUser(mockUser);
      setRole(assignedRole);
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
            role: assignedRole,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user && !data.session) {
        return {
          error: null,
          message: 'Usuario registrado. Inicia sesión con tus credenciales.',
        };
      }

      setUser(data.user);
      setSession(data.session);
      setRole(assignedRole);
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
      value={{
        user,
        session,
        role,
        setRole,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
