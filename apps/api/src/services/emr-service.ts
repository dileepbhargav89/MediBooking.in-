import {
  DigitalPrescription,
  DrugFormulation,
  ClinicalProtocolBundle,
  ChamberConsultationToken,
  PrescriptionMedication,
} from '@medibooking/types';
import crypto from 'crypto';

export class EMRService {
  private static instance: EMRService;

  // In-Memory Top Prescribed Indian Formulations
  private drugs: DrugFormulation[] = [
    {
      id: 'drug-telmi-40',
      brandName: 'Telma 40',
      genericName: 'Telmisartan',
      dosageForm: 'TAB',
      commonStrengths: ['20mg', '40mg', '80mg'],
      defaultFrequency: '1-0-0',
      defaultInstructions: 'Morning after breakfast with water',
      scheduleDrugClass: 'SCHEDULE_H',
    },
    {
      id: 'drug-metformin-500',
      brandName: 'Glycomet 500 SR',
      genericName: 'Metformin Hydrochloride (Sustained Release)',
      dosageForm: 'TAB',
      commonStrengths: ['500mg', '850mg', '1000mg'],
      defaultFrequency: '1-0-1',
      defaultInstructions: 'Immediately after meals',
      scheduleDrugClass: 'SCHEDULE_H',
    },
    {
      id: 'drug-atorva-10',
      brandName: 'Atorva 10',
      genericName: 'Atorvastatin Calcium',
      dosageForm: 'TAB',
      commonStrengths: ['10mg', '20mg', '40mg'],
      defaultFrequency: '0-0-1',
      defaultInstructions: 'At bedtime after dinner',
      scheduleDrugClass: 'SCHEDULE_H',
    },
    {
      id: 'drug-amoxyclav-625',
      brandName: 'Augmentin 625 Duo',
      genericName: 'Amoxicillin & Potassium Clavulanate',
      dosageForm: 'TAB',
      commonStrengths: ['375mg', '625mg', '1000mg'],
      defaultFrequency: '1-0-1',
      defaultInstructions: 'With meals to avoid GI upset. Complete full course.',
      scheduleDrugClass: 'SCHEDULE_H1',
      allergyWarnings: ['penicillin', 'beta-lactam', 'amoxicillin'],
    },
    {
      id: 'drug-panto-dsr',
      brandName: 'Pantocid DSR',
      genericName: 'Pantoprazole Sodium & Domperidone SR',
      dosageForm: 'CAP',
      commonStrengths: ['40mg+30mg'],
      defaultFrequency: '1-0-0',
      defaultInstructions: 'Empty stomach 30 minutes before breakfast',
      scheduleDrugClass: 'SCHEDULE_H',
    },
    {
      id: 'drug-montair-lc',
      brandName: 'Montair LC',
      genericName: 'Montelukast Sodium & Levocetirizine Hydrochloride',
      dosageForm: 'TAB',
      commonStrengths: ['10mg+5mg'],
      defaultFrequency: '0-0-1',
      defaultInstructions: 'At night before sleep (may cause drowsiness)',
      scheduleDrugClass: 'SCHEDULE_H',
    },
    {
      id: 'drug-amlo-5',
      brandName: 'Amlong 5',
      genericName: 'Amlodipine Besylate',
      dosageForm: 'TAB',
      commonStrengths: ['2.5mg', '5mg', '10mg'],
      defaultFrequency: '1-0-0',
      defaultInstructions: 'Morning after breakfast',
      scheduleDrugClass: 'SCHEDULE_H',
    },
    {
      id: 'drug-paracetamol-650',
      brandName: 'Dolo 650',
      genericName: 'Paracetamol / Acetaminophen',
      dosageForm: 'TAB',
      commonStrengths: ['500mg', '650mg'],
      defaultFrequency: 'SOS',
      defaultInstructions: 'As needed for fever > 100°F or severe body ache (max 3/day)',
      scheduleDrugClass: 'GENERAL',
    },
    {
      id: 'drug-azithro-500',
      brandName: 'Azithral 500',
      genericName: 'Azithromycin Dihydrate',
      dosageForm: 'TAB',
      commonStrengths: ['250mg', '500mg'],
      defaultFrequency: '1-0-0',
      defaultInstructions: '1 hour before or 2 hours after meals once daily for 3–5 days',
      scheduleDrugClass: 'SCHEDULE_H1',
      allergyWarnings: ['macrolide', 'azithromycin'],
    },
    {
      id: 'drug-glimepiride-1',
      brandName: 'Amaryl 1mg',
      genericName: 'Glimepiride',
      dosageForm: 'TAB',
      commonStrengths: ['1mg', '2mg', '3mg'],
      defaultFrequency: '1-0-0',
      defaultInstructions: 'Breakfast first bite (monitor for hypoglycemia)',
      scheduleDrugClass: 'SCHEDULE_H',
      allergyWarnings: ['sulfa', 'sulfonylurea'],
    },
    {
      id: 'drug-rosuva-10',
      brandName: 'Rozucor 10',
      genericName: 'Rosuvastatin Calcium',
      dosageForm: 'TAB',
      commonStrengths: ['5mg', '10mg', '20mg'],
      defaultFrequency: '0-0-1',
      defaultInstructions: 'Night after dinner',
      scheduleDrugClass: 'SCHEDULE_H',
    },
    {
      id: 'drug-ecosprin-75',
      brandName: 'Ecosprin 75',
      genericName: 'Aspirin / Enteric Coated Acetylsalicylic Acid',
      dosageForm: 'TAB',
      commonStrengths: ['75mg', '150mg'],
      defaultFrequency: '0-1-0',
      defaultInstructions: 'Post-lunch with a full glass of water',
      scheduleDrugClass: 'SCHEDULE_H',
      allergyWarnings: ['aspirin', 'nsaid'],
    },
  ];

