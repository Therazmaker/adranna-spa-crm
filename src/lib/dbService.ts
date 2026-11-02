import { supabase, isSupabaseConfigured } from './supabase';
import {
  INITIAL_CLIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_SOFIA_PODOLOGY_RECORD,
  INITIAL_CAMILA_MASSAGE_RECORD,
} from './mockData';
import {
  Client,
  Appointment,
  PodologyRecord,
  MassageRecord,
  Professional,
  ServicePackage,
  Expense,
  InventoryProduct,
  SoldProductItem,
} from '@/types/database';

export interface PendingSyncItem {
  id: string;
  table:
    | 'clients'
    | 'appointments'
    | 'expenses'
    | 'professionals'
    | 'services'
    | 'inventory_products'
    | 'podology_records'
    | 'massage_records';
  action: 'insert' | 'update' | 'upsert' | 'delete';
  recordId: string;
  matchColumn?: string;
  payload?: Record<string, unknown>;
  label: string;
  createdAt: string;
}

const QUEUE_KEY = 'adranna_offline_queue';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function notifySyncSubscribers() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('adranna-sync-change'));
  }
}

function enqueueSync(item: Omit<PendingSyncItem, 'id' | 'createdAt'>) {
  if (typeof window === 'undefined') return;
  const queue = readLocal<PendingSyncItem[]>(QUEUE_KEY, []);

  // Si ya hay un delete para este registro, o si estamos haciendo delete de algo que aún no se subió:
  if (item.action === 'delete') {
    const hadInsertOnly = queue.find(
      (q) => q.table === item.table && q.recordId === item.recordId && q.action === 'insert'
    );
    if (hadInsertOnly) {
      // Si se creó offline y luego se borró offline, se cancelan entre sí
      const filtered = queue.filter((q) => !(q.table === item.table && q.recordId === item.recordId));
      writeLocal(QUEUE_KEY, filtered);
      notifySyncSubscribers();
      return;
    }
  }

  // Si ya existe un insert o update pendiente para el mismo registro, fusionar el payload
  const existingIdx = queue.findIndex(
    (q) =>
      q.table === item.table &&
      q.recordId === item.recordId &&
      (q.action === item.action || (q.action === 'insert' && item.action === 'update'))
  );

  if (existingIdx >= 0 && item.payload) {
    queue[existingIdx] = {
      ...queue[existingIdx],
      payload: { ...(queue[existingIdx].payload || {}), ...item.payload },
      label: item.label,
    };
    writeLocal(QUEUE_KEY, queue);
  } else {
    const newItem: PendingSyncItem = {
      ...item,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };
    writeLocal(QUEUE_KEY, [...queue, newItem]);
  }
  notifySyncSubscribers();
}

let isSyncingNow = false;

