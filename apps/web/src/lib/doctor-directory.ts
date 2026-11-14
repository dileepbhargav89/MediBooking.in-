/**
 * Centralized Doctor Directory, Polyclinic Venues, and Symptom Taxonomy for Bhopal Pilot
 */

export interface PracticeVenue {
  clinicId: string;
  clinicName: string;
  locality: string;
  address: string;
  chamberNumber: string;
  feeRupees: number;
  morningTiming: string;
  eveningTiming: string;
  tvSlug: string;
  currentStatus?: 'ACTIVE' | 'BREAK' | 'DELAYED';
  queueCount?: number;
}

export interface DoctorDirectoryItem {
  id: string;
  slug: string;
  fullName: string;
  specialty: string;
  specialtyLabel: string;
  qualifications: string;
  nmcNumber: string;
  stateMedicalCouncil: string;
  experienceYears: number;
  rating: string;
  reviewCount: number;
  languages: string;
  bio: string;
  treatedSymptoms: string[];
  venues: PracticeVenue[];
}

export const BHOPAL_LOCALITIES = [
  { id: 'ALL', label: 'All Bhopal' },
  { id: 'MP_NAGAR', label: 'MP Nagar', matchQuery: 'mp nagar' },
  { id: 'ARERA', label: 'Arera Colony', matchQuery: 'arera' },
  { id: 'KOLAR', label: 'Kolar Road', matchQuery: 'kolar' },
  { id: 'TT_NAGAR', label: 'TT Nagar', matchQuery: 'tt nagar' },
  { id: 'SHAHPURA', label: 'Shahpura', matchQuery: 'shahpura' },
  { id: 'AYODHYA', label: 'Ayodhya Bypass', matchQuery: 'ayodhya' },
];