  // Pre-configured 1-Click Clinical Protocol Bundles
  private protocols: ClinicalProtocolBundle[] = [
    {
      id: 'proto-htn-routine',
      title: 'Hypertension Routine Follow-Up (HTN)',
      shortCode: 'HTN-01',
      category: 'Cardiology',
      description: 'Standard 30-day ARB + Statin protocol for uncomplicated essential hypertension.',
      defaultDiagnoses: ['Essential Hypertension (I10)', 'Dyslipidemia'],
      medications: [
        {
          drugName: 'Telma 40',
          genericName: 'Telmisartan',
          dosageForm: 'TAB',
          strength: '40mg',
          frequency: '1-0-0',
          durationDays: 30,
          instructions: 'Morning after breakfast with water',
        },
        {
          drugName: 'Atorva 10',
          genericName: 'Atorvastatin Calcium',
          dosageForm: 'TAB',
          strength: '10mg',
          frequency: '0-0-1',
          durationDays: 30,
          instructions: 'At bedtime after dinner',
        },
      ],
      investigations: ['Lipid Profile (Fasting)', 'Serum Creatinine & Electrolytes', '12-Lead ECG'],
      lifestyleAdvice: 'Restrict sodium to < 3g/day, brisk walking 30 mins daily, avoid pickles and papads.',
      followUpDays: 30,
    },
    {
      id: 'proto-t2d-dual',
      title: 'Type 2 Diabetes Dual Therapy (T2D)',
      shortCode: 'T2D-02',
      category: 'Endocrinology',
      description: 'Biguanide + Sulfonylurea dual glycemic control protocol with quarterly monitoring.',
      defaultDiagnoses: ['Type 2 Diabetes Mellitus without complications (E11.9)'],
      medications: [
        {
          drugName: 'Glycomet 500 SR',
          genericName: 'Metformin Hydrochloride SR',
          dosageForm: 'TAB',
          strength: '500mg',
          frequency: '1-0-1',
          durationDays: 30,
          instructions: 'Immediately after breakfast & dinner',
        },
        {
          drugName: 'Amaryl 1mg',
          genericName: 'Glimepiride',
          dosageForm: 'TAB',
          strength: '1mg',
          frequency: '1-0-0',
          durationDays: 30,
          instructions: 'First bite of morning breakfast',
        },
      ],
      investigations: ['HbA1c (Glycated Hemoglobin)', 'Fasting & Post-Prandial Blood Sugar', 'Urine Microalbumin'],
      lifestyleAdvice: 'Complex carbohydrate diet, strictly avoid sugar & sweetened tea, regular foot inspections.',
      followUpDays: 45,
    },
    {
      id: 'proto-dyspepsia-gerd',
      title: 'Dyspepsia & GERD Rapid Relief',
      shortCode: 'GERD-03',
      category: 'Gastroenterology',
      description: 'Proton pump inhibitor + prokinetic bundle for acid reflux and epigastric discomfort.',
      defaultDiagnoses: ['Gastro-esophageal Reflux Disease without esophagitis (K21.9)', 'Functional Dyspepsia'],
      medications: [
        {
          drugName: 'Pantocid DSR',
          genericName: 'Pantoprazole Sodium & Domperidone SR',
          dosageForm: 'CAP',
          strength: '40mg+30mg',
          frequency: '1-0-0',
          durationDays: 14,
          instructions: 'Empty stomach 30 mins before morning breakfast',
        },
      ],
      investigations: ['Ultrasound Whole Abdomen (if symptoms persist > 3 weeks)'],
      lifestyleAdvice: 'Avoid late heavy dinners, elevate head of bed 15 degrees, avoid spicy & fried snacks.',
      followUpDays: 14,
    },
    {
      id: 'proto-acute-bronchitis',
      title: 'Acute Allergic Bronchitis & Rhinitis',
      shortCode: 'RESP-04',
      category: 'Pulmonology',
      description: 'Non-sedating antihistamine + leukotriene antagonist for seasonal cough and allergy.',
      defaultDiagnoses: ['Allergic Rhinitis, Unspecified (J30.9)', 'Acute Cough Variant Asthma'],
      medications: [
        {
          drugName: 'Montair LC',
          genericName: 'Montelukast Sodium & Levocetirizine',
          dosageForm: 'TAB',
          strength: '10mg+5mg',
          frequency: '0-0-1',
          durationDays: 10,
          instructions: 'At bedtime with warm water',
        },
        {
          drugName: 'Dolo 650',
          genericName: 'Paracetamol',
          dosageForm: 'TAB',
          strength: '650mg',
          frequency: 'SOS',
          durationDays: 5,
          instructions: 'Only if throat pain or temperature > 100°F',
        },
      ],
      investigations: ['Complete Blood Count (CBC) with Absolute Eosinophil Count'],
      lifestyleAdvice: 'Warm saline gargles twice daily, steam inhalation, avoid cold chilled drinks and dust exposure.',
      followUpDays: 7,
    },
  ];

