import { Client, Appointment, PodologyRecord, MassageRecord, ServicePackage } from '@/types/database';

// Datos de prueba eliminados — el CRM opera con datos reales de Supabase.
// Solo se mantiene el catálogo de servicios como referencia de precios.

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

// Cliente vacío para estados iniciales mientras se carga desde Supabase.
export const EMPTY_CLIENT: Client = {
  id: '',
  name: '',
  phone: '',
  email: '',
  birthdate: '',
  tags: [],
  totalVisits: 0,
  createdAt: '',
};

export const INITIAL_SOFIA_PODOLOGY_RECORD: PodologyRecord = {
  id: '',
  clientId: '',
  expNumber: '',
  diabetesMellitus: false,
  diabetesType: '',
  hypertension: false,
  peripheralCirculation: false,
  latexAllergy: false,
  iodineAllergy: false,
  currentMedications: [],
  consultationReason: '',
  findings: [],
  appliedTreatment: '',
  autoclaveCycleNumber: '',
  isSterilizationValidated: false,
  photos: [],
  evolutionHistory: [],
  informedConsent: {
    signed: false,
    signerName: '',
    signerIdDoc: '',
  },
  audit: {
    lastEditedBy: '',
    professionalLicense: '',
    lastEditedAt: '',
    cabin: '',
  },
};

export const INITIAL_CAMILA_MASSAGE_RECORD: MassageRecord = {
  id: '',
  clientId: '',
  massageType: 'relajante',
  preferredPressure: 'Media',
  tensionZones: [],
  contraindications: [],
  aromatherapyOil: '',
  sessionNotes: '',
  durationMinutes: 60,
  lastSessionDate: '',
};

export const INITIAL_SERVICES: ServicePackage[] = [
  {
    id: 'srv-1',
    name: 'Quiropodia Integral Clínica',
    category: 'podologia',
    durationMinutes: 45,
    price: 750,
    description: 'Corte anatómico, fresado de uñas, deslaminado de hiperqueratosis y desinfección en autoclave.',
  },
  {
    id: 'srv-2',
    name: 'Onicocriptosis Láser + Reconstrucción',
    category: 'podologia',
    durationMinutes: 50,
    price: 1100,
    description: 'Espiculotomía aséptica, aplicación de láser antiinflamatorio y protección ungular.',
  },
  {
    id: 'srv-3',
    name: 'Masaje Descontracturante Tejido Profundo',
    category: 'masaje',
    durationMinutes: 60,
    price: 950,
    description: 'Terapia miofascial en cuello, hombros y espalda con aceites esenciales tibios.',
  },
  {
    id: 'srv-4',
    name: 'Drenaje Linfático Manual + Presoterapia',
    category: 'masaje',
    durationMinutes: 50,
    price: 900,
    description: 'Activación del sistema linfático circulatorio para reducción de edemas.',
  },
  {
    id: 'pkg-1',
    name: 'Bono Anual Salud del Pie (6 Sesiones)',
    category: 'paquete',
    durationMinutes: 45,
    price: 3750,
    description: 'Plan de cuidado preventivo podológico cada 8 semanas con ficha evolutiva digital.',
    sessionsIncluded: 6,
  },
  {
    id: 'pkg-2',
    name: 'Paquete Restaurador Spa (3 Sesiones)',
    category: 'paquete',
    durationMinutes: 60,
    price: 2400,
    description: '3 sesiones de masoterapia combinada (Relajante + Descontracturante + Aromaterapia).',
    sessionsIncluded: 3,
  },
];