export const DOCTORS_MASTER_DIRECTORY: DoctorDirectoryItem[] = [
  {
    id: 'doc-001',
    slug: 'dr-rajesh-sharma-cardio',
    fullName: 'Dr. Rajesh Sharma',
    specialty: 'Cardiology',
    specialtyLabel: 'Senior Interventional Cardiologist',
    qualifications: 'MBBS, MD (Medicine), DM (Cardiology, AIIMS)',
    nmcNumber: 'MP-38492',
    stateMedicalCouncil: 'Madhya Pradesh Medical Council (MPMC)',
    experienceYears: 18,
    rating: '4.9',
    reviewCount: 420,
    languages: 'Hindi, English',
    bio: 'Pioneer in preventative and interventional cardiology with over 18 years consulting at Bhopal premier polyclinics.',
    treatedSymptoms: [
      'Chest Pain & Heaviness',
      'High Blood Pressure (Hypertension)',
      'Heart Palpitations',
      'Shortness of Breath',
      'Cholesterol Management',
      'Post-Angioplasty Care',
    ],
    venues: [
      {
        clinicId: 'c1010000-0000-4000-8000-000000000001',
        clinicName: 'Bhopal City Care Polyclinic',
        locality: 'MP Nagar Zone-II',
        address: 'Plot 42, MP Nagar Zone II, Near Sargam Cinema, Bhopal',
        chamberNumber: 'CH-1',
        feeRupees: 600,
        morningTiming: '10:00 AM – 01:00 PM',
        eveningTiming: '05:30 PM – 08:30 PM',
        tvSlug: 'citycare-mpnagar-bhopal',
        currentStatus: 'ACTIVE',
        queueCount: 6,
      },
      {
        clinicId: 'c1010000-0000-4000-8000-000000000002',
        clinicName: 'Arera Super Specialty Polyclinic',
        locality: 'Arera Colony',
        address: 'E-3 Commercial Complex, Arera Colony, Bhopal',
        chamberNumber: 'CH-3',
        feeRupees: 800,
        morningTiming: '08:30 AM – 10:00 AM',
        eveningTiming: '04:00 PM – 05:30 PM',
        tvSlug: 'narmada-health-arera-bhopal',
        currentStatus: 'ACTIVE',
        queueCount: 3,
      },
    ],
  },
  {
    id: 'doc-002',
    slug: 'dr-priya-patel-derma',
    fullName: 'Dr. Priya Patel',
    specialty: 'Dermatology',
    specialtyLabel: 'Aesthetic Dermatologist & Trichologist',
    qualifications: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    nmcNumber: 'MPMC-51042',
    stateMedicalCouncil: 'Madhya Pradesh Medical Council (MPMC)',
    experienceYears: 11,
    rating: '4.8',
    reviewCount: 310,
    languages: 'Hindi, English',
    bio: 'Specialist in clinical dermatology, acne scarring, eczema, hair loss, and cosmetic laser procedures.',
    treatedSymptoms: [
      'Acne & Pimples',
      'Skin Rashes & Allergies',
      'Hair Fall & Alopecia',
      'Dandruff & Scalp Itch',
      'Fungal Infections & Ringworm',
      'Eczema & Psoriasis',
    ],
    venues: [
      {
        clinicId: 'c1010000-0000-4000-8000-000000000001',
        clinicName: 'CityCare Polyclinic & Diagnostic Centre',
        locality: 'MP Nagar Zone-II',
        address: 'Plot 42, MP Nagar Zone II, Bhopal',
        chamberNumber: 'CH-2',
        feeRupees: 600,
        morningTiming: '11:00 AM – 01:00 PM',
        eveningTiming: '05:30 PM – 08:00 PM',
        tvSlug: 'citycare-mpnagar-bhopal',
        currentStatus: 'ACTIVE',
        queueCount: 4,
      },
    ],
  },
  {
    id: 'doc-003',
    slug: 'dr-alok-verma-neuro',
    fullName: 'Dr. Alok Verma',
    specialty: 'Neurology',
    specialtyLabel: 'Senior Neurologist & Stroke Specialist',
    qualifications: 'MBBS, MD (Medicine), DM (Neurology, PGIMER Chandigarh)',
    nmcNumber: 'MPMC-39182',
    stateMedicalCouncil: 'Madhya Pradesh Medical Council (MPMC)',
    experienceYears: 18,
    rating: '4.9',
    reviewCount: 530,
    languages: 'Hindi, English',
    bio: 'Expert clinical neurologist diagnosing stroke, epilepsy, chronic migraines, peripheral neuropathy, and Parkinson disease.',
    treatedSymptoms: [
      'Chronic Migraines & Headaches',
      'Stroke Rehabilitation',
      'Dizziness & Vertigo',
      'Epilepsy & Seizures',
      'Numbness & Tingling in Limbs',
      'Tremors & Parkinsonism',
    ],
    venues: [
      {
        clinicId: 'c1010000-0000-4000-8000-000000000002',
        clinicName: 'Narmada Health & Specialty Polyclinic',
        locality: 'Arera Colony',
        address: 'E-3/12, Near 10 No. Market, Arera Colony, Bhopal',
        chamberNumber: 'CH-1',
        feeRupees: 800,
        morningTiming: '09:00 AM – 11:30 AM',
        eveningTiming: '06:00 PM – 09:00 PM',
        tvSlug: 'narmada-health-arera-bhopal',
        currentStatus: 'ACTIVE',
        queueCount: 5,
      },
    ],
  },
  {
    id: 'doc-004',
    slug: 'dr-vivek-saxena-genmed',
    fullName: 'Dr. Vivek Saxena',
    specialty: 'General Medicine',
    specialtyLabel: 'Consultant Physician & Diabetologist',
    qualifications: 'MBBS, MD (General Medicine, GMC Bhopal)',
    nmcNumber: 'MPMC-42109',
    stateMedicalCouncil: 'Madhya Pradesh Medical Council (MPMC)',
    experienceYears: 14,
    rating: '4.8',
    reviewCount: 290,
    languages: 'Hindi, English',
    bio: 'Dedicated family physician focused on adult internal medicine, Type-2 diabetes glycemic control, and infectious diseases.',
    treatedSymptoms: [
      'Persistent Fever & Viral Illness',
      'Diabetes & High Blood Sugar',
      'General Weakness & Fatigue',
      'Chronic Cough & Cold',
      'Thyroid Disorders',
      'Annual Executive Health Check',
    ],
    venues: [
      {
        clinicId: 'c1010000-0000-4000-8000-000000000003',
        clinicName: 'Kolar Prime MediChambers',
        locality: 'Kolar Road',
        address: 'A-14, Sarvadharam C-Sector, Main Kolar Road, Bhopal',
        chamberNumber: 'CH-1',
        feeRupees: 500,
        morningTiming: '10:00 AM – 01:00 PM',
        eveningTiming: '06:30 PM – 09:00 PM',
        tvSlug: 'kolar-prime-sarvadharam-bhopal',
        currentStatus: 'ACTIVE',
        queueCount: 7,
      },
    ],
  },
  {
    id: 'doc-005',
    slug: 'dr-manish-dubey-gastro',
    fullName: 'Dr. Manish Dubey',
    specialty: 'Gastroenterology',
    specialtyLabel: 'Gastroenterology & Hepatology Consultant',
    qualifications: 'MBBS, MD, DNB (Gastroenterology)',
    nmcNumber: 'MPMC-47120',
    stateMedicalCouncil: 'Madhya Pradesh Medical Council (MPMC)',
    experienceYears: 13,
    rating: '4.9',
    reviewCount: 380,
    languages: 'Hindi, English',
    bio: 'Comprehensive digestive tract specialist treating acidity, IBS, fatty liver, endoscopy, and gallbladder issues.',
    treatedSymptoms: [
      'Severe Acidity & GERD Heartburn',
      'Abdominal Pain & Cramps',
      'Chronic Indigestion & Gas',
      'Fatty Liver & Jaundice',
      'Constipation & Diarrhea',
      'Blood in Stool & Piles',
    ],
    venues: [
      {
        clinicId: 'c1010000-0000-4000-8000-000000000004',
        clinicName: 'Bhopal Care Polyclinic & Daycare',
        locality: 'TT Nagar',
        address: 'Unit 204, Platinum Plaza, TT Nagar, Bhopal',
        chamberNumber: 'CH-1',
        feeRupees: 750,
        morningTiming: '10:00 AM – 12:30 PM',
        eveningTiming: '05:00 PM – 07:30 PM',
        tvSlug: 'bhopal-care-ttnagar-bhopal',
        currentStatus: 'ACTIVE',
        queueCount: 2,
      },
    ],
  },
  {
    id: 'doc-006',
    slug: 'dr-sandeep-kothari-ortho',
    fullName: 'Dr. Sandeep Kothari',
    specialty: 'Orthopedics',
    specialtyLabel: 'Joint Replacement & Spine Specialist',
    qualifications: 'MBBS, MS (Ortho), Fellowship in Arthroplasty (Germany)',
    nmcNumber: 'MPMC-38019',
    stateMedicalCouncil: 'Madhya Pradesh Medical Council (MPMC)',
    experienceYears: 20,
    rating: '4.9',
    reviewCount: 480,
    languages: 'Hindi, English',
    bio: 'Leading orthopedic surgeon in Bhopal specializing in knee arthritis, robotic joint replacement, sciatica, and sports injuries.',
    treatedSymptoms: [
      'Knee Pain & Osteoarthritis',
      'Lower Backache & Sciatica',
      'Neck Pain & Cervical Spondylosis',
      'Shoulder Frozen Joint',
      'Bone Fracture & Sprain Care',
      'Sports Ligament Injury',
    ],
    venues: [
      {
        clinicId: 'c1010000-0000-4000-8000-000000000006',
        clinicName: 'Bhopal Ortho & Joint Center',
        locality: 'MP Nagar Zone-I',
        address: 'Zone-I, Above Apollo Pharmacy, MP Nagar, Bhopal',
        chamberNumber: 'CH-4',
        feeRupees: 750,
        morningTiming: '10:30 AM – 01:00 PM',
        eveningTiming: '06:00 PM – 08:30 PM',
        tvSlug: 'citycare-mpnagar-bhopal',
        currentStatus: 'ACTIVE',
        queueCount: 4,
      },
    ],
  },
  {
    id: 'doc-007',
    slug: 'dr-rohit-chouhan-pedia',
    fullName: 'Dr. Rohit Chouhan',
    specialty: 'Pediatrics',
    specialtyLabel: 'Pediatrician & Neonatologist',
    qualifications: 'MBBS, MD (Pediatrics, GMC Bhopal)',
    nmcNumber: 'MPMC-50119',
    stateMedicalCouncil: 'Madhya Pradesh Medical Council (MPMC)',
    experienceYears: 10,
    rating: '4.9',
    reviewCount: 340,
    languages: 'Hindi, English',
    bio: 'Gentle child specialist providing routine infant immunization, pediatric asthma, seasonal infections, and milestone tracking.',
    treatedSymptoms: [
      'Child Fever & Cold',
      'Infant Vomiting & Diarrhea',
      'Routine Immunization & Vaccination',
      'Child Asthma & Wheezing',
      'Newborn Jaundice & Colic',
      'Growth & Milestone Assessment',
    ],
    venues: [
      {
        clinicId: 'c1010000-0000-4000-8000-000000000008',
        clinicName: 'Little Angels Pediatric Hub',
        locality: 'Kolar Road',
        address: 'Chuna Bhatti Main Road, Kolar, Bhopal',
        chamberNumber: 'CH-3',
        feeRupees: 500,
        morningTiming: '10:00 AM – 01:00 PM',
        eveningTiming: '06:00 PM – 08:30 PM',
        tvSlug: 'citycare-mpnagar-bhopal',
        currentStatus: 'ACTIVE',
        queueCount: 3,
      },
    ],
  },
  {
    id: 'doc-008',
    slug: 'dr-kavita-deshmukh-gyn',
    fullName: 'Dr. Kavita Deshmukh',
    specialty: 'Gynecology',
    specialtyLabel: 'Obstetrician & Gynecologist',
    qualifications: 'MBBS, MS (Obstetrics & Gynecology, GMC Bhopal)',
    nmcNumber: 'MPMC-44102',
    stateMedicalCouncil: 'Madhya Pradesh Medical Council (MPMC)',
    experienceYears: 15,
    rating: '4.8',
    reviewCount: 260,
    languages: 'Hindi, English',
    bio: 'Compassionate women health expert specializing in antenatal pregnancy care, PCOS/PCOD hormonal balancing, and infertility.',
    treatedSymptoms: [
      'Irregular Periods & Menstrual Pain',
      'PCOS / PCOD Hormonal Management',
      'Pregnancy Consultation & Antenatal Care',
      'White Discharge & Pelvic Infection',
      'Menopause & Hot Flashes',
      'Infertility & Preconception Counseling',
    ],
    venues: [
      {
        clinicId: 'c1010000-0000-4000-8000-000000000007',
        clinicName: 'Metro Care Women Clinic',
        locality: 'TT Nagar',
        address: 'Near New Market, Malviya Nagar / TT Nagar, Bhopal',
        chamberNumber: 'CH-2',
        feeRupees: 600,
        morningTiming: '10:00 AM – 12:30 PM',
        eveningTiming: '05:30 PM – 08:00 PM',
        tvSlug: 'citycare-mpnagar-bhopal',
        currentStatus: 'ACTIVE',
        queueCount: 5,
      },
    ],
  },
];

