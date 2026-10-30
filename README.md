# 🌿 Adranna Spa & Clínica CRM

> **"Un CRM con ficha clínica, no un CRM genérico."**  
> Aplicación web progresiva (PWA) instalable en móviles y desktop, diseñada específicamente para clínicas de **Podología** y centros terapéuticos de **Masajes & Bienestar**. Desarrollada con **Next.js 14**, **Tailwind CSS**, preparada para **Supabase** y optimizada para despliegue en **Vercel** desde **GitHub**.

---

## 📱 Características Principales

### 1. Ficha Clínica de Podología Especializada
* **Antecedentes Patológicos & Factores de Riesgo:** Control estricto de Diabetes Mellitus Tipo II (pie diabético), circulación periférica, alergias (látex, iodo) y medicación habitual.
* **Mapeo Anatómico Podológico Interactivo:**
  * Siluetas vectoriales de Pie Izquierdo y Pie Derecho con selector de vista **Dorsal** y **Plantar**.
  * Marcadores numéricos interactivos de hallazgos (Onicocriptosis/uñas encarnadas, Hiperqueratosis/callosidades, Onicomicosis, Helomas).
  * Posibilidad de registrar nuevos hallazgos haciendo clic sobre cualquier cuadrante anatómico.
* **Asepsia & Esterilización:** Registro del ciclo de autoclave a 134°C para cumplimiento normativo de instrumental.
* **Evidencia Fotográfica Comparativa:** Tarjetas de antes y después con fechas de sesión y evolución del tratamiento.
* **Consentimiento Informado con Firma Biométrica:**
  * Canvas táctil en pantalla para firma digital del paciente o apoderado.
  * Sellado con estampado de fecha/hora y hash criptográfico SHA-256.
* **Línea de Tiempo Evolutiva:** Historial visita por visita con indicaciones médicas.

### 2. Ficha de Masoterapia & Bienestar
* **Mapa Corporal Interactivo:** Silueta corporal con selección táctil de zonas de tensión muscular (cervical, trapecio, escapular, lumbar, glúteos, gemelos).
* **Escala de Presión:** Selección de nivel preferido (Suave, Media, Firme, Tejido Profundo).
* **Aromaterapia & Aceites:** Selección de aceites esenciales aplicados (Romero, Eucalipto, Lavanda, Árnica).
* **Contraindicaciones:** Validación de lesiones previas, hernias o inflamaciones agudas.

### 3. Agenda Clínica & Cabinas
* **Reserva en 3 toques:** Flujo optimizado para móviles (Paciente &rarr; Disciplina/Cabina &rarr; Hora &rarr; Confirmar).
* **Vistas Día / Semana:** Filtros por profesional (Dra. Elena Valdés, Lic. Claudia Nájera) y por cabina de atención (Cabina 1, Cabina 2, Cabina 3).
* **Alertas visibles en la tarjeta de cita:** Indicadores de alertas médicas (ej. Pie Diabético) y consentimientos pendientes.
* **Bloques de Esterilización:** Turnos programados para desinfección entre pacientes.

### 4. Fidelización & Recordatorios por WhatsApp
* **Retorno Programado (6 a 8 semanas):** Módulo de detección de pacientes que requieren revisión periódica con botón directo para enviar recordatorio por WhatsApp en un clic.

### 5. PWA Móvil Instalable
* Configuración completa de `manifest.json`, meta tags para iOS/Android y Service Worker para uso rápido y fluido en cabina.

---

## 🛠️ Stack Tecnológico

* **Framework:** Next.js 14 (App Router)
* **Lenguaje:** TypeScript
* **Estilos:** Tailwind CSS con tokens de diseño extraídos de Stitch (Deep Teal `#0F4C5C`, Arena Cálida `#C29B75`, Menta Eucalipto `#2A9D8F`)
* **Tipografías:** *Noto Serif* y *Plus Jakarta Sans*
* **Iconos:** Google Material Symbols
* **Base de Datos & Auth (Fase 2):** Supabase (PostgreSQL, Storage para fotos y Row Level Security por roles)
* **Hosting:** Vercel

---

## 🚀 Instalación y Ejecución Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Therazmaker/adranna-spa-crm.git
   cd adranna-spa-crm
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abrir en el navegador [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Esquema de Base de Datos para Supabase (PostgreSQL)

Los modelos en `src/types/database.ts` corresponden a las siguientes tablas listas para crearse en Supabase:

* `clients` (id, name, phone, email, birthdate, tags, medical_alert, notes)
* `appointments` (id, client_id, professional_id, discipline, cabin_id, service_name, duration, price, status, date, time)
* `clinical_podology_records` (id, client_id, exp_number, risk_factors, findings_json, applied_treatment, autoclave_cycle, photo_urls, consent_signature, consent_hash, audit_info)
* `clinical_massage_records` (id, client_id, tension_zones_json, pressure_level, aromatherapy_oil, notes)
* `audit_logs` (id, user_id, role, entity, change_details, created_at)

---

## 🔒 Privacidad y Datos de Salud

* **Permisos por Rol:**
  * `admin`: Acceso total (caja, reportes, usuarios).
  * `recepcion`: Agenda, clientes, cobros (sin acceso a detalles de fichas clínicas ni fotos).
  * `terapeuta`: Agenda propia, creación y edición de fichas clínicas especializadas.
* **Auditoría:** Registro de profesional firmante, número de cédula y marcas temporales en cada cambio de expediente.
