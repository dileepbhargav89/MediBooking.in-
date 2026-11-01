# MediBooking.in — Visual Architecture Blueprint (Doctor-First & Multi-Doctor Team)

> **Document ID:** MB-SPEC-10  
> **Updated:** 2 November 2026  
> **Key Architecture Directives:**  
> 1. **Doctor-First Discovery:** Doctors are the primary highlight for patients; clinics are the consulting venues.  
> 2. **Admin Clinic & Doctor Provisioning:** Clinic Admin creates the clinic entity and adds/invites multiple doctors.  
> 3. **Clinic Team Collaboration:** Receptionists and multiple Doctors operate together inside a single clinic tenant.  
> 4. **Single-UI Unified Login:** One login interface with automatic role-based portal routing.  
> 5. **Monorepo Structure:** Clean Turborepo / npm workspaces architecture.

---

## 1. Doctor-First Patient Discovery & Multi-Specialty Clinic Booking

```mermaid
flowchart TD
    subgraph PatientDiscovery["🧑‍🤝‍🧑 Patient Discovery Options"]
        P_DOC["Option A: Search for Specific Specialist<br/>'Best Cardiologist in Bhopal' or 'Dr. Ritu Jain Dermatologist'"]
        P_CLINIC["Option B: Search for Neighborhood Clinic<br/>'Arogya Polyclinic, Arera Colony'"]
    end

    subgraph LandingPages["🌟 Public Landing Pages"]
        DOC_PAGE["🌟 Doctor Profile Page (PRIMARY HIGHLIGHT)<br/>medibooking.in/dr/ritu-jain<br/>• Specialty: Dermatology & Cosmetology (MD, DNB)<br/>• Verified Credentials, Photos & Patient Reviews<br/>• All Clinic Venues where Dr. Jain consults"]
        
        CLINIC_PAGE["🏥 Multi-Specialty Clinic Directory Page<br/>medibooking.in/clinic/arogya-polyclinic<br/>Lists all consulting specialists under one roof:<br/>• 🫀 Cardiology: Dr. Saxena<br/>• 🧴 Dermatology: Dr. Jain<br/>• 🦴 Orthopedics: Dr. Sharma<br/>• 👶 Pediatrics: Dr. Gupta"]
    end

    P_DOC --> DOC_PAGE
    P_CLINIC --> CLINIC_PAGE
    CLINIC_PAGE -->|Patient selects specialist| DOC_PAGE

    subgraph BookingAction["⚡ Real-Time Booking & Chamber Routing"]
        SLOT["Select Verified Slot with Chosen Specialist<br/>e.g., Dr. Jain (Dermatology) - Wed 06:45 PM (Chamber 2)"]
        CONFIRM["Instant WhatsApp Booking Slip<br/>Includes Doctor Name, Specialty, Chamber #, and Map Pin"]
        ROUTING["Routed directly into Arogya Clinic's<br/>Chamber 2 Queue on Central Reception Desk"]
    end

    DOC_PAGE --> SLOT --> CONFIRM --> ROUTING

    style DOC_PAGE fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px
    style CLINIC_PAGE fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CONFIRM fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

---

## 2. Clinic Admin Multi-Specialty Provisioning Flow (Create Clinic & Add Specialists)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 🏢 Clinic Admin (Owner / Medical Director)
    participant UI as Admin Portal (/admin)
    participant API as MediBooking API Gateway
    participant DB as Authoritative PostgreSQL
    actor Doc1 as 🫀 Cardiologist (Dr. Saxena)
    actor Doc2 as 🧴 Dermatologist (Dr. Jain)
    actor Reception as 👩‍💼 Central Receptionist Desk

    Admin->>UI: Logs in via Unified Auth (/login) -> Redirected to /admin
    Admin->>UI: Step 1: Creates Multi-Specialty Polyclinic ("Arogya Polyclinic", 4 Chambers)
    UI->>API: POST /api/v1/admin/clinics
    API->>DB: INSERT INTO clinics
    
    Admin->>UI: Step 2: Clicks [+ Add Doctor] -> Enters Cardiologist details
    Admin->>UI: Selects Specialty: "Cardiology" | Chamber 1 | Tue/Thu/Sat 5-8 PM | Fee: ₹800
    UI->>API: POST /api/v1/admin/clinics/{id}/doctors/affiliate
    API->>DB: INSERT Affiliation (Doc1, Chamber 1, Cardiology)
    
    Admin->>UI: Step 3: Clicks [+ Add Doctor] -> Enters Dermatologist details
    Admin->>UI: Selects Specialty: "Dermatology" | Chamber 2 | Mon/Wed/Fri 6-9 PM | Fee: ₹600
    UI->>API: POST /api/v1/admin/clinics/{id}/doctors/affiliate
    API->>DB: INSERT Affiliation (Doc2, Chamber 2, Dermatology)
    
    Admin->>UI: Step 4: Provisions Receptionist Staff (Suman, Central Desk)
    UI->>API: POST /api/v1/admin/clinics/{id}/staff
    API->>DB: INSERT INTO clinic_staff (role='RECEPTIONIST')
    
    Note over Reception,DB: Receptionist logs in -> Instantly sees multi-specialty board with Chamber 1 & 2
```