export const dbService = {
  // ─── COLA DE SINCRONIZACIÓN OFFLINE ─────────────────────────────────────────

  getPendingQueue(): PendingSyncItem[] {
    return readLocal<PendingSyncItem[]>(QUEUE_KEY, []);
  },

  getPendingSyncCount(): number {
    return this.getPendingQueue().length;
  },

  async syncPendingQueue(): Promise<{ synced: number; remaining: number }> {
    if (typeof window === 'undefined' || !isSupabaseConfigured() || !isBrowserOnline()) {
      const count = this.getPendingSyncCount();
      return { synced: 0, remaining: count };
    }
    if (isSyncingNow) {
      return { synced: 0, remaining: this.getPendingSyncCount() };
    }

    const queue = this.getPendingQueue();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    isSyncingNow = true;
    notifySyncSubscribers();

    let syncedCount = 0;
    const remainingQueue: PendingSyncItem[] = [];

    for (const item of queue) {
      if (!isBrowserOnline()) {
        remainingQueue.push(item);
        continue;
      }

      try {
        const col = item.matchColumn || 'id';
        let err: { message?: string; code?: string } | null = null;

        if (item.action === 'insert') {
          const { error } = await supabase.from(item.table).upsert(item.payload ?? {}, { onConflict: col });
          err = error;
        } else if (item.action === 'update') {
          const { error } = await supabase
            .from(item.table)
            .update(item.payload ?? {})
            .eq(col, item.recordId);
          err = error;
        } else if (item.action === 'upsert') {
          const { error } = await supabase
            .from(item.table)
            .upsert(item.payload ?? {}, { onConflict: col });
          err = error;
        } else if (item.action === 'delete') {
          const { error } = await supabase.from(item.table).delete().eq(col, item.recordId);
          err = error;
        }

        if (err) {
          // Si es un error de red/fetch lo mantenemos en cola; si la tabla opcional no existe en Supabase (42P01/PGRST), no bloqueamos la cola
          const msg = (err.message || '').toLowerCase();
          const isNetworkErr =
            msg.includes('fetch') ||
            msg.includes('network') ||
            msg.includes('failed to fetch') ||
            msg.includes('timeout');
          if (isNetworkErr) {
            remainingQueue.push(item);
          } else {
            console.warn(`Sync warning on ${item.table}:`, err.message);
            syncedCount++;
          }
        } else {
          syncedCount++;
        }
      } catch {
        // Error de red al intentar conectar con Supabase → conservar en cola
        remainingQueue.push(item);
      }
    }

    writeLocal(QUEUE_KEY, remainingQueue);
    isSyncingNow = false;
    notifySyncSubscribers();

    return { synced: syncedCount, remaining: remainingQueue.length };
  },

  // ─── GASTOS Y CONTABILIDAD ──────────────────────────────────────────────────

  async getExpenses(): Promise<Expense[]> {
    const cached = readLocal<Expense[]>('adranna_expenses', []);

    if (isSupabaseConfigured() && isBrowserOnline()) {
      await this.syncPendingQueue();
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .order('date', { ascending: false });
        if (!error && data) {
          const mapped: Expense[] = data.map((e) => ({
            id: e.id,
            description: e.description,
            amount: Number(e.amount) || 0,
            category: e.category || 'insumos',
            date: e.date,
            paymentMethod: e.payment_method || 'efectivo',
            notes: e.notes,
            createdAt: e.created_at,
          }));
          if (mapped.length > 0 || cached.length === 0) {
            writeLocal('adranna_expenses', mapped);
            return mapped;
          }
        }
      } catch {
        // fallback a caché local
      }
    }

    return cached;
  },

  async createExpense(exp: Omit<Expense, 'id'>): Promise<Expense> {
    const id = generateUUID();
    const newExp: Expense = { id, ...exp, createdAt: new Date().toISOString() };

    const current = readLocal<Expense[]>('adranna_expenses', []);
    writeLocal('adranna_expenses', [newExp, ...current]);

    const row = {
      id,
      description: exp.description,
      amount: exp.amount,
      category: exp.category,
      date: exp.date,
      payment_method: exp.paymentMethod,
      notes: exp.notes || null,
    };

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'expenses',
          action: 'insert',
          recordId: id,
          payload: row,
          label: `Gasto: ${exp.description}`,
        });
      } else {
        try {
          const { error } = await supabase.from('expenses').insert(row);
          if (error && error.message?.toLowerCase().includes('fetch')) {
            enqueueSync({
              table: 'expenses',
              action: 'insert',
              recordId: id,
              payload: row,
              label: `Gasto: ${exp.description}`,
            });
          }
        } catch {
          enqueueSync({
            table: 'expenses',
            action: 'insert',
            recordId: id,
            payload: row,
            label: `Gasto: ${exp.description}`,
          });
        }
      }
    }

    return newExp;
  },

  async deleteExpense(id: string): Promise<boolean> {
    const current = readLocal<Expense[]>('adranna_expenses', []);
    writeLocal(
      'adranna_expenses',
      current.filter((e) => e.id !== id)
    );

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'expenses',
          action: 'delete',
          recordId: id,
          label: 'Eliminar gasto',
        });
      } else {
        try {
          const { error } = await supabase.from('expenses').delete().eq('id', id);
          if (error && error.message?.toLowerCase().includes('fetch')) {
            enqueueSync({
              table: 'expenses',
              action: 'delete',
              recordId: id,
              label: 'Eliminar gasto',
            });
          }
        } catch {
          enqueueSync({
            table: 'expenses',
            action: 'delete',
            recordId: id,
            label: 'Eliminar gasto',
          });
        }
      }
    }
    return true;
  },

  // ─── CLIENTES ────────────────────────────────────────────────────────────────

  async getClients(): Promise<Client[]> {
    if (!isSupabaseConfigured()) return INITIAL_CLIENTS;
    const cached = readLocal<Client[]>('adranna_clients', []);

    if (isBrowserOnline()) {
      await this.syncPendingQueue();
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          const mapped = data.map(mapClient);
          writeLocal('adranna_clients', mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('getClients offline fallback:', err);
      }
    }

    return cached;
  },

  async createClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const id = generateUUID();
    const createdAt = new Date().toISOString();
    const newClient: Client = { id, ...client, createdAt };

    const current = readLocal<Client[]>('adranna_clients', []);
    writeLocal('adranna_clients', [newClient, ...current]);

    if (!isSupabaseConfigured()) return newClient;

    const row = {
      id,
      name: client.name,
      phone: client.phone || null,
      email: client.email || null,
      birthdate: client.birthdate || null,
      avatar_url: client.avatarUrl || null,
      tags: client.tags || [],
      total_visits: client.totalVisits || 1,
      notes: client.notes || null,
      has_medical_alert: client.hasMedicalAlert || false,
      medical_alert_description: client.medicalAlertDescription || null,
    };

    if (!isBrowserOnline()) {
      enqueueSync({
        table: 'clients',
        action: 'insert',
        recordId: id,
        payload: row,
        label: `Nuevo paciente: ${client.name}`,
      });
      return newClient;
    }

    try {
      const { data, error } = await supabase.from('clients').insert(row).select().single();
      if (error) {
        enqueueSync({
          table: 'clients',
          action: 'insert',
          recordId: id,
          payload: row,
          label: `Nuevo paciente: ${client.name}`,
        });
        return newClient;
      }
      const mapped = mapClient(data);
      writeLocal(
        'adranna_clients',
        [mapped, ...current.filter((c) => c.id !== id)]
      );
      return mapped;
    } catch {
      enqueueSync({
        table: 'clients',
        action: 'insert',
        recordId: id,
        payload: row,
        label: `Nuevo paciente: ${client.name}`,
      });
      return newClient;
    }
  },

  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client | null> {
    const current = readLocal<Client[]>('adranna_clients', []);
    let updatedLocal: Client | null = null;
    const nextList = current.map((c) => {
      if (c.id === id) {
        updatedLocal = { ...c, ...updates };
        return updatedLocal;
      }
      return c;
    });
    writeLocal('adranna_clients', nextList);

    if (!isSupabaseConfigured()) return updatedLocal;

    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined)                    payload.name = updates.name;
    if (updates.phone !== undefined)                   payload.phone = updates.phone || null;
    if (updates.email !== undefined)                   payload.email = updates.email || null;
    if (updates.birthdate !== undefined)               payload.birthdate = updates.birthdate || null;
    if (updates.tags !== undefined)                    payload.tags = updates.tags;
    if (updates.lastVisit !== undefined)               payload.last_visit = updates.lastVisit || null;
    if (
      updates.notes !== undefined ||
      updates.reminderDate !== undefined ||
      updates.reminderMessage !== undefined
    ) {
      const target = updatedLocal || ({ notes: updates.notes, reminderDate: updates.reminderDate, reminderMessage: updates.reminderMessage } as Client);
      payload.notes = encodeClientNotes(target);
    }
    if (updates.hasMedicalAlert !== undefined)         payload.has_medical_alert = updates.hasMedicalAlert;
    if (updates.medicalAlertDescription !== undefined) payload.medical_alert_description = updates.medicalAlertDescription || null;
    if (updates.totalVisits !== undefined)             payload.total_visits = updates.totalVisits;

    if (!isBrowserOnline()) {
      enqueueSync({
        table: 'clients',
        action: 'update',
        recordId: id,
        payload,
        label: `Editar paciente: ${updates.name || ''}`,
      });
      return updatedLocal;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        enqueueSync({
          table: 'clients',
          action: 'update',
          recordId: id,
          payload,
          label: `Editar paciente: ${updates.name || ''}`,
        });
        return updatedLocal;
      }
      return mapClient(data);
    } catch {
      enqueueSync({
        table: 'clients',
        action: 'update',
        recordId: id,
        payload,
        label: `Editar paciente: ${updates.name || ''}`,
      });
      return updatedLocal;
    }
  },

  async deleteClient(id: string): Promise<boolean> {
    const current = readLocal<Client[]>('adranna_clients', []);
    writeLocal(
      'adranna_clients',
      current.filter((c) => c.id !== id)
    );

    if (!isSupabaseConfigured()) return true;

    if (!isBrowserOnline()) {
      enqueueSync({
        table: 'clients',
        action: 'delete',
        recordId: id,
        label: 'Eliminar paciente',
      });
      return true;
    }

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) {
        enqueueSync({
          table: 'clients',
          action: 'delete',
          recordId: id,
          label: 'Eliminar paciente',
        });
      }
      return true;
    } catch {
      enqueueSync({
        table: 'clients',
        action: 'delete',
        recordId: id,
        label: 'Eliminar paciente',
      });
      return true;
    }
  },

  // ─── CITAS ───────────────────────────────────────────────────────────────────

  async getAppointments(): Promise<Appointment[]> {
    if (!isSupabaseConfigured()) return INITIAL_APPOINTMENTS;
    const cached = readLocal<Appointment[]>('adranna_appointments', []);

    if (isBrowserOnline()) {
      await this.syncPendingQueue();
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('appointment_date', { ascending: true });
        if (!error && data) {
          const mapped = data.map(mapAppointment);
          writeLocal('adranna_appointments', mapped);
          return mapped;
        }
      } catch {
        // fallback a caché local
      }
    }

    return cached;
  },

  async createAppointment(apt: Omit<Appointment, 'id'>): Promise<Appointment | null> {
    const id = generateUUID();
    const newApt: Appointment = { id, ...apt };

    const current = readLocal<Appointment[]>('adranna_appointments', []);
    writeLocal('adranna_appointments', [newApt, ...current]);

    if (!isSupabaseConfigured()) return newApt;

    const row = { id, ...aptToRow(apt) };

    if (!isBrowserOnline()) {
      enqueueSync({
        table: 'appointments',
        action: 'insert',
        recordId: id,
        payload: row,
        label: `Cita: ${apt.clientName} (${apt.time})`,
      });
      return newApt;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert(row)
        .select()
        .single();
      if (error) {
        enqueueSync({
          table: 'appointments',
          action: 'insert',
          recordId: id,
          payload: row,
          label: `Cita: ${apt.clientName} (${apt.time})`,
        });
        return newApt;
      }
      const mapped = mapAppointment(data);
      writeLocal(
        'adranna_appointments',
        [mapped, ...current.filter((a) => a.id !== id)]
      );
      return mapped;
    } catch {
      enqueueSync({
        table: 'appointments',
        action: 'insert',
        recordId: id,
        payload: row,
        label: `Cita: ${apt.clientName} (${apt.time})`,
      });
      return newApt;
    }
  },

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const current = readLocal<Appointment[]>('adranna_appointments', []);
    let updatedLocal: Appointment | null = null;
    const nextList = current.map((a) => {
      if (a.id === id) {
        updatedLocal = { ...a, ...updates };
        return updatedLocal;
      }
      return a;
    });
    writeLocal('adranna_appointments', nextList);

    if (!isSupabaseConfigured()) return updatedLocal;

    const payload: Record<string, unknown> = {};
    if (updates.clientName !== undefined)       payload.client_name = updates.clientName;
    if (updates.clientPhone !== undefined)      payload.client_phone = updates.clientPhone;
    if (updates.professionalName !== undefined) payload.professional_name = updates.professionalName;
    if (updates.professionalRole !== undefined) payload.professional_role = updates.professionalRole;
    if (updates.discipline !== undefined)       payload.discipline = updates.discipline;
    if (updates.cabinName !== undefined)        payload.cabin_name = updates.cabinName;
    if (updates.serviceName !== undefined)      payload.service_name = updates.serviceName;
    if (updates.durationMinutes !== undefined)  payload.duration_minutes = updates.durationMinutes;
    if (updates.price !== undefined)            payload.price = updates.price;
    if (updates.status !== undefined)           payload.status = updates.status;
    if (updates.date !== undefined)             payload.appointment_date = updates.date;
    if (updates.time !== undefined)             payload.appointment_time = updates.time;
    if (
      updates.notes !== undefined ||
      updates.procedure !== undefined ||
      updates.soldProducts !== undefined ||
      updates.productsTotal !== undefined ||
      updates.servicePrice !== undefined ||
      updates.paymentMethod !== undefined ||
      updates.blockColor !== undefined
    ) {
      const target = updatedLocal || (updates as Appointment);
      payload.notes = encodeAptNotes(target);
    }

    if (!isBrowserOnline()) {
      enqueueSync({
        table: 'appointments',
        action: 'update',
        recordId: id,
        payload,
        label: `Actualizar cita (${updates.status || 'edición'})`,
      });
      return updatedLocal;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        enqueueSync({
          table: 'appointments',
          action: 'update',
          recordId: id,
          payload,
          label: `Actualizar cita (${updates.status || 'edición'})`,
        });
        return updatedLocal;
      }
      return mapAppointment(data);
    } catch {
      enqueueSync({
        table: 'appointments',
        action: 'update',
        recordId: id,
        payload,
        label: `Actualizar cita (${updates.status || 'edición'})`,
      });
      return updatedLocal;
    }
  },

  async deleteAppointment(id: string): Promise<boolean> {
    const current = readLocal<Appointment[]>('adranna_appointments', []);
    writeLocal(
      'adranna_appointments',
      current.filter((a) => a.id !== id)
    );

    if (!isSupabaseConfigured()) return true;

    if (!isBrowserOnline()) {
      enqueueSync({
        table: 'appointments',
        action: 'delete',
        recordId: id,
        label: 'Eliminar cita',
      });
      return true;
    }

    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) {
        enqueueSync({
          table: 'appointments',
          action: 'delete',
          recordId: id,
          label: 'Eliminar cita',
        });
      }
      return true;
    } catch {
      enqueueSync({
        table: 'appointments',
        action: 'delete',
        recordId: id,
        label: 'Eliminar cita',
      });
      return true;
    }
  },

  // ─── PROFESIONALES / EQUIPO ──────────────────────────────────────────────────

  async getProfessionals(): Promise<Professional[]> {
    const cached = readLocal<Professional[]>('adranna_professionals', []);

    if (isSupabaseConfigured() && isBrowserOnline()) {
      await this.syncPendingQueue();
      try {
        const { data, error } = await supabase
          .from('professionals')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          const mapped: Professional[] = data.map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            specialty: p.discipline || p.specialty || 'general',
            phone: p.phone || '',
            email: p.email || '',
            active: p.active ?? true,
            createdAt: p.created_at,
          }));
          writeLocal('adranna_professionals', mapped);
          return mapped;
        }
      } catch {
        // Fallback a localStorage
      }
    }

    return cached;
  },

  async createProfessional(prof: Omit<Professional, 'id'>): Promise<Professional> {
    const id = generateUUID();
    const newProf: Professional = { id, ...prof, active: true };

    const current = readLocal<Professional[]>('adranna_professionals', []);
    writeLocal('adranna_professionals', [newProf, ...current]);

    const row = {
      id,
      name: prof.name,
      role: prof.role,
      discipline: prof.specialty,
      phone: prof.phone || null,
      email: prof.email || null,
      active: true,
    };

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'professionals',
          action: 'insert',
          recordId: id,
          payload: row,
          label: `Profesional: ${prof.name}`,
        });
      } else {
        try {
          const { error } = await supabase.from('professionals').insert(row);
          if (error && error.message?.toLowerCase().includes('fetch')) {
            enqueueSync({
              table: 'professionals',
              action: 'insert',
              recordId: id,
              payload: row,
              label: `Profesional: ${prof.name}`,
            });
          }
        } catch {
          enqueueSync({
            table: 'professionals',
            action: 'insert',
            recordId: id,
            payload: row,
            label: `Profesional: ${prof.name}`,
          });
        }
      }
    }

    return newProf;
  },

  async updateProfessional(id: string, updates: Partial<Professional>): Promise<Professional | null> {
    const current = readLocal<Professional[]>('adranna_professionals', []);
    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p));
    writeLocal('adranna_professionals', updated);

    const payload = {
      name: updates.name,
      role: updates.role,
      discipline: updates.specialty,
      phone: updates.phone || null,
      email: updates.email || null,
      active: updates.active,
    };

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'professionals',
          action: 'update',
          recordId: id,
          payload,
          label: `Editar profesional: ${updates.name || ''}`,
        });
      } else {
        try {
          await supabase.from('professionals').update(payload).eq('id', id);
        } catch {
          enqueueSync({
            table: 'professionals',
            action: 'update',
            recordId: id,
            payload,
            label: `Editar profesional: ${updates.name || ''}`,
          });
        }
      }
    }

    return updated.find((p) => p.id === id) || null;
  },

  async deleteProfessional(id: string): Promise<boolean> {
    const current = readLocal<Professional[]>('adranna_professionals', []);
    writeLocal(
      'adranna_professionals',
      current.filter((p) => p.id !== id)
    );

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'professionals',
          action: 'delete',
          recordId: id,
          label: 'Eliminar profesional',
        });
      } else {
        try {
          await supabase.from('professionals').delete().eq('id', id);
        } catch {
          enqueueSync({
            table: 'professionals',
            action: 'delete',
            recordId: id,
            label: 'Eliminar profesional',
          });
        }
      }
    }
    return true;
  },

  // ─── SERVICIOS & TRATAMIENTOS ───────────────────────────────────────────────

  async getServices(): Promise<ServicePackage[]> {
    const cached = readLocal<ServicePackage[]>('adranna_services', []);

    if (isSupabaseConfigured() && isBrowserOnline()) {
      await this.syncPendingQueue();
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          const mapped: ServicePackage[] = data.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category || 'podologia',
            durationMinutes: s.duration_minutes || 45,
            price: Number(s.price) || 0,
            description: s.description || '',
            sessionsIncluded: s.sessions_included || 1,
            createdAt: s.created_at,
          }));
          writeLocal('adranna_services', mapped);
          return mapped;
        }
      } catch {
        // fallback
      }
    }

    return cached;
  },

  async createService(srv: Omit<ServicePackage, 'id'>): Promise<ServicePackage> {
    const id = generateUUID();
    const newSrv: ServicePackage = { id, ...srv };

    const current = readLocal<ServicePackage[]>('adranna_services', []);
    writeLocal('adranna_services', [newSrv, ...current]);

    const row = {
      id,
      name: srv.name,
      category: srv.category,
      duration_minutes: srv.durationMinutes,
      price: srv.price,
      description: srv.description || null,
      sessions_included: srv.sessionsIncluded || 1,
    };

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'services',
          action: 'insert',
          recordId: id,
          payload: row,
          label: `Servicio: ${srv.name}`,
        });
      } else {
        try {
          const { error } = await supabase.from('services').insert(row);
          if (error && error.message?.toLowerCase().includes('fetch')) {
            enqueueSync({
              table: 'services',
              action: 'insert',
              recordId: id,
              payload: row,
              label: `Servicio: ${srv.name}`,
            });
          }
        } catch {
          enqueueSync({
            table: 'services',
            action: 'insert',
            recordId: id,
            payload: row,
            label: `Servicio: ${srv.name}`,
          });
        }
      }
    }

    return newSrv;
  },

  async updateService(id: string, updates: Partial<ServicePackage>): Promise<ServicePackage | null> {
    const current = readLocal<ServicePackage[]>('adranna_services', []);
    const updated = current.map((s) => (s.id === id ? { ...s, ...updates } : s));
    writeLocal('adranna_services', updated);

    const payload = {
      name: updates.name,
      category: updates.category,
      duration_minutes: updates.durationMinutes,
      price: updates.price,
      description: updates.description,
    };

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'services',
          action: 'update',
          recordId: id,
          payload,
          label: `Editar servicio: ${updates.name || ''}`,
        });
      } else {
        try {
          await supabase.from('services').update(payload).eq('id', id);
        } catch {
          enqueueSync({
            table: 'services',
            action: 'update',
            recordId: id,
            payload,
            label: `Editar servicio: ${updates.name || ''}`,
          });
        }
      }
    }

    return updated.find((s) => s.id === id) || null;
  },

  async deleteService(id: string): Promise<boolean> {
    const current = readLocal<ServicePackage[]>('adranna_services', []);
    writeLocal(
      'adranna_services',
      current.filter((s) => s.id !== id)
    );

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'services',
          action: 'delete',
          recordId: id,
          label: 'Eliminar servicio',
        });
      } else {
        try {
          await supabase.from('services').delete().eq('id', id);
        } catch {
          enqueueSync({
            table: 'services',
            action: 'delete',
            recordId: id,
            label: 'Eliminar servicio',
          });
        }
      }
    }
    return true;
  },

  // ─── EXPEDIENTES PODOLÓGICOS ─────────────────────────────────────────────────

  async getPodologyRecord(clientId: string): Promise<PodologyRecord> {
    const cached = readLocal<PodologyRecord | null>(`adranna_podology_${clientId}`, null);
    if (!isSupabaseConfigured()) return cached || INITIAL_SOFIA_PODOLOGY_RECORD;

    if (isBrowserOnline()) {
      await this.syncPendingQueue();
      try {
        const { data, error } = await supabase
          .from('podology_records')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle();
        if (!error && data) {
          const mapped: PodologyRecord = {
            id: data.id, clientId: data.client_id, expNumber: data.exp_number,
            diabetesMellitus: data.diabetes_mellitus, diabetesType: data.diabetes_type,
            hypertension: data.hypertension, peripheralCirculation: data.peripheral_circulation,
            latexAllergy: data.latex_allergy, iodineAllergy: data.iodine_allergy,
            currentMedications: data.current_medications || [],
            consultationReason: data.consultation_reason,
            findings: data.findings || [], appliedTreatment: data.applied_treatment,
            autoclaveCycleNumber: data.autoclave_cycle_number,
            isSterilizationValidated: data.is_sterilization_validated,
            photos: data.photos || [], evolutionHistory: data.evolution_history || [],
            informedConsent: data.informed_consent || {}, audit: data.audit || {},
          };
          writeLocal(`adranna_podology_${clientId}`, mapped);
          return mapped;
        }
      } catch {
        // fallback a caché local
      }
    }

    return cached || INITIAL_SOFIA_PODOLOGY_RECORD;
  },

  async savePodologyRecord(record: PodologyRecord): Promise<void> {
    writeLocal(`adranna_podology_${record.clientId}`, record);
    if (!isSupabaseConfigured()) return;

    const row = {
      client_id: record.clientId,
      exp_number: record.expNumber || `POD-${record.clientId.slice(-4)}`,
      diabetes_mellitus: record.diabetesMellitus,
      diabetes_type: record.diabetesType,
      hypertension: record.hypertension,
      peripheral_circulation: record.peripheralCirculation,
      latex_allergy: record.latexAllergy,
      iodine_allergy: record.iodineAllergy,
      current_medications: record.currentMedications,
      consultation_reason: record.consultationReason,
      findings: record.findings,
      applied_treatment: record.appliedTreatment,
      autoclave_cycle_number: record.autoclaveCycleNumber,
      is_sterilization_validated: record.isSterilizationValidated,
      photos: record.photos,
      evolution_history: record.evolutionHistory,
      informed_consent: record.informedConsent,
      audit: record.audit,
      updated_at: new Date().toISOString(),
    };

    if (!isBrowserOnline()) {
      enqueueSync({
        table: 'podology_records',
        action: 'upsert',
        recordId: record.clientId,
        matchColumn: 'client_id',
        payload: row,
        label: 'Ficha podológica',
      });
      return;
    }

    try {
      const { error } = await supabase.from('podology_records').upsert(row, { onConflict: 'client_id' });
      if (error && error.message?.toLowerCase().includes('fetch')) {
        enqueueSync({
          table: 'podology_records',
          action: 'upsert',
          recordId: record.clientId,
          matchColumn: 'client_id',
          payload: row,
          label: 'Ficha podológica',
        });
      }
    } catch {
      enqueueSync({
        table: 'podology_records',
        action: 'upsert',
        recordId: record.clientId,
        matchColumn: 'client_id',
        payload: row,
        label: 'Ficha podológica',
      });
    }
  },

  // ─── EXPEDIENTES DE MASAJE ───────────────────────────────────────────────────

  async getMassageRecord(clientId: string): Promise<MassageRecord | null> {
    const cached = readLocal<MassageRecord | null>(`adranna_massage_${clientId}`, null);
    if (!isSupabaseConfigured()) return cached || INITIAL_CAMILA_MASSAGE_RECORD;

    if (isBrowserOnline()) {
      await this.syncPendingQueue();
      try {
        const { data, error } = await supabase
          .from('massage_records')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle();
        if (!error && data) {
          const mapped: MassageRecord = {
            id: data.id, clientId: data.client_id, massageType: data.massage_type,
            preferredPressure: data.preferred_pressure, tensionZones: data.tension_zones || [],
            contraindications: data.contraindications || [], aromatherapyOil: data.aromatherapy_oil,
            sessionNotes: data.session_notes, durationMinutes: data.duration_minutes || 60,
            lastSessionDate: data.last_session_date,
          };
          writeLocal(`adranna_massage_${clientId}`, mapped);
          return mapped;
        }
      } catch {
        // fallback a caché local
      }
    }

    return cached;
  },

  async saveMassageRecord(record: MassageRecord): Promise<void> {
    writeLocal(`adranna_massage_${record.clientId}`, record);
    if (!isSupabaseConfigured()) return;

    const row = {
      client_id: record.clientId,
      massage_type: record.massageType,
      preferred_pressure: record.preferredPressure,
      tension_zones: record.tensionZones,
      contraindications: record.contraindications,
      aromatherapy_oil: record.aromatherapyOil,
      session_notes: record.sessionNotes,
      duration_minutes: record.durationMinutes,
      last_session_date: record.lastSessionDate || new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };

    if (!isBrowserOnline()) {
      enqueueSync({
        table: 'massage_records',
        action: 'upsert',
        recordId: record.clientId,
        matchColumn: 'client_id',
        payload: row,
        label: 'Ficha de masaje',
      });
      return;
    }

    try {
      const { error } = await supabase.from('massage_records').upsert(row, { onConflict: 'client_id' });
      if (error && error.message?.toLowerCase().includes('fetch')) {
        enqueueSync({
          table: 'massage_records',
          action: 'upsert',
          recordId: record.clientId,
          matchColumn: 'client_id',
          payload: row,
          label: 'Ficha de masaje',
        });
      }
    } catch {
      enqueueSync({
        table: 'massage_records',
        action: 'upsert',
        recordId: record.clientId,
        matchColumn: 'client_id',
        payload: row,
        label: 'Ficha de masaje',
      });
    }
  },

  // ─── INVENTARIO DE PRODUCTOS ─────────────────────────────────────────────────

  async getInventory(): Promise<InventoryProduct[]> {
    const cached = readLocal<InventoryProduct[]>('adranna_inventory', []);

    if (isSupabaseConfigured() && isBrowserOnline()) {
      await this.syncPendingQueue();
      try {
        const { data, error } = await supabase
          .from('inventory_products')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          const mapped: InventoryProduct[] = data.map((p) => ({
            id: p.id,
            name: p.name,
            presentation: p.presentation || 'Unidad',
            price: Number(p.price) || 0,
            stock: p.stock ?? undefined,
            category: p.category || 'General',
            createdAt: p.created_at,
          }));
          writeLocal('adranna_inventory', mapped);
          return mapped;
        }
      } catch {
        // fallback a caché local
      }
    }

    return cached;
  },

  async createInventoryProduct(prod: Omit<InventoryProduct, 'id'>): Promise<InventoryProduct> {
    const id = generateUUID();
    const newProd: InventoryProduct = { id, ...prod, createdAt: new Date().toISOString() };

    const current = readLocal<InventoryProduct[]>('adranna_inventory', []);
    writeLocal('adranna_inventory', [newProd, ...current]);

    const row = {
      id,
      name: prod.name,
      presentation: prod.presentation || 'Unidad',
      price: prod.price,
      stock: prod.stock ?? null,
      category: prod.category || 'General',
    };

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'inventory_products',
          action: 'insert',
          recordId: id,
          payload: row,
          label: `Producto: ${prod.name}`,
        });
      } else {
        try {
          const { error } = await supabase.from('inventory_products').insert(row);
          if (error && error.message?.toLowerCase().includes('fetch')) {
            enqueueSync({
              table: 'inventory_products',
              action: 'insert',
              recordId: id,
              payload: row,
              label: `Producto: ${prod.name}`,
            });
          }
        } catch {
          enqueueSync({
            table: 'inventory_products',
            action: 'insert',
            recordId: id,
            payload: row,
            label: `Producto: ${prod.name}`,
          });
        }
      }
    }

    return newProd;
  },

  async updateInventoryProduct(id: string, updates: Partial<InventoryProduct>): Promise<InventoryProduct | null> {
    const current = readLocal<InventoryProduct[]>('adranna_inventory', []);
    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p));
    writeLocal('adranna_inventory', updated);

    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.presentation !== undefined) payload.presentation = updates.presentation;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.stock !== undefined) payload.stock = updates.stock;
    if (updates.category !== undefined) payload.category = updates.category;

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'inventory_products',
          action: 'update',
          recordId: id,
          payload,
          label: `Editar producto: ${updates.name || ''}`,
        });
      } else {
        try {
          await supabase.from('inventory_products').update(payload).eq('id', id);
        } catch {
          enqueueSync({
            table: 'inventory_products',
            action: 'update',
            recordId: id,
            payload,
            label: `Editar producto: ${updates.name || ''}`,
          });
        }
      }
    }

    return updated.find((p) => p.id === id) || null;
  },

  async deleteInventoryProduct(id: string): Promise<boolean> {
    const current = readLocal<InventoryProduct[]>('adranna_inventory', []);
    writeLocal(
      'adranna_inventory',
      current.filter((p) => p.id !== id)
    );

    if (isSupabaseConfigured()) {
      if (!isBrowserOnline()) {
        enqueueSync({
          table: 'inventory_products',
          action: 'delete',
          recordId: id,
          label: 'Eliminar producto',
        });
      } else {
        try {
          await supabase.from('inventory_products').delete().eq('id', id);
        } catch {
          enqueueSync({
            table: 'inventory_products',
            action: 'delete',
            recordId: id,
            label: 'Eliminar producto',
          });
        }
      }
    }
    return true;
  },
};

