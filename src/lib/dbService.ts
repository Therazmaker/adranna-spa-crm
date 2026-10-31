import { supabase, isSupabaseConfigured } from './supabase';
import {
  INITIAL_CLIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_SOFIA_PODOLOGY_RECORD,
  INITIAL_CAMILA_MASSAGE_RECORD,
} from './mockData';
import { Client, Appointment, PodologyRecord, MassageRecord, Professional, ServicePackage } from '@/types/database';

export const dbService = {
  // ─── CLIENTES ────────────────────────────────────────────────────────────────

  async getClients(): Promise<Client[]> {
    if (!isSupabaseConfigured()) return INITIAL_CLIENTS;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.error('getClients:', error.message); return []; }
      return (data ?? []).map(mapClient);
    } catch (err) {
      console.error('getClients exception:', err);
      return [];
    }
  },

  async createClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const fallback: Client = { id: `cli-${Date.now()}`, ...client, createdAt: new Date().toISOString() };
    if (!isSupabaseConfigured()) return fallback;
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
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
        })
        .select()
        .single();
      if (error) { console.error('createClient:', error.message); return fallback; }
      return mapClient(data);
    } catch (err) { console.error('createClient exception:', err); return fallback; }
  },

  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined)                    payload.name = updates.name;
      if (updates.phone !== undefined)                   payload.phone = updates.phone || null;
      if (updates.email !== undefined)                   payload.email = updates.email || null;
      if (updates.birthdate !== undefined)               payload.birthdate = updates.birthdate || null;
      if (updates.tags !== undefined)                    payload.tags = updates.tags;
      if (updates.notes !== undefined)                   payload.notes = updates.notes || null;
      if (updates.hasMedicalAlert !== undefined)         payload.has_medical_alert = updates.hasMedicalAlert;
      if (updates.medicalAlertDescription !== undefined) payload.medical_alert_description = updates.medicalAlertDescription || null;
      if (updates.totalVisits !== undefined)             payload.total_visits = updates.totalVisits;

      const { data, error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) { console.error('updateClient:', error.message); return null; }
      return mapClient(data);
    } catch (err) { console.error('updateClient exception:', err); return null; }
  },

  async deleteClient(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) { console.error('deleteClient:', error.message); return false; }
      return true;
    } catch (err) { console.error('deleteClient exception:', err); return false; }
  },

  // ─── CITAS ───────────────────────────────────────────────────────────────────

  async getAppointments(): Promise<Appointment[]> {
    if (!isSupabaseConfigured()) return INITIAL_APPOINTMENTS;
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });
      if (error) { console.error('getAppointments:', error.message); return []; }
      return (data ?? []).map(mapAppointment);
    } catch { return []; }
  },

  async createAppointment(apt: Omit<Appointment, 'id'>): Promise<Appointment | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert(aptToRow(apt))
        .select()
        .single();
      if (error) { console.error('createAppointment:', error.message); return null; }
      return mapAppointment(data);
    } catch (e) { console.warn('createAppointment exception:', e); return null; }
  },

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    if (!isSupabaseConfigured()) return null;
    try {
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
      if (updates.notes !== undefined)            payload.notes = updates.notes;

      const { data, error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) { console.error('updateAppointment:', error.message); return null; }
      return mapAppointment(data);
    } catch (e) { console.warn('updateAppointment exception:', e); return null; }
  },

  async deleteAppointment(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) { console.error('deleteAppointment:', error.message); return false; }
      return true;
    } catch (err) { console.error('deleteAppointment exception:', err); return false; }
  },

  // ─── PROFESIONALES / EQUIPO ──────────────────────────────────────────────────

  async getProfessionals(): Promise<Professional[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('professionals')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            specialty: p.discipline || p.specialty || 'general',
            phone: p.phone || '',
            email: p.email || '',
            active: p.active ?? true,
            createdAt: p.created_at,
          }));
        }
      } catch {
        // Fallback a localStorage si la tabla aún no existe en Supabase
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('adranna_professionals');
      if (cached) {
        try { return JSON.parse(cached); } catch { /* ignore */ }
      }
    }
    return [];
  },

  async createProfessional(prof: Omit<Professional, 'id'>): Promise<Professional> {
    const fallbackId = `prof-${Date.now()}`;
    const newProf: Professional = { id: fallbackId, ...prof, active: true };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('professionals')
          .insert({
            name: prof.name,
            role: prof.role,
            discipline: prof.specialty,
            phone: prof.phone || null,
            email: prof.email || null,
            active: true,
          })
          .select()
          .single();

        if (!error && data) {
          newProf.id = data.id;
        }
      } catch {
        // Fallback a almacenamiento local
      }
    }

    if (typeof window !== 'undefined') {
      const current = await this.getProfessionals();
      const updated = [newProf, ...current.filter((p) => p.id !== newProf.id)];
      localStorage.setItem('adranna_professionals', JSON.stringify(updated));
    }

    return newProf;
  },

  async updateProfessional(id: string, updates: Partial<Professional>): Promise<Professional | null> {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('professionals')
          .update({
            name: updates.name,
            role: updates.role,
            discipline: updates.specialty,
            phone: updates.phone || null,
            email: updates.email || null,
            active: updates.active,
          })
          .eq('id', id);
      } catch {
        // fallback
      }
    }

    if (typeof window !== 'undefined') {
      const current = await this.getProfessionals();
      const updated = current.map((p) => p.id === id ? { ...p, ...updates } : p);
      localStorage.setItem('adranna_professionals', JSON.stringify(updated));
      return updated.find((p) => p.id === id) || null;
    }
    return null;
  },

  async deleteProfessional(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('professionals').delete().eq('id', id);
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      const current = await this.getProfessionals();
      const updated = current.filter((p) => p.id !== id);
      localStorage.setItem('adranna_professionals', JSON.stringify(updated));
    }
    return true;
  },

  // ─── SERVICIOS & TRATAMIENTOS ───────────────────────────────────────────────

  async getServices(): Promise<ServicePackage[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category || 'podologia',
            durationMinutes: s.duration_minutes || 45,
            price: Number(s.price) || 0,
            description: s.description || '',
            sessionsIncluded: s.sessions_included || 1,
            createdAt: s.created_at,
          }));
        }
      } catch {
        // fallback
      }
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('adranna_services');
      if (cached) {
        try { return JSON.parse(cached); } catch { /* ignore */ }
      }
    }
    return [];
  },

  async createService(srv: Omit<ServicePackage, 'id'>): Promise<ServicePackage> {
    const fallbackId = `srv-${Date.now()}`;
    const newSrv: ServicePackage = { id: fallbackId, ...srv };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('services')
          .insert({
            name: srv.name,
            category: srv.category,
            duration_minutes: srv.durationMinutes,
            price: srv.price,
            description: srv.description || null,
            sessions_included: srv.sessionsIncluded || 1,
          })
          .select()
          .single();

        if (!error && data) {
          newSrv.id = data.id;
        }
      } catch {
        // fallback
      }
    }

    if (typeof window !== 'undefined') {
      const current = await this.getServices();
      const updated = [newSrv, ...current.filter((s) => s.id !== newSrv.id)];
      localStorage.setItem('adranna_services', JSON.stringify(updated));
    }

    return newSrv;
  },

  async updateService(id: string, updates: Partial<ServicePackage>): Promise<ServicePackage | null> {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('services')
          .update({
            name: updates.name,
            category: updates.category,
            duration_minutes: updates.durationMinutes,
            price: updates.price,
            description: updates.description,
          })
          .eq('id', id);
      } catch {
        // fallback
      }
    }

    if (typeof window !== 'undefined') {
      const current = await this.getServices();
      const updated = current.map((s) => s.id === id ? { ...s, ...updates } : s);
      localStorage.setItem('adranna_services', JSON.stringify(updated));
      return updated.find((s) => s.id === id) || null;
    }
    return null;
  },

  async deleteService(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').delete().eq('id', id);
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      const current = await this.getServices();
      const updated = current.filter((s) => s.id !== id);
      localStorage.setItem('adranna_services', JSON.stringify(updated));
    }
    return true;
  },

  // ─── EXPEDIENTES PODOLÓGICOS ─────────────────────────────────────────────────

  async getPodologyRecord(clientId: string): Promise<PodologyRecord> {
    if (!isSupabaseConfigured()) return INITIAL_SOFIA_PODOLOGY_RECORD;
    try {
      const { data, error } = await supabase
        .from('podology_records')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error || !data) return INITIAL_SOFIA_PODOLOGY_RECORD;
      return {
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
    } catch { return INITIAL_SOFIA_PODOLOGY_RECORD; }
  },

  async savePodologyRecord(record: PodologyRecord): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`adranna_podology_${record.clientId}`, JSON.stringify(record));
    }
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('podology_records').upsert({
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
      });
    } catch (e) { console.warn('savePodologyRecord:', e); }
  },

  // ─── EXPEDIENTES DE MASAJE ───────────────────────────────────────────────────

  async getMassageRecord(clientId: string): Promise<MassageRecord | null> {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`adranna_massage_${clientId}`);
      if (cached) {
        try { return JSON.parse(cached); } catch { /* ignore */ }
      }
    }
    if (!isSupabaseConfigured()) return INITIAL_CAMILA_MASSAGE_RECORD;
    try {
      const { data, error } = await supabase
        .from('massage_records').select('*').eq('client_id', clientId).maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id, clientId: data.client_id, massageType: data.massage_type,
        preferredPressure: data.preferred_pressure, tensionZones: data.tension_zones || [],
        contraindications: data.contraindications || [], aromatherapyOil: data.aromatherapy_oil,
        sessionNotes: data.session_notes, durationMinutes: data.duration_minutes || 60,
        lastSessionDate: data.last_session_date,
      };
    } catch { return null; }
  },

  async saveMassageRecord(record: MassageRecord): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`adranna_massage_${record.clientId}`, JSON.stringify(record));
    }
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('massage_records').upsert({
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
      });
    } catch (e) {
      console.warn('saveMassageRecord:', e);
    }
  },
};