---

## 3. Multi-Specialty Clinic Team Workspace (Receptionist + Specialists Together)

```mermaid
flowchart TD
    subgraph MultiSpecialtyClinic["🏢 MULTI-SPECIALTY CLINIC TENANT (e.g., Arogya Medical Centre & Polyclinic)"]
        subgraph FrontDesk["👩‍💼 Central Multi-Doctor Receptionist Station"]
            DESK["Central Receptionist Desk (Desktop / Tablet)<br/>Multi-Specialty Live Chamber Queue Grid"]
            INTAKE["• 15-Sec Walk-in Intake (F2) — Selects Doctor Specialty<br/>• Multi-Specialty Phone Call Booking<br/>• Direct Cash / Soundbox UPI QR Ledger<br/>• Emergency Clinical Triage Flagging"]
            DESK --> INTAKE
        end

        subgraph SpecialistChambers["🩺 Parallel Doctor Chambers Across Different Specialties"]
            CH1["🩺 Chamber 1: Cardiologist<br/>Dr. A. K. Saxena (MD, DM Cardiology)<br/>Schedule: Tue/Thu/Sat 5–8 PM<br/>Status: 🟢 In Session (Chamber Delay: 0m)"]
            
            CH2["🩺 Chamber 2: Dermatologist<br/>Dr. Ritu Jain (MD Dermatology, DNB)<br/>Schedule: Mon/Wed/Fri 6–9 PM<br/>Status: 🟢 In Session (Chamber Delay: +15m)"]
            
            CH3["🩺 Chamber 3: Orthopedic Surgeon<br/>Dr. Alok Sharma (MS Ortho)<br/>Schedule: Daily 6–9 PM<br/>Status: 🟢 In Session (Chamber Delay: 0m)"]
            
            CH4["🩺 Chamber 4: Pediatrician<br/>Dr. Neha Gupta (MD Pediatrics)<br/>Schedule: Daily 5–8 PM<br/>Status: 🟢 In Session (Chamber Delay: 0m)"]
        end

        subgraph CentralWaiting["🪑 Central Outpatient Waiting Lounge"]
            TV["📺 Multi-Specialty Waiting Room TV Monitor<br/>─────────────────────────────────────────────<br/>🫀 Cardiology (Ch 1): Token #C-12 [In Room] | Next: #C-13<br/>🧴 Dermatology (Ch 2): Token #D-06 [In Room] | Next: #D-07<br/>🦴 Orthopedics (Ch 3): Token #O-14 [In Room] | Next: #O-15<br/>👶 Pediatrics (Ch 4): Token #P-09 [In Room] | Next: #P-10"]
        end

        INTAKE -->|Patient needs Heart Checkup| CH1
        INTAKE -->|Patient needs Skin Consult| CH2
        INTAKE -->|Patient needs Joint / Bone Care| CH3
        INTAKE -->|Patient brings sick child| CH4

        CH1 -->|Rx Issued Handshake| DESK
        CH2 -->|Rx Issued Handshake| DESK
        CH3 -->|Rx Issued Handshake| DESK
        CH4 -->|Rx Issued Handshake| DESK

        CH2 -->|Delay Alert Broadcast: +15m| DESK

        DESK -.->|Live WebSocket Sync| TV
        CH1 -.->|Call Next Token| TV
        CH2 -.->|Call Next Token| TV
        CH3 -.->|Call Next Token| TV
        CH4 -.->|Call Next Token| TV
    end

    style MultiSpecialtyClinic fill:#fcfcfc,stroke:#263238,stroke-width:2px
    style FrontDesk fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style SpecialistChambers fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style CentralWaiting fill:#fffde7,stroke:#fbc02d,stroke-width:2px
```

