import { supabase, isSupabaseConfigured } from './supabase';
import {
  INITIAL_CLIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_SOFIA_PODOLOGY_RECORD,
  INITIAL_CAMILA_MASSAGE_RECORD,
} from './mockData';
import { Client, Appointment, PodologyRecord, MassageRecord } from '@/types/database';

export const dbService = {
  // CLIENTES
  async getClients(): Promise<Client[]> {
    if (!isSupabaseConfigured()) return INITIAL_CLIENTS;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al obtener clientes de Supabase:', error.message);
        return INITIAL_CLIENTS;
      }

      if (!data || data.length === 0) {
        return INITIAL_CLIENTS;
      }

      return data.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        birthdate: c.birthdate || '',
        avatarUrl: c.avatar_url || undefined,
        tags: c.tags || [],
        totalVisits: c.total_visits || 1,
        lastVisit: c.last_visit,
        notes: c.notes,
        hasMedicalAlert: c.has_medical_alert || false,
        medicalAlertDescription: c.medical_alert_description,
        createdAt: c.created_at,
      }));
    } catch (err) {
      console.error('Excepción al cargar clientes:', err);
      return INITIAL_CLIENTS;
    }
  },

  async createClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const fallbackId = `cli-${Date.now()}`;
    const fallbackClient: Client = {
      id: fallbackId,
      ...client,
      createdAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      return fallbackClient;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: client.name,
          phone: client.phone || null,
          email: client.email || null,
          birthdate: client.birthdate ? client.birthdate : null,
          avatar_url: client.avatarUrl || null,
          tags: client.tags || [],
          total_visits: client.totalVisits || 1,
          notes: client.notes || null,
          has_medical_alert: client.hasMedicalAlert || false,
          medical_alert_description: client.medicalAlertDescription || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error insertando cliente en Supabase:', error.message, error.details);
        return fallbackClient;
      }

      return {
        id: data.id,
        name: data.name,
        phone: data.phone || '',
        email: data.email || '',
        birthdate: data.birthdate || '',
        avatarUrl: data.avatar_url || undefined,
        tags: data.tags || [],
        totalVisits: data.total_visits || 1,
        notes: data.notes,
        hasMedicalAlert: data.has_medical_alert || false,
        medicalAlertDescription: data.medical_alert_description,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('Excepción en createClient:', err);
      return fallbackClient;
    }
  },

  // CITAS
  async getAppointments(): Promise<Appointment[]> {
    if (!isSupabaseConfigured()) return INITIAL_APPOINTMENTS;
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_time', { ascending: true });

      if (error || !data || data.length === 0) {
        return INITIAL_APPOINTMENTS;
      }

      return data.map((a) => ({
        id: a.id,
        clientId: a.client_id,
        clientName: a.client_name,
        clientPhone: a.client_phone || '',
        professionalName: a.professional_name,
        professionalRole: a.professional_role || '',
        discipline: a.discipline,
        cabinId: 'cab-1',
        cabinName: a.cabin_name,
        serviceName: a.service_name,
        durationMinutes: a.duration_minutes || 45,
        price: Number(a.price) || 0,
        status: a.status,
        date: a.appointment_date,
        time: a.appointment_time?.slice(0, 5) || '10:00',
        hasMedicalAlert: a.has_medical_alert,
        medicalAlertText: a.medical_alert_text,
        hasPendingConsent: a.has_pending_consent,
        notes: a.notes,
      }));
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  },

  async createAppointment(apt: Appointment): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('appointments').insert({
        client_name: apt.clientName,
        client_phone: apt.clientPhone,
        professional_name: apt.professionalName,
        professional_role: apt.professionalRole,
        discipline: apt.discipline,
        cabin_name: apt.cabinName,
        service_name: apt.serviceName,
        duration_minutes: apt.durationMinutes,
        price: apt.price,
        status: apt.status,
        appointment_date: apt.date,
        appointment_time: apt.time,
        has_medical_alert: apt.hasMedicalAlert,
        medical_alert_text: apt.medicalAlertText,
        has_pending_consent: apt.hasPendingConsent,
      });
    } catch (e) {
      console.warn('Error al guardar cita en Supabase:', e);
    }
  },

  // EXPEDIENTES PODOLÓGICOS
  async getPodologyRecord(clientId: string): Promise<PodologyRecord> {
    if (!isSupabaseConfigured()) return INITIAL_SOFIA_PODOLOGY_RECORD;
    try {
      const { data, error } = await supabase
        .from('podology_records')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error || !data) {
        return INITIAL_SOFIA_PODOLOGY_RECORD;
      }

      return {
        id: data.id,
        clientId: data.client_id,
        expNumber: data.exp_number,
        diabetesMellitus: data.diabetes_mellitus,
        diabetesType: data.diabetes_type,
        hypertension: data.hypertension,
        peripheralCirculation: data.peripheral_circulation,
        latexAllergy: data.latex_allergy,
        iodineAllergy: data.iodine_allergy,
        currentMedications: data.current_medications || [],
        consultationReason: data.consultation_reason,
        findings: data.findings || [],
        appliedTreatment: data.applied_treatment,
        autoclaveCycleNumber: data.autoclave_cycle_number,
        isSterilizationValidated: data.is_sterilization_validated,
        photos: data.photos || [],
        evolutionHistory: data.evolution_history || [],
        informedConsent: data.informed_consent || {},
        audit: data.audit || {},
      };
    } catch {
      return INITIAL_SOFIA_PODOLOGY_RECORD;
    }
  },

  async savePodologyRecord(record: PodologyRecord): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('podology_records').upsert({
        exp_number: record.expNumber,
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
    } catch (e) {
      console.warn('Error al guardar expediente en Supabase:', e);
    }
  },
};
