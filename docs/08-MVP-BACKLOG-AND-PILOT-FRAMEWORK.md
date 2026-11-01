# MediBooking.in — MVP Backlog, Problem Validation & Field Pilot Framework

> **Document ID:** MB-SPEC-08  
> **Prepared by:** Product Manager, Indian Healthcare Market Research Analyst, SaaS Pricing Strategist  
> **Target Market:** Bhopal, Madhya Pradesh (Phase 1 Validation Hub)  
> **Version:** 1.0  
> **Status:** Operational Action Plan

---

## Deliverable A: Problem Validation Report

Before engineering code, every identified operational friction point must be tested against real-world clinical behavior in Bhopal.

```mermaid
flowchart TD
    subgraph Problem1["1. Doctor Schedule Unreliability"]
        C1["Cause: Hospital duties, OT calls, multi-clinic commuting"]
        E1["Consequence: Extended waiting room crowds, patient anger, walk-outs"]
        V1["Validation Test: Shadow 5 clinics in MP Nagar; log daily doctor arrival vs stated time"]
    end

    subgraph Problem2["2. Dual-Channel Collision"]
        C2["Cause: Phone bookings and walk-ins written on loose paper"]
        E2["Consequence: Double-booked slots, embarrassed receptionists, lost trust"]
        V2["Validation Test: Audit paper registers of 10 clinics; calculate conflict frequency"]
    end

    subgraph Problem3["3. High Outpatient No-Show Rate"]
        C3["Cause: Zero patient commitment, forgetting slots, no reminders"]
        E3["Consequence: 15-30% idle doctor time, erratic revenue"]
        V3["Validation Test: Track 500 phone bookings across clinics; count no-show %"]
    end

    subgraph Problem4["4. Receptionist Tech Resistance"]
        C4["Cause: Overcomplicated multi-page software, low tech literacy"]
        E4["Consequence: Software abandoned after 3 days; return to paper"]
        V4["Validation Test: Benchmark time taken for 1 walk-in entry; must be < 15 seconds"]
    end

    Problem1 --> Solved["MediBooking Field Verified Engine"]
    Problem2 --> Solved
    Problem3 --> Solved
    Problem4 --> Solved
```

### Detailed Validation Matrix

| Clinic Problem | Operational Cause | Measurable Impact | Validation Method & Metric | Threshold for Confirmation |
|:---|:---|:---|:---|:---|
| **Doctor Delays** | Unpredictable hospital duties (AIIMS/Hamidia/Bansal rounds) | 45+ min patient wait times; waiting room confrontation | Track 20 doctor arrival times across 10 working days | ≥ 40% of sessions start > 20 mins late |
| **Double-Booking Conflicts** | Phone calls taken while walk-ins are seated without real-time calendar syncing | 2-4 patient clashes per week per clinic | Receptionist interviews + incident log inspection | ≥ 70% of clinics report weekly booking clashes |
| **Patient No-Shows** | Patients book appointments across 2-3 clinics simultaneously as backups | Loss of ₹2,000–5,000 in daily doctor consultation potential | Retrospective review of 10 clinic paper registers | Baseline no-show rate ≥ 15% |
| **Receptionist Overload** | 50–100 repetitive phone calls asking "Is doctor sitting today?" and "What is token now?" | Receptionist spends > 60% of shift on phone, neglecting arriving patients | Shadowing front desks during evening peak (6–8 PM) | ≥ 40 calls/evening handled by receptionist |
| **SaaS Payment Resistance** | Doctors perceive software as an unneeded expense or fear percentage cuts | High churn after free trial | Willingness-to-pay testing with 20 clinic owners | ≥ 40% express willingness to pay ₹999–1,499/mo |

---

## Deliverable F: Structured MVP Backlog (P0 / P1 / P2)

### P0: Essential for Bhopal Pilot Launch (Sprint 1–3)

