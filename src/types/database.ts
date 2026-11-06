export type UserRole = 'admin' | 'recepcion' | 'terapeuta';

export type PaymentMethod = 'efectivo' | 'yape_plin' | 'transferencia' | 'tarjeta';

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'insumos' | 'alquiler' | 'servicios' | 'personal' | 'otros';
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt?: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  presentation: string; // ej. "30 ml", "100 g", "Unidad"
  price: number;
  stock?: number;
  category?: string;
  createdAt?: string;
}

export interface SoldProductItem {
  productId: string;
  name: string;
  presentation: string;
  unitPrice: number;
  quantity: number;
  subtotal?: number;
}

export interface Client {
  id: string;
  name: string;
  avatarUrl?: string;
  phone: string;
  email: string;
  birthdate: string;
  tags: string[];
  totalVisits: number;
  lastVisit?: string;
  nextAppointment?: string;
  reminderDate?: string;
  reminderMessage?: string;
  preexistingConditions?: string[];
  currentMedications?: string;
  medicalHistory?: string;
  notes?: string;
  hasMedicalAlert?: boolean;
  medicalAlertDescription?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  professionalName: string;
  professionalRole: string;
  discipline: 'podologia' | 'masaje';
  cabinId: string;
  cabinName: string;
  serviceName: string;
  durationMinutes: number;
  price: number; // Total (servicio + productos)
  servicePrice?: number; // Precio base del servicio
  soldProducts?: SoldProductItem[];
  productsTotal?: number;
  // Adelanto / Depósito de reserva
  depositAmount?: number; // Monto cobrado como adelanto (ej. S/ 30.00)
  depositPaymentMethod?: PaymentMethod; // Medio del adelanto ('yape_plin' | 'efectivo' | 'tarjeta' | 'transferencia')
  depositDate?: string; // Fecha en la que se cobró el adelanto (YYYY-MM-DD)
  depositNotes?: string; // Observaciones del adelanto (ej. "Yape Op. 49201")
  paymentMethod?: PaymentMethod; // Medio de pago para el cuadre de caja
  payments?: PaymentSplit[]; // Desglose de pago mixto (ej. parte efectivo + parte Yape)
  blockColor?: string; // Color personalizado en vista calendario
  customTag?: string; // Etiqueta visible en el calendario (ej. "Pendiente de reprogramar", "Confirmado")
  tagColor?: string; // Color de fondo de la etiqueta
  status: 'confirmado' | 'en_curso' | 'completado' | 'cancelado';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  hasMedicalAlert?: boolean;
  medicalAlertText?: string;
  hasPendingConsent?: boolean;
  notes?: string; // OBSERVACIONES (hallazgos clínicos de la sesión)
  procedure?: string; // PROCEDIMIENTO (qué se le realizó y recomendaciones)
}

export interface FootFinding {
  id: string;
  markerNumber: number;
  foot: 'izquierdo' | 'derecho';
  view: 'dorsal' | 'plantar';
  condition: 'onicocriptosis' | 'hiperqueratosis' | 'micosis' | 'verruga' | 'heloma' | 'otro';
  title: string;
  severity: 'Agudo' | 'Crónico' | 'Seguimiento';
  description: string;
  markerCoords: { x: number; y: number }; // percentage coords on foot canvas
  date?: string; // YYYY-MM-DD - Fecha en la que se encontró/diagnosticó el hallazgo
}

export interface PhotoComparison {
  id: string;
  title: string;
  sessionNumber: number;
  date: string;
  beforeUrl: string;
  afterUrl: string;
  beforeDescription: string;
  afterDescription: string;
}

export interface ClinicalEvolutionEntry {
  id: string;
  date: string;
  time: string;
  practitionerName: string;
  description: string;
  indication: string;
}

export interface PodologyRecord {
  id: string;
  clientId: string;
  expNumber: string;
  diabetesMellitus: boolean;
  diabetesType?: string;
  hypertension: boolean;
  peripheralCirculation: boolean;
  latexAllergy: boolean;
  iodineAllergy: boolean;
  currentMedications: string[];
  consultationReason: string;
  findings: FootFinding[];
  appliedTreatment: string;
  autoclaveCycleNumber: string;
  isSterilizationValidated: boolean;
  photos: PhotoComparison[];
  evolutionHistory: ClinicalEvolutionEntry[];
  informedConsent: {
    signed: boolean;
    signerName: string;
    signerIdDoc: string;
    signatureSvg?: string;
    signatureTimestamp?: string;
    sha256Hash?: string;
  };
  audit: {
    lastEditedBy: string;
    professionalLicense: string;
    lastEditedAt: string;
    cabin: string;
  };
}

export interface MassageRecord {
  id: string;
  clientId: string;
  massageType: 'descontracturante' | 'relajante' | 'drenaje_linfatico' | 'tejido_profundo';
  preferredPressure: 'Suave' | 'Media' | 'Firme' | 'Tejido Profundo';
  tensionZones: string[]; // ['cervical', 'trapecio', 'lumbar', 'piernas', etc.]
  contraindications: string[];
  aromatherapyOil: string;
  sessionNotes: string;
  durationMinutes: number;
  lastSessionDate: string;
}

export interface Professional {
  id: string;
  name: string;
  role: string; // Ej: Podóloga Titular, Terapeuta Spa, Manicurista
  specialty: 'podologia' | 'masaje' | 'manicura' | 'general';
  phone?: string;
  email?: string;
  active: boolean;
  createdAt?: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  category: 'podologia' | 'masaje' | 'manicura' | 'paquete';
  durationMinutes: number;
  price: number;
  description: string;
  sessionsIncluded?: number;
  createdAt?: string;
}