---

### 3.1 Dual-Scope Receptionist Operating Model (Clinic-Based vs Doctor-Dedicated)

```mermaid
flowchart TD
    subgraph ReceptionistModels["👩‍💼 Dual Receptionist Architecture in MediBooking"]
        subgraph ModelA["MODEL A: Clinic-Based Receptionist (Shared Front-Desk)"]
            REC_CLINIC["👩‍💼 Suman (Clinic Receptionist)<br/>Scope: CLINIC_WIDE<br/>Tenant: Arogya Polyclinic"]
            REC_CLINIC -->|Full Access to All Chambers| CH_ALL["• Manages Chamber 1 (Cardiology)<br/>• Manages Chamber 2 (Dermatology)<br/>• Manages Chamber 3 (Orthopedics)<br/>• Central Cash/UPI Collection"]
        end

        subgraph ModelB["MODEL B: Doctor-Dedicated Receptionist / Attendant"]
            REC_DOC["👨‍💼 Ramesh (Dr. Sharma's Attendant)<br/>Scope: DOCTOR_DEDICATED<br/>Bound to: Dr. Alok Sharma (Orthopedic)"]
            REC_DOC -->|Restricted Chamber View| CH_SPECIFIC["• Sees ONLY Dr. Sharma's Patients<br/>• Sits outside Chamber 3<br/>• Manages Chamber 3 Queue only<br/>• Prepares Ortho patients for exam"]
        end

        subgraph ModelC["MODEL C: Hybrid Polyclinic Setup"]
            CENTRAL_DESK["Central Main Entrance Desk<br/>(Clinic-Wide Receptionist)"]
            CENTRAL_DESK -->|General Token & Triage| CH_ASSISTANTS["Chamber 1 Assistant (Cardio)<br/>Chamber 2 Assistant (Derma)<br/>Chamber 3 Assistant (Ortho)"]
        end
    end

    style ModelA fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style ModelB fill:#e0f2f1,stroke:#00796b,stroke-width:2px
    style ModelC fill:#fff8e1,stroke:#ff8f00,stroke-width:2px
```

---

## 4. Single-UI Unified Entrypoint & 5-Role Redirection

```mermaid
flowchart TD
    USER(["👤 User / Doctor / Staff / Patient"]) --> LOGIN["Navigate to medibooking.in/login<br/>Unified Phone Number + 6-digit OTP"]
    
    LOGIN --> RESOLVE{"Auth Middleware & Token Resolver<br/>(Reads Role + Tenant Context)"}

    RESOLVE -->|SUPER_ADMIN| P1["Redirect: /super-admin/*<br/>🛡️ Super Admin Portal<br/>(Platform health, verification, global billing)"]
    RESOLVE -->|CLINIC_ADMIN| P2["Redirect: /admin/*<br/>🏢 Clinic Admin Portal<br/>(Create clinics, add doctors, configure fees)"]
    RESOLVE -->|DOCTOR| DOC_CHECK{"Doctor practices at<br/>multiple clinics?"}
    RESOLVE -->|RECEPTIONIST| P4["Redirect: /receptionist/*<br/>📋 Receptionist Multi-Doctor Desk<br/>(Intake, multi-chamber triage, cash ledger)"]
    RESOLVE -->|PATIENT| P5["Redirect: /patient/*<br/>🧑‍🤝‍🧑 Patient Hub<br/>(Doctor discovery, booking, token tracker)"]

    DOC_CHECK -- "Yes (>1 Clinic)" --> MODAL["Chamber Switcher Modal<br/>(Select Active Clinic Venue)"]
    DOC_CHECK -- "No (Single Clinic)" --> P3["Redirect: /doctor/*<br/>🩺 Doctor Chamber Glance<br/>(Active queue, call next, 1-tap delay)"]
    MODAL --> P3

    style LOGIN fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style P1 fill:#ffebee,stroke:#c62828
    style P2 fill:#fff3e0,stroke:#e65100
    style P3 fill:#e8f5e9,stroke:#2e7d32
    style P4 fill:#ede7f6,stroke:#4527a0
    style P5 fill:#e0f7fa,stroke:#00838f
```

