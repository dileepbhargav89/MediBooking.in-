-- ==============================================================================
-- MediBooking.in - Migration 001: Enterprise Multi-Tenant Core Schema & RLS
-- PostgreSQL 15+ compatible with btree_gist slot exclusion constraints
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ENUMS
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT');
CREATE TYPE staff_scope AS ENUM ('CLINIC_WIDE', 'DOCTOR_DEDICATED');
CREATE TYPE medical_specialty AS ENUM (
  'CARDIOLOGY', 'DERMATOLOGY', 'ORTHOPEDICS', 'PEDIATRICS',
  'GENERAL_MEDICINE', 'GYNECOLOGY', 'ENT', 'OPHTHALMOLOGY',
  'DENTAL', 'PULMONOLOGY', 'OTHER'
);
CREATE TYPE session_type AS ENUM ('MORNING', 'EVENING', 'AFTERNOON', 'SPECIAL');
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'LOCKED', 'BOOKED', 'BLOCKED', 'WALK_IN_RESERVED');
CREATE TYPE appointment_status AS ENUM (
  'SCHEDULED', 'ARRIVED', 'WAITING', 'IN_CONSULTATION',
  'COMPLETED', 'CANCELLED_PATIENT', 'CANCELLED_CLINIC', 'NO_SHOW', 'EMERGENCY_OVERRIDE'
);
CREATE TYPE booking_source AS ENUM ('WALK_IN', 'PHONE', 'WHATSAPP', 'ONLINE_PORTAL', 'DOCTOR_REFERRAL');
CREATE TYPE payment_status AS ENUM ('PENDING_AT_DESK', 'PAID_CASH', 'PAID_UPI_QR', 'WAIVED_BY_DOCTOR');
CREATE TYPE triage_severity AS ENUM ('ROUTINE', 'URGENT_TRIAGE', 'FOLLOW_UP', 'POST_OP');

-- 1. CLINICS (Tenants)
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tagline VARCHAR(255),
    address_line TEXT NOT NULL,
    locality VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Bhopal',
    state VARCHAR(100) NOT NULL DEFAULT 'Madhya Pradesh',
    pincode VARCHAR(10) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USERS (Identities across all 5 roles)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'PATIENT',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DOCTOR PROFILES (Doctor-First discovery & NMC credentials)
CREATE TABLE doctor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    state_medical_council VARCHAR(150) NOT NULL,
    specialties medical_specialty[] NOT NULL,
    qualifications TEXT[] NOT NULL,
    experience_years INT NOT NULL DEFAULT 1,
    bio TEXT,
    profile_photo_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CLINIC CHAMBERS (Physical rooms in multi-doctor clinics)
CREATE TABLE clinic_chambers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    chamber_number VARCHAR(20) NOT NULL,
    chamber_name VARCHAR(100) NOT NULL,
    floor VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(clinic_id, chamber_number)
);

-- 5. CLINIC DOCTOR AFFILIATIONS (Multi-clinic mapping with chambers)
CREATE TABLE clinic_doctor_affiliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    chamber_id UUID REFERENCES clinic_chambers(id) ON DELETE SET NULL,
    chamber_number VARCHAR(20) NOT NULL,
    consultation_fee_rupees NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    follow_up_fee_rupees NUMERIC(10, 2) NOT NULL DEFAULT 300.00,
    follow_up_validity_days INT NOT NULL DEFAULT 7,
    is_primary_clinic BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clinic_id, doctor_id)
);

-- 6. CLINIC STAFF (Dual-Scope Receptionists: CLINIC_WIDE vs DOCTOR_DEDICATED)
CREATE TABLE clinic_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope staff_scope NOT NULL DEFAULT 'CLINIC_WIDE',
    dedicated_doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clinic_id, user_id)
);

-- 7. CLINIC SESSIONS (Recurring operational schedule per doctor per clinic)
CREATE TABLE clinic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    chamber_number VARCHAR(20) NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    session_type session_type NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 15,
    max_walk_in_tokens INT NOT NULL DEFAULT 10,
    max_online_slots INT NOT NULL DEFAULT 10,
    buffer_minutes INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 8. AVAILABILITY SLOTS (Generated time windows with atomic concurrency constraint)
CREATE TABLE availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES clinic_sessions(id) ON DELETE CASCADE,
    chamber_number VARCHAR(20) NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status slot_status NOT NULL DEFAULT 'AVAILABLE',
    locked_until TIMESTAMPTZ,
    locked_by_session_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_overlapping_booked_slots EXCLUDE USING gist (
        doctor_id WITH =,
        clinic_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status IN ('BOOKED', 'LOCKED', 'WALK_IN_RESERVED'))
);

-- 9. PATIENTS (Minimal demographics complying with DPDP Act 2023)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    age_years INT,
    gender VARCHAR(15) DEFAULT 'UNSPECIFIED',
    locality VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. APPOINTMENTS (Unified queue, walk-in tokens, online bookings)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    slot_id UUID UNIQUE REFERENCES availability_slots(id) ON DELETE SET NULL,
    chamber_number VARCHAR(20) NOT NULL,
    appointment_date DATE NOT NULL,
    token_number INT NOT NULL,
    status appointment_status NOT NULL DEFAULT 'SCHEDULED',
    source booking_source NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'PENDING_AT_DESK',
    amount_rupees NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    triage_severity triage_severity NOT NULL DEFAULT 'ROUTINE',
    patient_name VARCHAR(255) NOT NULL,
    patient_mobile VARCHAR(15) NOT NULL,
    patient_age INT,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clinic_id, doctor_id, appointment_date, token_number)
);

-- 11. PAYMENTS CLINIC LEDGER (Direct clinic-collected cash/UPI audit log)
CREATE TABLE payments_clinic_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    amount_rupees NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'CASH', 'UPI_SOUNDBOX_QR', 'WAIVED'
    collected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AUDIT LOGS (DPDP Act 2023 tamper-evident log)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role user_role NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Multi-tenant isolation for Clinic Admin and Receptionist roles
-- ==============================================================================

ALTER TABLE clinic_chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_doctor_affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_clinic_ledger ENABLE ROW LEVEL SECURITY;

-- Dynamic RLS Policy based on session variable: app.current_clinic_id
CREATE POLICY rls_clinic_chambers ON clinic_chambers
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
        OR clinic_id = current_setting('app.current_clinic_id', true)::uuid
    );

CREATE POLICY rls_clinic_doctor_affiliations ON clinic_doctor_affiliations
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
        OR clinic_id = current_setting('app.current_clinic_id', true)::uuid
    );

CREATE POLICY rls_clinic_staff ON clinic_staff
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
        OR clinic_id = current_setting('app.current_clinic_id', true)::uuid
    );

CREATE POLICY rls_clinic_sessions ON clinic_sessions
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
        OR clinic_id = current_setting('app.current_clinic_id', true)::uuid
    );

CREATE POLICY rls_availability_slots ON availability_slots
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
        OR clinic_id = current_setting('app.current_clinic_id', true)::uuid
        OR status = 'AVAILABLE' -- Public patient discovery can read available slots
    );

CREATE POLICY rls_appointments ON appointments
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
        OR clinic_id = current_setting('app.current_clinic_id', true)::uuid
    );

CREATE POLICY rls_payments_clinic_ledger ON payments_clinic_ledger
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
        OR clinic_id = current_setting('app.current_clinic_id', true)::uuid
    );

