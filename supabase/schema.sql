-- ==============================================================================
-- ADRANNA SPA & CLÍNICA CRM - ESQUEMA COMPLETO SUPABASE (POSTGRESQL)
-- Puedes pegar y ejecutar todo este bloque en Supabase -> SQL Editor -> New Query
-- Es 100% seguro ejecutarlo aunque ya tengas tablas creadas (usa IF NOT EXISTS)
-- ==============================================================================

-- 1. TABLA DE PACIENTES / CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birthdate TEXT,
  avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  total_visits INTEGER DEFAULT 1,
  last_visit TEXT,
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
  discipline TEXT DEFAULT 'podologia',
  cabin_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'confirmado',
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  has_medical_alert BOOLEAN DEFAULT FALSE,
  medical_alert_text TEXT,
  has_pending_consent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE EXPEDIENTES CLÍNICOS DE PODOLOGÍA
CREATE TABLE IF NOT EXISTS public.podology_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  exp_number TEXT,
  diabetes_mellitus BOOLEAN DEFAULT FALSE,
  diabetes_type TEXT,
  hypertension BOOLEAN DEFAULT FALSE,
  peripheral_circulation BOOLEAN DEFAULT FALSE,
  latex_allergy BOOLEAN DEFAULT FALSE,
  iodine_allergy BOOLEAN DEFAULT FALSE,
  current_medications TEXT[] DEFAULT '{}',
  consultation_reason TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  applied_treatment TEXT,
  autoclave_cycle_number TEXT,
  is_sterilization_validated BOOLEAN DEFAULT TRUE,
  photos JSONB DEFAULT '[]'::jsonb,
  evolution_history JSONB DEFAULT '[]'::jsonb,
  informed_consent JSONB DEFAULT '{}'::jsonb,
  audit JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar índice único en client_id para que el guardado y sincronización (upsert) funcione siempre
CREATE UNIQUE INDEX IF NOT EXISTS idx_podology_records_client_id ON public.podology_records(client_id);

-- 4. TABLA DE FICHAS DE MASOTERAPIA & BIENESTAR
CREATE TABLE IF NOT EXISTS public.massage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  massage_type TEXT NOT NULL DEFAULT 'Masaje Terapéutico',
  preferred_pressure TEXT DEFAULT 'Media',
  tension_zones TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  aromatherapy_oil TEXT,
  session_notes TEXT,
  duration_minutes INTEGER DEFAULT 60,
  last_session_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.massage_records ADD COLUMN IF NOT EXISTS last_session_date TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_massage_records_client_id ON public.massage_records(client_id);

-- 5. TABLA DE SERVICIOS Y TRATAMIENTOS
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'podologia',
  duration_minutes INTEGER DEFAULT 45,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  sessions_included INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quitar restricción antigua si existía para permitir 'manicura' además de 'podologia' y 'masaje'
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_category_check;

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

-- 7. TABLA DE GASTOS / EGRESOS (MÓDULO DE CONTABILIDAD)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'insumos',
  date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA DE AUDITORÍA
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
-- ACTIVACIÓN DE ROW LEVEL SECURITY (RLS) Y POLÍTICAS DE ACCESO
-- ==============================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podology_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.massage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Acceso total expenses" ON public.expenses;
CREATE POLICY "Acceso total expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total audit_logs" ON public.audit_logs;
CREATE POLICY "Acceso total audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