---

## 5. End-to-End Realtime Chamber & Queue Coordination

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Inbound Patient
    actor Reception as Receptionist (Central Desk)
    participant Core as MediBooking Backend Engine
    participant Redis as Redis Pub/Sub Event Bus
    actor Doc1 as Dr. Sharma (Chamber 1 - Ortho)
    actor Doc2 as Dr. Gupta (Chamber 2 - Pedia)
    participant TV as Waiting Room TV Display

    Patient->>Reception: Arrives at Clinic: "Appointment with Dr. Sharma"
    Reception->>Core: Marks Arrival: Token #08 for Chamber 1
    Core->>Redis: Publish: PATIENT_CHECKED_IN (Doc=Dr.Sharma, Chamber=1, Token=#08)
    Redis-->>Doc1: Chamber 1 Screen updates: +1 Patient Waiting Outside
    Redis-->>TV: TV Board updates queue position
    
    Note over Doc1,Core: Dr. Sharma consults Token #07, finishes exam
    Doc1->>Core: Clicks: "Finish Exam & Issue Rx Handshake"
    Core->>Redis: Publish: RX_ISSUED_BILLING_READY (Token=#07)
    Redis-->>Reception: Front Desk alerted: Token #07 Ready for Payment & Checkout
    
    Doc1->>Core: Clicks: "Call Next Patient" (Token #08)
    Core->>Redis: Publish: PATIENT_IN_CONSULTATION (Doc=Dr.Sharma, Token=#08)
    Redis-->>Reception: Reception board marks: Token #08 inside Chamber 1
    Redis-->>TV: Sound chime: "Token #08 please proceed to Chamber 1"
    
    Note over Reception,Patient: Patient #07 arrives at front desk to pay fee
    Reception->>Patient: Collects ₹500 via Cash or Soundbox UPI QR -> Prints Receipt
```

---

## 6. Monorepo Codebase & Dependency Graph

```mermaid
flowchart TD
    subgraph Monorepo["📁 MediBooking Turborepo Workspace"]
        subgraph Apps["apps/ (Deployable Applications)"]
            WEB["apps/web<br/>Next.js 15 App Router<br/>Single Unified Web App"]
            API["apps/api<br/>Fastify / Spring Boot<br/>Modular High-Throughput REST & WebSockets"]
        end

        subgraph AppRoutes["apps/web Routing Structure (Single UI)"]
            R_LOGIN["app/(auth)/login"]
            R_DR["app/(public)/dr/[slug] (Doctor Landing Page)"]
            R_CLINIC["app/(public)/clinic/[slug] (Venue Page)"]
            R_SUPER["app/(super-admin)/super-admin/*"]
            R_ADMIN["app/(clinic-admin)/admin/*"]
            R_DOC["app/(doctor)/doctor/*"]
            R_REC["app/(reception)/receptionist/*"]
            R_PAT["app/(patient)/patient/*"]
        end

        subgraph Packages["packages/ (Shared Modules)"]
            PKG_TYPES["packages/types<br/>Shared DTOs, Enums, Roles & API Contracts"]
            PKG_DB["packages/database<br/>PostgreSQL Schema, RLS Policies & Migrations"]
            PKG_UI["packages/ui<br/>Tailwind, Radix & Shared Healthcare UI Kit"]
            PKG_CONFIG["packages/config<br/>ESLint, Prettier, TypeScript Configs"]
        end
    end

    WEB --> AppRoutes
    WEB --> PKG_TYPES
    WEB --> PKG_UI
    API --> PKG_TYPES
    API --> PKG_DB
```

---

*This visual architecture blueprint is archived in `docs/10-VISUAL-ARCHITECTURE-DIAGRAMS.md`.*