| ID | User Story | Acceptance Criteria | Complexity |
|:---|:---|:---|:---:|
| **P0-01** | As a **Doctor**, I want to set my recurring clinic sessions for specific days and hours, so that patients only book when I am present. | 1. Doctor can define start/end times and slot durations (10, 15, 20, 30m).<br>2. Slots automatically generate for next 14 days.<br>3. Different schedules permitted for different clinic affiliations. | Medium |
| **P0-02** | As a **Doctor**, I want to tap a button to delay my session by 15, 30, or 45 minutes, so that waiting patients are notified automatically. | 1. 1-tap delay shifts all unconsulted slots forward.<br>2. WhatsApp broadcast triggers to all booked patients for that session.<br>3. Receptionist board updates in real time without browser reload. | High |
| **P0-03** | As a **Patient**, I want to discover a Doctor profile (`/dr/:slug`) or search by specialty (Cardiology, Dermatology, Ortho), so I can book at my preferred clinic venue. | 1. Doctor-first public profile page highlighting qualifications & reviews.<br>2. Displays all consulting clinics and chambers.<br>3. Clean mobile web interface in Hindi and English with OTP verification. | Medium |
| **P0-04** | As a **Receptionist**, I want to add a walk-in patient in under 15 seconds and route them to a specific doctor chamber, so the queue is accurate without delaying front-desk flow. | 1. Modal requires only Name, Mobile, Age, and Doctor selection.<br>2. Keyboard shortcuts enabled (`F2` to trigger).<br>3. Scoped view: Clinic-Wide sees all chambers; Doctor-Dedicated sees assigned doctor only. | Low |
| **P0-05** | As a **System**, I must prevent concurrent bookings on the same slot across all channels, so that double-booking is impossible. | 1. Atomic Redis Lua script mutex locks slot in < 1.2ms.<br>2. PostgreSQL transaction with `SELECT FOR UPDATE` enforces single booking.<br>3. Exclude overlapping time constraints in database engine. | High |
| **P0-06** | As a **Patient**, I want an instant WhatsApp booking confirmation with clinic address and directions, so I have proof of appointment. | 1. WhatsApp template message dispatched within 5 seconds of booking.<br>2. Includes Doctor name, Token number, Slot time, and Google Maps link.<br>3. Fallback SMS sent if WhatsApp fails. | Medium |
| **P0-07** | As a **Receptionist**, I want to mark patient status (`Arrived`, `In-Consult`, `Completed`), so the doctor and clinic know the live queue state. | 1. 1-click status update buttons on the main dashboard.<br>2. Non-linear bypass: Doctor can call patient directly if check-in was skipped.<br>3. Status changes broadcast in real-time to Waiting Room TV via SSE. | Low |
| **P0-08** | As a **Clinic Admin / Staff**, I want to record cash or direct UPI payments collected at the desk, so daily collections are balanced. | 1. Front-desk can select Cash vs Direct UPI.<br>2. Generates simple digital receipt with serial receipt number.<br>3. Daily cash reconciliation summary exported at end of day. | Low |
| **P0-09** | As a **Clinic Admin**, I want to create my clinic profile and add multiple doctors with their specialties and chambers, so my polyclinic can be scheduled. | 1. Clinic creation with chamber/room configuration.<br>2. Add/invite doctors with specific consulting days, hours, and fees.<br>3. Multi-doctor roster reflected immediately on front-desk board. | Medium |
| **P0-10** | As any **User**, I want a single unified login page (`/login`) using phone OTP that automatically routes me to my designated portal. | 1. Single login endpoint for all 5 roles.<br>2. Evaluates role and active clinic context; redirects to `/super-admin`, `/admin`, `/doctor`, `/receptionist`, or `/patient`.<br>3. Tenant switcher modal for multi-clinic doctors. | Medium |

### P1: Fast-Follow Enhancements (Sprint 4–5)

