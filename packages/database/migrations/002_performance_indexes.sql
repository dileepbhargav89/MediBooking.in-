-- ==============================================================================
-- MediBooking.in - Migration 002: High-Performance Query Indexes
-- Optimizes high-frequency lookup paths for walk-in intake, public slot discovery,
-- waiting room TV chamber queue, and multi-tenant RLS scans.
-- ==============================================================================

-- 1. Index for sub-10ms patient lookup by mobile during front-desk walk-in intake
CREATE INDEX IF NOT EXISTS idx_patients_mobile 
ON patients (mobile);

-- 2. Partial composite index for instantaneous public slot discovery
-- Note: GiST exclusion index only indexes BOOKED/LOCKED/WALK_IN_RESERVED.
-- This partial index guarantees O(log N) lookup for AVAILABLE slots.
CREATE INDEX IF NOT EXISTS idx_availability_slots_discovery 
ON availability_slots (doctor_id, slot_date, start_time) 
WHERE (status = 'AVAILABLE');

-- 3. Composite index on availability_slots for multi-tenant RLS query acceleration
CREATE INDEX IF NOT EXISTS idx_availability_slots_clinic_id 
ON availability_slots (clinic_id);

-- 4. High-speed chamber queue index for Doctor Glance and Waiting Room TV
CREATE INDEX IF NOT EXISTS idx_appointments_chamber_queue 
ON appointments (clinic_id, doctor_id, appointment_date, chamber_number, status, token_number)
WHERE (status IN ('SCHEDULED', 'ARRIVED', 'WAITING', 'IN_CONSULTATION'));

-- 5. Appointments clinic_id index for multi-tenant RLS query acceleration
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id 
ON appointments (clinic_id);

-- 6. GIN Index for instant doctor discovery by medical specialty (e.g. Cardiology, Dermatology)
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_specialties 
ON doctor_profiles USING gin (specialties);

-- 7. Tenant Audit Log query index for DPDP Act compliance and dispute inspection
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_created 
ON audit_logs (clinic_id, created_at DESC);

-- 8. Clinic staff lookup by user ID (for rapid JWT role-to-clinic resolution)
CREATE INDEX IF NOT EXISTS idx_clinic_staff_user_id 
ON clinic_staff (user_id);

