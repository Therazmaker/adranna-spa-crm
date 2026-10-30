-- ==============================================================================
-- ADRANNA SPA & CLÍNICA CRM - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- ==============================================================================

-- 1. TABLA DE PACIENTES / CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birthdate DATE,
  avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  total_visits INTEGER DEFAULT 0,
  last_visit DATE,
  notes TEXT,
  has_medical_alert BOOLEAN DEFAULT FALSE,
  medical_alert_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE CITAS & HORARIOS DE CABINA
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  professional_name TEXT NOT NULL,
  professional_role TEXT,
  discipline TEXT CHECK (discipline IN ('podologia', 'masaje')),
  cabin_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  price NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'en_curso', 'completado', 'cancelado')),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  has_medical_alert BOOLEAN DEFAULT FALSE,
  medical_alert_text TEXT,
  has_pending_consent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE EXPEDIENTES CLÍNICOS DE PODOLOGÍA
CREATE TABLE IF NOT EXISTS public.podology_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  exp_number TEXT UNIQUE NOT NULL,
  diabetes_mellitus BOOLEAN DEFAULT FALSE,
  diabetes_type TEXT,
  hypertension BOOLEAN DEFAULT FALSE,
  peripheral_circulation BOOLEAN DEFAULT FALSE,
  latex_allergy BOOLEAN DEFAULT FALSE,
  iodine_allergy BOOLEAN DEFAULT FALSE,
  current_medications TEXT[] DEFAULT '{}',
  consultation_reason TEXT,
  findings JSONB DEFAULT '[]'::jsonb, -- Array de hallazgos anatómicos (coordenadas, severidad, tipo)
  applied_treatment TEXT,
  autoclave_cycle_number TEXT,
  is_sterilization_validated BOOLEAN DEFAULT TRUE,
  photos JSONB DEFAULT '[]'::jsonb, -- Fotos comparativas antes / después
  evolution_history JSONB DEFAULT '[]'::jsonb, -- Línea de tiempo evolutiva visita por visita
  informed_consent JSONB DEFAULT '{}'::jsonb, -- Firma biométrica, hash SHA-256, sellado de tiempo
  audit JSONB DEFAULT '{}'::jsonb, -- Profesional responsable, cédula, última edición
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE FICHAS DE MASOTERAPIA & BIENESTAR
CREATE TABLE IF NOT EXISTS public.massage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  massage_type TEXT NOT NULL,
  preferred_pressure TEXT DEFAULT 'Firme' CHECK (preferred_pressure IN ('Suave', 'Media', 'Firme', 'Tejido Profundo')),
  tension_zones TEXT[] DEFAULT '{}', -- ['cervical', 'trapecio', 'lumbar', etc.]
  contraindications TEXT[] DEFAULT '{}',
  aromatherapy_oil TEXT,
  session_notes TEXT,
  duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE SERVICIOS Y PAQUETES
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('podologia', 'masaje', 'paquete')),
  duration_minutes INTEGER DEFAULT 45,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  sessions_included INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA DE PROFESIONALES / EQUIPO
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  discipline TEXT DEFAULT 'general',
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA DE AUDITORÍA (CUMPLIMIENTO DE PROTECCIÓN DE DATOS DE SALUD)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_role TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ACTIVACIÓN DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podology_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.massage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso (Permiten lectura y escritura para usuarios del sistema)
DROP POLICY IF EXISTS "Acceso total clients" ON public.clients;
CREATE POLICY "Acceso total clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total appointments" ON public.appointments;
CREATE POLICY "Acceso total appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total podology" ON public.podology_records;
CREATE POLICY "Acceso total podology" ON public.podology_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total massage" ON public.massage_records;
CREATE POLICY "Acceso total massage" ON public.massage_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total services" ON public.services;
CREATE POLICY "Acceso total services" ON public.services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total professionals" ON public.professionals;
CREATE POLICY "Acceso total professionals" ON public.professionals FOR ALL USING (true) WITH CHECK (true);