| ID | User Story | Acceptance Criteria | Complexity |
|:---|:---|:---|:---:|
| **P1-01** | As a **Clinic**, I want an automated WhatsApp reminder sent 2 hours before the appointment with a 1-tap confirmation button, to reduce no-shows. | 1. Automated cron evaluates upcoming appointments.<br>2. Sends interactive WhatsApp message: "Reply 1 to Confirm, 2 to Cancel".<br>3. Reception dashboard updates badge to "Patient Confirmed" upon reply. | Medium |
| **P1-02** | As a **Receptionist**, I want a Standby Waitlist queue, so when a patient cancels, the next waiting patient is offered the slot. | 1. Waitlist capped at 5 patients per session.<br>2. Auto-sends claim invitation to Waitlist #1 upon cancellation.<br>3. 10-minute acceptance window before cascading to #2. | High |
| **P1-03** | As a **Doctor**, I want a lightweight mobile view of today's patient queue, so I can review visits from my phone. | 1. Responsive mobile dashboard for doctors.<br>2. Shows live queue, consulted count, and remaining patients.<br>3. Ability to mark consultation completed from inside the chamber. | Medium |
| **P1-04** | As a **Clinic Owner**, I want an automated GST invoice generated monthly for my MediBooking SaaS subscription, for business accounting. | 1. Monthly invoice PDF generated with clinic GSTIN and HSN code.<br>2. Auto-emailed and available for download in Clinic Admin portal. | Medium |

### P2: Advanced Capabilities for Later Expansion (Post-Validation)

| ID | Capability | Strategic Rationale for Postponement |
|:---|:---|:---|
| **P2-01** | Full Electronic Medical Records (EMR/EHR) | Small clinics resist typing long clinical notes during busy OPDs; paper prescriptions remain the norm. |
| **P2-02** | Telemedicine Video Consultations | Requires extensive regulatory compliance under Telemedicine Guidelines 2020; high legal and audio/video bandwidth overhead. |
| **P2-03** | ABDM / ABHA Health Information Exchange | High integration complexity with NHA sandbox; irrelevant to solving the immediate Bhopal scheduling pain. |
| **P2-04** | Diagnostic Lab & Pharmacy Commission Split | Premature commercial complexity; distracts from building a sticky core clinic scheduling OS. |

---

## Deliverable G: Business Model, Pricing Experiments & Clinic Acquisition

### 1. SaaS Pricing Validation Experiments

`[PREFERENCE]`: Subscription price points must be tested empirically in Bhopal rather than assumed:

```mermaid
flowchart TD
    subgraph Experiment["3-Cohort Pricing Experiment (Bhopal Clinics)"]
        C1["Cohort A: 10 Solo Doctors<br/>Test: ₹999 / month<br/>Offer: 30-Day Free Trial → Paid Conversion"]
        C2["Cohort B: 10 Standard Clinics (Doc + Reception)<br/>Test: ₹1,499 / month<br/>Offer: 30-Day Free Trial → Paid Conversion"]
        C3["Cohort C: 5 Multi-Doctor Polyclinics<br/>Test: ₹2,499 / month<br/>Offer: 30-Day Free Trial → Paid Conversion"]
    end

    C1 --> M1["Measure: Trial-to-Paid Conversion %<br/>Target: ≥ 40%"]
    C2 --> M2["Measure: Retention after 90 Days<br/>Target: ≥ 85%"]
    C3 --> M3["Measure: Objection Reasons<br/>(Price vs Utility vs Receptionist Friction)"]
```

### 2. Clinic Acquisition Playbook (Founder-Led Field Sales)

```mermaid
flowchart LR
    S1["1. Target Selection<br/>MP Nagar & Arera Colony<br/>50 High-footfall clinics"] --> S2["2. Gatekeeper Touchpoint<br/>Visit reception at 04:30 PM<br/>(Before OPD rush starts)"]
    S2 --> S3["3. 5-Minute Live Demo<br/>Show delay alert + WhatsApp<br/>on doctor's own phone"]
    S3 --> S4["4. Zero-Risk Trial<br/>Activate 30-day free trial<br/>Zero upfront paperwork"]
    S4 --> S5["5. 1-Hour Desk Training<br/>Setup receptionist PC<br/>Laminate shortcut cards"]
    S5 --> S6["6. Day 25 Conversion Review<br/>Present report: No-shows saved,<br/>calls avoided, cash logged"]
```

---

## Deliverable H: Comprehensive Risk Register