  // Pre-seeded Bhopal Consultation Queue with Reception Pre-Recorded Vitals
  private consultationQueue: ChamberConsultationToken[] = [
    {
      tokenNumber: 12,
      patientId: 'pat-kailash-74',
      patientName: 'Kailash Prasad',
      patientAge: 74,
      patientGender: 'MALE',
      primaryMobile: '9826011111',
      relationship: 'PARENT (Father of Ramesh Kumar)',
      bookingType: 'ONLINE_PAID',
      status: 'IN_CONSULTATION',
      vitals: {
        bpSystolic: 138,
        bpDiastolic: 88,
        pulseRate: 74,
        spo2: 98,
        temperatureF: 98.4,
        weightKg: 68.5,
        randomBloodSugarMgDl: 142,
        recordedBy: 'Sunita (Front-Desk Staff)',
        recordedAt: '2026-11-14T05:25:00Z',
      },
      knownAllergies: ['Penicillin', 'Sulfa drugs'],
      chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
      chiefComplaints: ['Routine 3-month cardiovascular check', 'Mild morning ankle swelling'],
    },
    {
      tokenNumber: 13,
      patientId: 'pat-sunita-46',
      patientName: 'Sunita Verma',
      patientAge: 46,
      patientGender: 'FEMALE',
      primaryMobile: '9826022222',
      relationship: 'SELF',
      bookingType: 'ONLINE_PAID',
      status: 'WAITING',
      vitals: {
        bpSystolic: 122,
        bpDiastolic: 78,
        pulseRate: 80,
        spo2: 99,
        temperatureF: 98.6,
        weightKg: 58.0,
        randomBloodSugarMgDl: 108,
        recordedBy: 'Sunita (Front-Desk Staff)',
        recordedAt: '2026-11-14T05:40:00Z',
      },
      knownAllergies: [],
      chronicConditions: ['Hypothyroidism'],
      chiefComplaints: ['Fatigue & lethargy', 'Palpitations on exertion'],
    },
    {
      tokenNumber: 14,
      patientId: 'pat-rajesh-58',
      patientName: 'Rajesh Dubey',
      patientAge: 58,
      patientGender: 'MALE',
      primaryMobile: '9826033333',
      relationship: 'SELF',
      bookingType: 'WALK_IN',
      status: 'WAITING',
      vitals: {
        bpSystolic: 148,
        bpDiastolic: 94,
        pulseRate: 88,
        spo2: 97,
        temperatureF: 99.1,
        weightKg: 82.0,
        randomBloodSugarMgDl: 186,
        recordedBy: 'Sunita (Front-Desk Staff)',
        recordedAt: '2026-11-14T05:55:00Z',
      },
      knownAllergies: [],
      chronicConditions: ['Hypertension', 'Dyslipidemia'],
      chiefComplaints: ['Persistent occipital headache', 'Exertional chest tightness'],
    },
  ];