// ─── Helpers de mapeo ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClient(c: any): Client {
  return {
    id: c.id, name: c.name, phone: c.phone || '', email: c.email || '',
    birthdate: c.birthdate || '', avatarUrl: c.avatar_url || undefined,
    tags: c.tags || [], totalVisits: c.total_visits || 1,
    lastVisit: c.last_visit, notes: c.notes,
    hasMedicalAlert: c.has_medical_alert || false,
    medicalAlertDescription: c.medical_alert_description,
    createdAt: c.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAppointment(a: any): Appointment {
  return {
    id: a.id, clientId: a.client_id, clientName: a.client_name,
    clientPhone: a.client_phone || '', professionalName: a.professional_name,
    professionalRole: a.professional_role || '', discipline: a.discipline,
    cabinId: 'cab-1', cabinName: a.cabin_name, serviceName: a.service_name,
    durationMinutes: a.duration_minutes || 45, price: Number(a.price) || 0,
    status: a.status, date: a.appointment_date,
    time: a.appointment_time?.slice(0, 5) || '10:00',
    hasMedicalAlert: a.has_medical_alert, medicalAlertText: a.medical_alert_text,
    hasPendingConsent: a.has_pending_consent, notes: a.notes,
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
    has_pending_consent: apt.hasPendingConsent, notes: apt.notes,
  };
}