```mermaid
quadrantChart
    title Risk Priority & Impact Matrix
    x-axis Low Probability --> High Probability
    y-axis Low Impact --> High Impact
    quadrant-1 Immediate Mitigation Required
    quadrant-2 High Vigilance
    quadrant-3 Low Concern
    quadrant-4 Tactical Contingency
    "Receptionist tech abandonment": [0.75, 0.90]
    "Doctor delay unrecorded": [0.65, 0.75]
    "DPDP data breach": [0.15, 0.95]
    "Double-booking collision": [0.30, 0.85]
    "SaaS renewal default": [0.55, 0.65]
    "Slow page load on 4G": [0.45, 0.50]
    "Competitor price war": [0.35, 0.40]
```

| Risk ID | Category | Risk Description | Probability | Impact | Mitigation Strategy | Owner |
|:---|:---|:---|:---:|:---:|:---|:---|
| **R-01** | Adoption | Receptionist abandons software and reverts to paper register | High | Critical | The 15-second entry rule; zero nested screens; physical desk training; dedicated founder WhatsApp support line. | Product |
| **R-02** | Operational | Doctor does not communicate hospital delays to clinic desk | High | High | Doctor mobile 1-tap delay link sent via WhatsApp 30 mins before session start: "Are you on time today?". | Operations |
| **R-03** | Technical | Network timeout during booking causes duplicate or failed slot allocation | Medium | High | Mandatory `X-Idempotency-Key` headers on all booking APIs; Redis distributed mutex locks with atomic rollback. | Engineering |
| **R-04** | Privacy | Patient health data or diagnosis inadvertently leaked to receptionist | Low | Critical | Strict RBAC; clinical symptoms masked from receptionist dashboard; separate database vaults for clinical data. | Security |
| **R-05** | Financial | Clinic refuses to convert to paid plan after 30-day free trial | Medium | High | Present automated ROI scorecard on Day 25 demonstrating reduced no-shows and quantified administrative hours saved. | Sales |
| **R-06** | Regulatory | Non-compliance with DPDP Rules 2025 regarding consent and breach notices | Low | Critical | Bilingual privacy notices at collection; explicit opt-in checkboxes; documented 72-hour breach response runbook. | Legal |

---

## Deliverable I: 30-Day Pilot Execution Plan (Bhopal Hub)

### Week-by-Week Deployment Timeline

```mermaid
gantt
    title 30-Day Bhopal Pilot Execution Schedule
    dateFormat  YYYY-MM-DD
    section Week 1: Clinic Recruitment
    Audit 50 target clinics in MP Nagar/Arera     :2026-11-03, 4d
    Secure 10 pilot commitments (MoU / letter)   :2026-11-06, 3d
    section Week 2: Configuration & Setup
    Configure clinic profiles & doctor sessions   :2026-11-09, 3d
    On-ground desk training & shortcut deployment :2026-11-11, 4d
    section Week 3: Controlled Live Launch
    Go live with 5 clinics (Online + Desk)       :2026-11-15, 4d
    Rollout remaining 5 clinics                  :2026-11-18, 3d
    Daily on-site desk support & error triage    :2026-11-15, 7d
    section Week 4: Measurement & Conversion
    Review no-show rates & booking volume        :2026-11-22, 4d
    Deliver ROI audit & present paid plans       :2026-11-25, 4d
    Capture conversion decisions                 :2026-11-28, 3d
```

### Pilot Clinic Selection Scorecard (10 Clinics)

To ensure the pilot produces statistically meaningful and operationally diverse data:
- **4 General Physician / Internal Medicine Practices** (High daily volume: 30–50 patients, heavy walk-in traffic).
- **3 Orthopedic / Pediatric Specialists** (Appointment-centric: 20–30 patients, high caregiver booking ratio).
- **2 Polyclinics / Multi-Doctor Facilities** (Complex multi-calendar reception dynamics).
- **1 Obstetrics & Gynecology Clinic** (Frequent emergency hospital calls, testing delay propagation).

---

## Deliverable J: Phased Implementation Roadmap

