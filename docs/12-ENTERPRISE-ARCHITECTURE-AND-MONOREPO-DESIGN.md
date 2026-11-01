# 12. Enterprise Architecture and Monorepo Blueprint
**Document Status:** Complete Architecture Design Specification  
**Scope:** Multi-Tenant Healthcare Operations, Doctor-First Discovery, Unified Portals, Concurrency Engine, and Monorepo Scaffolding  
**Market Context:** Independent Clinics and Multi-Specialty Polyclinics (Bhopal, MP & Tier-2/3 Indian Cities)

---

## 1. Executive Summary & Architectural Axioms

MediBooking is designed as an enterprise-grade, multi-tenant Software-as-a-Service (SaaS) platform tailored to the operational realities of Indian private healthcare practices. Rather than mimicking Western enterprise hospital management software (HIS) or doctor aggregator directories, MediBooking optimizes for **extreme front-desk velocity (<15s intake), zero double-booking concurrency guarantees, low-cost TV display rendering (<25MB RAM), and strict regulatory compliance (DPDP Act 2023 & RBI PA Guidelines)**.

### Architectural Axioms
1. **Doctor-First Discovery:** Patients choose doctors, not clinic buildings. Public discovery URLs (`medibooking.in/dr/:slug`) present the doctor's credentials, reviews, and all polyclinics/chambers where they consult.
2. **Multi-Doctor Single-Clinic Multi-Tenancy:** A single clinic tenant can host multiple independent consultation chambers simultaneously (e.g., Chamber 1: Cardiologist, Chamber 2: Dermatologist, Chamber 3: Orthopedic, Chamber 4: Pediatrician).
3. **Dual-Scope Reception Operations:** The system natively supports both central clinic-wide receptionists (`CLINIC_WIDE`) managing all chambers, and doctor-dedicated compounders/attendants (`DOCTOR_DEDICATED`) restricted strictly to their doctor's queue.
4. **Single-UI Unified Portal:** All 5 user roles authenticate through a single unified login (`/login`) with automatic JWT role/clinic resolution and dynamic route redirection.
5. **Decoupled Doctor Availability:** A doctor's master calendar is decoupled from clinic-specific session schedules, chamber room assignments, and consultation fee structures.
6. **Strict Payment Separation (RBI PA Safe):** MediBooking bills SaaS subscription fees to clinics (Flow A), while clinics collect consultation fees directly via cash or their own UPI QR soundbox (Flow B). MediBooking never sits in the consultation fund flow.

---

## 2. Monorepo Architecture & Workspace Boundaries

The system is organized as a high-performance monorepo managed by **Turborepo** and **pnpm workspaces**:

```
medibooking-enterprise/
├── apps/
│   ├── web/                    # Next.js 15 App Router (Single-UI Unified Web Application)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/             # Single Entrypoint Login
│   │   │   │   ├── (super-admin)/super-admin/ # Platform Administration Portal
│   │   │   │   ├── (admin)/admin/            # Clinic Administration & Doctor Provisioning
│   │   │   │   ├── (doctor)/doctor/          # Doctor Chamber Desk & Delay Broadcast
│   │   │   │   ├── (receptionist)/receptionist/# Front-Desk Multi-Chamber Queue & F2 Intake
│   │   │   │   ├── (patient)/patient/        # Patient Dashboard & Token Tracker
│   │   │   │   ├── (public)/dr/[slug]/       # Doctor-First Public Profile & Booking
│   │   │   │   └── (tv)/tv/[clinicSlug]/     # Waiting Room TV Real-Time Display
│   │   │   ├── middleware.ts                 # Dynamic RBAC Routing & Tenant Guard
│   │   │   └── components/                   # UI Compositions & Feature Views
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                    # Fastify 5 Enterprise High-Throughput REST & Realtime API
│       ├── src/
│       │   ├── config/env.ts                 # Strict Zod Environment Validation
│       │   ├── middleware/tenant-context.ts  # Multi-Tenant RLS & Scope Enforcement
│       │   ├── services/
│       │   │   ├── concurrency-engine.ts     # Redis Lua Atomic Mutex Locking (5-min TTL)
│       │   │   └── realtime-sse.ts           # Low-Footprint Server-Sent Events Engine
│       │   ├── routes/
│       │   │   ├── doctor.routes.ts          # Doctor-First Discovery & 1-Click Delay
│       │   │   ├── reception.routes.ts       # 15s Intake, Multi-Chamber Queues, Cashier
│       │   │   ├── slot.routes.ts            # Slot Generation & Concurrency Locks
│       │   │   └── realtime.routes.ts        # SSE TV Streams & Snapshot Hydration
│       │   └── server.ts                     # Fastify Application Gateway
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── types/                  # Universal Domain Models, Enums, DTOs & Validation Schemas
│   ├── database/               # PostgreSQL 15 DDL, RLS Policies, Prisma Schema & Seed Data
│   ├── ui/                     # Design System Tokens, Chamber Badges & Thermal Slips
│   └── config/                 # Shared TypeScript, ESLint & Prettier Presets
│
├── pnpm-workspace.yaml         # pnpm Workspace Configuration
├── turbo.json                  # Turborepo Build & Cache Pipelines
└── tsconfig.base.json          # Root Strict TypeScript Configuration
```

---

## 3. Database Architecture & Multi-Tenant Isolation

### 3.1 Relational Schema Topology
The data model enforces relational normalization, audit logging, and concurrency control at the database engine level:

1. **`clinics` (Tenants):** Core tenant entity storing clinic identity, locality (e.g. MP Nagar, Arera Colony), and contact details.
2. **`users`:** Unified identity table holding mobile credentials and global role classifications.
3. **`doctor_profiles`:** Identity and medical council credentials (NMC/State Council registration number, qualifications, specialties).
4. **`clinic_chambers`:** Physical rooms (`CH-1`, `CH-2`, etc.) inside a polyclinic.
5. **`clinic_doctor_affiliations`:** Bridges doctors to clinics and chambers, allowing customized consultation fees (`consultation_fee_rupees`) and follow-up validity rules per venue.
6. **`clinic_staff`:** Associates receptionists with clinics and defines their operational scope (`CLINIC_WIDE` vs `DOCTOR_DEDICATED`).
7. **`clinic_sessions`:** Defines recurring consultation time windows (e.g. Mon/Wed/Fri 18:00–20:30) with walk-in token and online slot caps.
8. **`availability_slots`:** Individual slot records secured by a PostgreSQL `btree_gist` exclusion constraint:
   ```sql
   CONSTRAINT no_overlapping_booked_slots EXCLUDE USING gist (
       doctor_id WITH =,
       clinic_id WITH =,
       tstzrange(start_time, end_time) WITH &&
   ) WHERE (status IN ('BOOKED', 'LOCKED', 'WALK_IN_RESERVED'));
   ```
9. **`appointments`:** Authoritative queue entity tracking status (`WAITING`, `IN_CONSULTATION`, `COMPLETED`), source (`WALK_IN`, `ONLINE`), payment, and triage urgency.
10. **`payments_clinic_ledger`:** Audit record of cash and UPI payments collected directly at the clinic desk.
11. **`audit_logs`:** Tamper-evident ledger recording all administrative, doctor, and receptionist actions for DPDP Act 2023 compliance.

### 3.2 Row-Level Security (RLS) Multi-Tenant Boundary
PostgreSQL RLS ensures that clinic staff and doctors can never query or mutate records belonging to other clinic tenants:
```sql
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_appointments ON appointments
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
        OR clinic_id = current_setting('app.current_clinic_id', true)::uuid
    );
```

---

## 4. Single-UI Dynamic Portal & Auth Flow

All 5 roles enter through `https://medibooking.in/login`. Authentication is handled via Indian mobile number + OTP.

### Role Redirection Matrix

| Authenticated Role | Operational Scope | Landing Destination | Key Views & Actions |
| :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Platform-wide | `/super-admin` | Clinic onboarding, doctor verification desk, platform subscription billing, audit logs. |
| **`CLINIC_ADMIN`** | Single Clinic Tenant | `/admin` | Clinic profile, chamber setup, doctor onboarding & chamber assignment, staff creation. |
| **`DOCTOR`** | Doctor Chambers | `/doctor` | Live chamber queue, next patient call, 1-click delay broadcast, tenant switcher. |
| **`RECEPTIONIST`** (`CLINIC_WIDE`) | Multi-Chamber Desk | `/receptionist` | Multi-doctor tabbed chamber queues, F2 15-second walk-in intake, cash/UPI cashiering. |
| **`RECEPTIONIST`** (`DOCTOR_DEDICATED`)| Single Chamber | `/receptionist` | Filtered strictly to assigned doctor's room (e.g. Ramesh Yadav at Chamber 1). |
| **`PATIENT`** | Patient Identity | `/patient` | Active booked tokens, live queue position tracker, past visit receipts. |

---

## 5. Concurrency Control & Real-time Waiting Room Engine

### 5.1 Two-Tier Concurrency Architecture
1. **Tier 1 (Fast-Path Memory Lock via Redis Lua):**
   * When an online patient clicks a slot, a 5-minute atomic mutex lock is acquired (`GET + SET NX EX 300`).
   * Any competing request from another patient or the front desk for that slot is rejected immediately with **HTTP 409 Conflict**.
   * If checkout completes, the lock is committed; if abandoned or timed out, the key expires automatically.
2. **Tier 2 (Database Engine Exclusion via PostgreSQL `btree_gist`):**
   * Even under network partition or Redis failover, PostgreSQL enforces GiST range exclusion, making duplicate slot booking physically impossible.

### 5.2 Server-Sent Events (SSE) Waiting Room Feed
* Replaces heavy WebSockets with unidirectional SSE (`/api/v1/realtime/clinics/:id/tv-stream`).
* **Memory footprint:** < 25 MB on budget Android smart TVs and front-desk monitors.
* **15-second Heartbeat:** Prevents NAT router and 4G modem timeouts.
* **Events Emitted:**
  * `snapshot`: Complete initial state on TV connect.
  * `chamber_update`: Triggered when doctor calls next token or completes a consultation.
  * `delay_broadcast`: Triggered when doctor fires a 15/30/45/60 min delay. Displays a visual banner and recalculates estimated consultation times.

---

## 6. Regulatory & Payment Separation Blueprint

### 6.1 Payment Architecture (RBI PA Compliance)
* **Flow A (MediBooking Platform SaaS Billing):** Clinics pay MediBooking monthly or annual SaaS subscription fees via compliant payment aggregators (Razorpay / Cashfree).
* **Flow B (Clinic Consultation Collection):** Patients pay the clinic directly via Cash or the clinic's own UPI QR soundbox (Paytm / PhonePe). MediBooking does not collect, hold, or settle patient consultation fees, completely bypassing RBI Payment Aggregator licensing constraints.

### 6.2 DPDP Act 2023 & Clinical Governance
* **Purpose Limitation:** Patient registration captures only essential identifiers (Name, Mobile, Age, Locality). No clinical diagnoses or medical histories are collected or stored.
* **Public Masking:** Waiting room TVs display masked names (`R*** Sharma`) alongside token numbers.
* **Credential Verification:** Doctor profiles mandate State Medical Council registration numbers verified against the National Medical Commission (NMC) registry before activation.