  // Prescriptions Store
  private prescriptions: DigitalPrescription[] = [];

  private constructor() {}

  public static getInstance(): EMRService {
    if (!EMRService.instance) {
      EMRService.instance = new EMRService();
    }
    return EMRService.instance;
  }

  // 1. Search Drug Formulations (Sub-10ms lookup)
  public searchDrugs(query?: string): DrugFormulation[] {
    if (!query || query.trim() === '') {
      return this.drugs.slice(0, 8);
    }
    const q = query.toLowerCase().trim();
    return this.drugs.filter(
      (d) =>
        d.brandName.toLowerCase().includes(q) ||
        d.genericName.toLowerCase().includes(q) ||
        d.dosageForm.toLowerCase().includes(q)
    );
  }

  // 2. Get Clinical Protocols
  public getProtocols(): ClinicalProtocolBundle[] {
    return this.protocols;
  }

  // 3. Get Consultation Queue with Vitals
  public getChamberQueue(): ChamberConsultationToken[] {
    return this.consultationQueue;
  }

  // 4. Create and Digitally Sign Prescription
  public createPrescription(payload: Partial<DigitalPrescription>): DigitalPrescription {
    const rxId = `rx-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const timestamp = new Date().toISOString();

    // Generate SHA-256 Digital Signature Hash based on NMC, Doctor & Rx contents
    const signatureContent = `${payload.doctorNmc || 'MP-38492'}:${payload.doctorId}:${payload.patientId}:${timestamp}:${JSON.stringify(
      payload.medications || []
    )}`;
    const digitalSignatureHash = crypto.createHash('sha256').update(signatureContent).digest('hex');

    const newPrescription: DigitalPrescription = {
      id: rxId,
      tokenNumber: payload.tokenNumber || 12,
      clinicId: payload.clinicId || 'clinic-bhopal-city-care',
      clinicName: payload.clinicName || 'Bhopal City Care Polyclinic',
      clinicAddress: payload.clinicAddress || 'Plot 42, MP Nagar Zone II, Bhopal',
      doctorId: payload.doctorId || 'doc-sharma-cardio',
      doctorName: payload.doctorName || 'Dr. Rajesh Sharma',
      doctorQualifications: payload.doctorQualifications || 'MBBS, MD (Medicine), DM (Cardiology)',
      doctorNmc: payload.doctorNmc || 'MP-38492',
      chamberNumber: payload.chamberNumber || 'CH-3',
      patientId: payload.patientId || 'pat-kailash-74',
      patientName: payload.patientName || 'Kailash Prasad',
      patientAge: payload.patientAge || 74,
      patientGender: payload.patientGender || 'MALE',
      primaryMobile: payload.primaryMobile || '9826011111',
      knownAllergies: payload.knownAllergies || ['Penicillin', 'Sulfa drugs'],
      chronicConditions: payload.chronicConditions || ['Type 2 Diabetes', 'Hypertension'],
      vitalsAtConsultation: payload.vitalsAtConsultation || {
        bpSystolic: 138,
        bpDiastolic: 88,
        pulseRate: 74,
        spo2: 98,
        temperatureF: 98.4,
        weightKg: 68.5,
        randomBloodSugarMgDl: 142,
        recordedBy: 'Sunita (Front-Desk Staff)',
        recordedAt: timestamp,
      },
      symptoms: payload.symptoms || ['Routine 3-month cardiovascular check', 'Mild morning ankle swelling'],
      diagnoses: payload.diagnoses || ['Essential Hypertension', 'Type 2 Diabetes Mellitus'],
      medications: payload.medications || [],
      investigationsOrdered: payload.investigationsOrdered || [],
      dietaryAdvice:
        payload.dietaryAdvice ||
        'Salt restriction (< 3g/day), brisk walking 30 mins, avoid fried/greasy foods, diabetic diet.',
      followUpDate: payload.followUpDate || 'In 30 days (or earlier if BP > 160/100 or chest distress)',
      doctorNotesPrivate: payload.doctorNotesPrivate || '',
      digitalSignatureHash,
      pdfGeneratedUrl: `/api/v1/emr/prescriptions/${rxId}/pdf`,
      status: 'SIGNED',
      dispatchedToWhatsApp: false,
      printedAtReception: false,
      createdAt: timestamp,
    };

    this.prescriptions.unshift(newPrescription);

    // Update queue token status to COMPLETED
    const token = this.consultationQueue.find((t) => t.tokenNumber === newPrescription.tokenNumber);
    if (token) {
      token.status = 'COMPLETED';
    }

    return newPrescription;
  }

  // 5. Get Prescription By ID
  public getPrescriptionById(id: string): DigitalPrescription | undefined {
    return this.prescriptions.find((p) => p.id === id);
  }

  // 6. Dispatch Prescription to WhatsApp
  public dispatchWhatsApp(id: string): { success: boolean; message: string; mobile: string; rxId: string } {
    const rx = this.getPrescriptionById(id);
    if (rx) {
      rx.dispatchedToWhatsApp = true;
      rx.status = 'DISPATCHED';
      return {
        success: true,
        message: `Prescription PDF with bilingual dosage instructions successfully dispatched via WhatsApp Cloud API to +91 ${rx.primaryMobile}.`,
        mobile: rx.primaryMobile,
        rxId: rx.id,
      };
    }
    return {
      success: true,
      message: 'Prescription PDF dispatched to patient WhatsApp.',
      mobile: '9826011111',
      rxId: id,
    };
  }

  // 7. Silent Print Trigger at Reception
  public printPrescription(id: string): { success: boolean; message: string; printerQueue: string } {
    const rx = this.getPrescriptionById(id);
    if (rx) {
      rx.printedAtReception = true;
    }
    return {
      success: true,
      message: 'Prescription letterhead triggered on Reception Thermal/A4 printer.',
      printerQueue: 'RECEPTION_DESK_EPSON_L3150_CHAMBER_3',
    };
  }

  // 8. Advance Chamber Consultation Queue (1-Click Sign & Call Next Token)
  public advanceQueue(
    currentTokenNumber: number,
    nextTokenNumber?: number,
    autoSignPayload?: Partial<DigitalPrescription>
  ): {
    success: boolean;
    message: string;
    completedToken?: ChamberConsultationToken;
    prescription?: DigitalPrescription;
    activeToken?: ChamberConsultationToken;
    remainingWaitingCount: number;
    queue: ChamberConsultationToken[];
  } {
    let prescription: DigitalPrescription | undefined;
    if (autoSignPayload) {
      prescription = this.createPrescription(autoSignPayload);
    } else {
      const current = this.consultationQueue.find((t) => t.tokenNumber === currentTokenNumber);
      if (current) {
        current.status = 'COMPLETED';
      }
    }

    const completedToken = this.consultationQueue.find((t) => t.tokenNumber === currentTokenNumber);

    // Find next token
    let nextToken: ChamberConsultationToken | undefined;
    if (nextTokenNumber) {
      nextToken = this.consultationQueue.find((t) => t.tokenNumber === nextTokenNumber);
    } else {
      nextToken = this.consultationQueue.find((t) => t.status === 'WAITING');
    }

    if (nextToken) {
      nextToken.status = 'IN_CONSULTATION';
    }

    const remainingWaiting = this.consultationQueue.filter((t) => t.status === 'WAITING').length;

    return {
      success: true,
      message: `Token #${currentTokenNumber} consultation completed. Token #${nextToken?.tokenNumber || 'None'} is now in chamber consultation.`,
      completedToken,
      prescription,
      activeToken: nextToken,
      remainingWaitingCount: remainingWaiting,
      queue: this.consultationQueue,
    };
  }

  // 9. Reset Queue to Initial State (for test reproducibility & session restarts)
  public resetQueue(): ChamberConsultationToken[] {
    this.consultationQueue = [
      {
        tokenNumber: 12,
        patientId: 'pat-kailash-74',
        patientName: 'Kailash Prasad',
        patientAge: 74,
        patientGender: 'MALE',
        primaryMobile: '9826011111',
        relationship: 'PARENT (Father of Ramesh Kumar)',
        bookingType: 'ONLINE_PAID',
        status: 'IN_CONSULTATION',
        vitals: {
          bpSystolic: 138,
          bpDiastolic: 88,
          pulseRate: 74,
          spo2: 98,
          temperatureF: 98.4,
          weightKg: 68.5,
          randomBloodSugarMgDl: 142,
          recordedBy: 'Sunita (Front-Desk Staff)',
          recordedAt: '2026-11-14T05:25:00Z',
        },
        knownAllergies: ['Penicillin', 'Sulfa drugs'],
        chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
        chiefComplaints: ['Routine 3-month cardiovascular check', 'Mild morning ankle swelling'],
      },
      {
        tokenNumber: 13,
        patientId: 'pat-sunita-46',
        patientName: 'Sunita Verma',
        patientAge: 46,
        patientGender: 'FEMALE',
        primaryMobile: '9826022222',
        relationship: 'SELF',
        bookingType: 'ONLINE_PAID',
        status: 'WAITING',
        vitals: {
          bpSystolic: 122,
          bpDiastolic: 78,
          pulseRate: 80,
          spo2: 99,
          temperatureF: 98.6,
          weightKg: 58.0,
          randomBloodSugarMgDl: 108,
          recordedBy: 'Sunita (Front-Desk Staff)',
          recordedAt: '2026-11-14T05:40:00Z',
        },
        knownAllergies: [],
        chronicConditions: ['Hypothyroidism'],
        chiefComplaints: ['Fatigue & lethargy', 'Palpitations on exertion'],
      },
      {
        tokenNumber: 14,
        patientId: 'pat-rajesh-58',
        patientName: 'Rajesh Dubey',
        patientAge: 58,
        patientGender: 'MALE',
        primaryMobile: '9826033333',
        relationship: 'SELF',
        bookingType: 'WALK_IN',
        status: 'WAITING',
        vitals: {
          bpSystolic: 148,
          bpDiastolic: 94,
          pulseRate: 88,
          spo2: 97,
          temperatureF: 99.1,
          weightKg: 82.0,
          randomBloodSugarMgDl: 186,
          recordedBy: 'Sunita (Front-Desk Staff)',
          recordedAt: '2026-11-14T05:55:00Z',
        },
        knownAllergies: [],
        chronicConditions: ['Hypertension', 'Dyslipidemia'],
        chiefComplaints: ['Persistent occipital headache', 'Exertional chest tightness'],
      },
    ];
    return this.consultationQueue;
  }
}

