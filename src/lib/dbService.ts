import { supabase, isSupabaseConfigured } from './supabase';
import {
  INITIAL_CLIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_SOFIA_PODOLOGY_RECORD,
  INITIAL_CAMILA_MASSAGE_RECORD,
} from './mockData';
import { Client, Appointment, PodologyRecord, MassageRecord } from '@/types/database';

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
      if (updates.clientName !== undefined)      payload.client_name = updates.clientName;
      if (updates.clientPhone !== undefined)     payload.client_phone = updates.clientPhone;
      if (updates.professionalName !== undefined) payload.professional_name = updates.professionalName;
      if (updates.professionalRole !== undefined) payload.professional_role = updates.professionalRole;
      if (updates.discipline !== undefined)      payload.discipline = updates.discipline;
      if (updates.cabinName !== undefined)       payload.cabin_name = updates.cabinName;
      if (updates.serviceName !== undefined)     payload.service_name = updates.serviceName;
      if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
      if (updates.price !== undefined)           payload.price = updates.price;
      if (updates.status !== undefined)          payload.status = updates.status;
      if (updates.date !== undefined)            payload.appointment_date = updates.date;
      if (updates.time !== undefined)            payload.appointment_time = updates.time;
      if (updates.notes !== undefined)           payload.notes = updates.notes;

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
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('podology_records').upsert({
        exp_number: record.expNumber, diabetes_mellitus: record.diabetesMellitus,
        diabetes_type: record.diabetesType, hypertension: record.hypertension,
        peripheral_circulation: record.peripheralCirculation, latex_allergy: record.latexAllergy,
        iodine_allergy: record.iodineAllergy, current_medications: record.currentMedications,
        consultation_reason: record.consultationReason, findings: record.findings,
        applied_treatment: record.appliedTreatment, autoclave_cycle_number: record.autoclaveCycleNumber,
        is_sterilization_validated: record.isSterilizationValidated, photos: record.photos,
        evolution_history: record.evolutionHistory, informed_consent: record.informedConsent,
        audit: record.audit, updated_at: new Date().toISOString(),
      });
    } catch (e) { console.warn('savePodologyRecord:', e); }
  },

  // ─── EXPEDIENTES DE MASAJE ───────────────────────────────────────────────────

  async getMassageRecord(clientId: string): Promise<MassageRecord | null> {
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