// ─── Helpers de codificación de metadatos en notes (100% compatible con Supabase) ───

const META_MARKER = '\n<!--ADR_META:';
const META_END = '-->';

function parseMetaFromNotes<T>(rawNotes?: string | null): { cleanNotes?: string; meta: Partial<T> } {
  if (!rawNotes) return { cleanNotes: undefined, meta: {} };
  const idx = rawNotes.indexOf(META_MARKER);
  if (idx === -1) return { cleanNotes: rawNotes, meta: {} };
  const cleanNotes = rawNotes.slice(0, idx).trim() || undefined;
  const start = idx + META_MARKER.length;
  const end = rawNotes.indexOf(META_END, start);
  const jsonStr = end !== -1 ? rawNotes.slice(start, end) : rawNotes.slice(start);
  try {
    return { cleanNotes, meta: JSON.parse(jsonStr) as Partial<T> };
  } catch {
    return { cleanNotes, meta: {} };
  }
}

function encodeClientNotes(c: Partial<Client>): string | null {
  const { cleanNotes } = parseMetaFromNotes(c.notes);
  const meta: Record<string, unknown> = {};
  if (c.reminderDate) meta.reminderDate = c.reminderDate;
  if (c.reminderMessage) meta.reminderMessage = c.reminderMessage;
  const hasMeta = Object.keys(meta).length > 0;
  if (!cleanNotes && !hasMeta) return null;
  return `${cleanNotes || ''}${hasMeta ? `${META_MARKER}${JSON.stringify(meta)}${META_END}` : ''}`;
}