```mermaid
flowchart LR
    subgraph Stage1["STAGE 1: Core Scheduling Engine (Month 1-2)"]
        S1A["Multi-tenant database schema & RLS"]
        S1B["Doctor session & slot generation engine"]
        S1C["Atomic concurrency locking (Redis + PG)"]
        S1D["15-second receptionist walk-in & queue desk"]
    end

    subgraph Stage2["STAGE 2: WhatsApp & Patient PWA (Month 2-3)"]
        S2A["Zero-install mobile web booking PWA"]
        S2B["WhatsApp transactional confirmation & delay alerts"]
        S2C["Caregiver booking workflow"]
        S2D["Manual cash & UPI desk ledger"]
    end

    subgraph Stage3["STAGE 3: Monetization & Expansion (Month 3-4)"]
        S3A["SaaS subscription billing & UPI Autopay"]
        S3B["Automated GST B2B invoice generation"]
        S3C["End-of-day reconciliation & clinic analytics"]
        S3D["Launch pilot in Indore & Jabalpur"]
    end

    Stage1 --> Stage2 --> Stage3
```

---

## Phase 1 Go/No-Go Decision Framework (Calibrated Thresholds)

At the conclusion of the 30-day pilot across the 10 Bhopal clinics, the multidisciplinary strategy team will evaluate the product against strict, quantified criteria:

```mermaid
flowchart TD
    EVAL["DAY 30 PILOT EVALUATION"] --> C1{"Receptionist Daily Usage<br/>≥ 80% of days?"}
    
    C1 -- "No (< 50%)" --> STOP1["❌ NO-GO: REJECT CORE UX<br/>Front-desk finds system too complex.<br/>Halt sales; redesign UI to pure WhatsApp/voice."]
    C1 -- "Yes" --> C2{"Booking Error Rate<br/>< 1% of total visits?"}
    
    C2 -- "No (≥ 3%)" --> STOP2["⚠️ PAUSE: FIX CONCURRENCY<br/>Double-bookings or sync failures detected.<br/>Halt marketing until DB locks hardened."]
    C2 -- "Yes" --> C3{"Doctor Delay Alert Adoption<br/>Used in ≥ 60% of late sessions?"}
    
    C3 -- "No" --> ITERATE["🔧 ITERATE NOTIFICATIONS<br/>Refine delay workflow; test SMS vs WhatsApp."]
    C3 -- "Yes" --> C4{"Paid Conversion Rate<br/>≥ 4 of 10 pilot clinics agree to pay?"}
    
    C4 -- "No (< 2 clinics)" --> PIVOT["🔄 BUSINESS MODEL PIVOT<br/>Willingness to pay for pure scheduling unproven.<br/>Evaluate free tier with diagnostic lead monetization."]
    C4 -- "Yes (≥ 4 clinics)" --> GO["🚀 FULL GO: EXPAND IN MP<br/>Core PMF achieved. Scale sales in Bhopal,<br/>prepare rollout to Indore and Jabalpur."]

    style GO fill:#c8e6c9,stroke:#2e7d32
    style STOP1 fill:#ffcdd2,stroke:#c62828
    style STOP2 fill:#fff9c4,stroke:#f57f17
    style PIVOT fill:#e1f5fe,stroke:#0288d1
```

### Strategic Exit Criteria

| Signal Type | Metric / Evidence Observed | Strategic Action |
|:---|:---|:---|
| **Definitive GO** | ≥ 4 clinics convert to paid ₹999–1,499/mo; receptionist usage > 80%; no-show rates reduced by ≥ 25%. | Expand sales team in Bhopal; initiate architecture preparation for Indore rollout. |
| **Workflow Pivot** | Clinics love scheduling but receptionists refuse to open desktop browser. | Pivot front-desk interface to a dedicated WhatsApp Business chatbot for the receptionist. |
| **Pricing Pivot** | Clinics utilize the system daily but adamantly refuse subscription fees > ₹500/mo. | Lower base subscription to ₹499/mo and introduce value-added SMS/WhatsApp broadcast usage tiers. |
| **Definitive NO-GO** | < 2 clinics convert; doctors refuse to communicate delays; paper registers remain faster than software. | Terminate project before incurring major engineering or marketing capital expenditure. |

---

*End of Specification Set. All 10 deliverables (A through J) and operational problem analyses are fully articulated across MB-SPEC-06, MB-SPEC-07, and MB-SPEC-08.*