function encodeAptNotes(a: Partial<Appointment>): string | null {
  const { cleanNotes } = parseMetaFromNotes(a.notes);
  const meta: Record<string, unknown> = {};
  if (a.procedure && a.procedure.trim()) meta.procedure = a.procedure.trim();
  if (a.servicePrice !== undefined) meta.servicePrice = a.servicePrice;
  if (a.soldProducts && a.soldProducts.length > 0) meta.soldProducts = a.soldProducts;
  if (a.productsTotal !== undefined) meta.productsTotal = a.productsTotal;
  if (a.paymentMethod) meta.paymentMethod = a.paymentMethod;
  if (a.blockColor) meta.blockColor = a.blockColor;
  const hasMeta = Object.keys(meta).length > 0;
  if (!cleanNotes && !hasMeta) return null;
  return `${cleanNotes || ''}${hasMeta ? `${META_MARKER}${JSON.stringify(meta)}${META_END}` : ''}`;
}

// ─── Helpers de mapeo ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClient(c: any): Client {
  const { cleanNotes, meta } = parseMetaFromNotes<{ reminderDate?: string; reminderMessage?: string }>(c.notes);
  return {
    id: c.id, name: c.name, phone: c.phone || '', email: c.email || '',
    birthdate: c.birthdate || '', avatarUrl: c.avatar_url || undefined,
    tags: c.tags || [], totalVisits: c.total_visits || 1,
    lastVisit: c.last_visit, notes: cleanNotes,
    reminderDate: meta.reminderDate,
    reminderMessage: meta.reminderMessage,
    hasMedicalAlert: c.has_medical_alert || false,
    medicalAlertDescription: c.medical_alert_description,
    createdAt: c.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAppointment(a: any): Appointment {
  const { cleanNotes, meta } = parseMetaFromNotes<{
    procedure?: string;
    servicePrice?: number;
    soldProducts?: SoldProductItem[];
    productsTotal?: number;
    paymentMethod?: Appointment['paymentMethod'];
    blockColor?: string;
  }>(a.notes);
  return {
    id: a.id, clientId: a.client_id, clientName: a.client_name,
    clientPhone: a.client_phone || '', professionalName: a.professional_name,
    professionalRole: a.professional_role || '', discipline: a.discipline,
    cabinId: 'cab-1', cabinName: a.cabin_name, serviceName: a.service_name,
    durationMinutes: a.duration_minutes || 45, price: Number(a.price) || 0,
    servicePrice: meta.servicePrice,
    soldProducts: meta.soldProducts,
    productsTotal: meta.productsTotal,
    paymentMethod: meta.paymentMethod || 'efectivo',
    blockColor: meta.blockColor,
    status: a.status, date: a.appointment_date,
    time: a.appointment_time?.slice(0, 5) || '10:00',
    hasMedicalAlert: a.has_medical_alert, medicalAlertText: a.medical_alert_text,
    hasPendingConsent: a.has_pending_consent,
    notes: cleanNotes,
    procedure: meta.procedure,
  };
}

function aptToRow(apt: Partial<Appointment>): Record<string, unknown> {
  return {
    client_id: apt.clientId, client_name: apt.clientName, client_phone: apt.clientPhone,
    professional_name: apt.professionalName, professional_role: apt.professionalRole,
    discipline: apt.discipline, cabin_name: apt.cabinName, service_name: apt.serviceName,
    duration_minutes: apt.durationMinutes, price: apt.price, status: apt.status,
    appointment_date: apt.date, appointment_time: apt.time,
    has_medical_alert: apt.hasMedicalAlert, medical_alert_text: apt.medicalAlertText,
    has_pending_consent: apt.hasPendingConsent, notes: encodeAptNotes(apt),
  };
}
