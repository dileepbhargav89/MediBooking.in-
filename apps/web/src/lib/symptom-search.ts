/**
 * Symptom-to-Specialty Semantic Mapping Engine (Bilingual English & Hindi)
 * Maps colloquial patient symptom descriptions to clinical specialties.
 */

import { DOCTORS_MASTER_DIRECTORY, DoctorDirectoryItem } from './doctor-directory';

export interface SymptomTaxonomyEntry {
  symptomKey: string;
  displayLabel: string;
  hindiLabel: string;
  specialty: string;
  keywords: string[];
  isEmergencyAlert?: boolean;
  emergencyNotice?: string;
  icon: string;
}

export const COMMON_SYMPTOMS_TAXONOMY: SymptomTaxonomyEntry[] = [
  {
    symptomKey: 'chest-pain',
    displayLabel: 'Chest Heaviness & BP',
    hindiLabel: 'सीने में दर्द / भारीपन',
    specialty: 'Cardiology',
    icon: '🫀',
    keywords: [
      'chest pain',
      'chest heaviness',
      'chest discomfort',
      'bp',
      'blood pressure',
      'heart',
      'palpitation',
      'heart attack',
      'angina',
      'छाती',
      'सीना',
      'दिल',
      'बीपी',
      'घबराहट',
    ],
    isEmergencyAlert: true,
    emergencyNotice: 'Severe crushing chest pain radiating to arm or jaw requires immediate 108 Emergency Ambulance assistance.',
  },
  {
    symptomKey: 'skin-rash-acne',
    displayLabel: 'Acne & Skin Rash',
    hindiLabel: 'मुंहासे / त्वचा में खुजली',
    specialty: 'Dermatology',
    icon: '✨',
    keywords: [
      'acne',
      'pimple',
      'pimples',
      'skin rash',
      'rash',
      'itching',
      'hair fall',
      'dandruff',
      'eczema',
      'fungal',
      'ringworm',
      'त्वचा',
      'मुंहासे',
      'फुंसी',
      'खुजली',
      'बाल',
      'दाद',
    ],
  },
  {
    symptomKey: 'knee-joint-pain',
    displayLabel: 'Knee & Joint Pain',
    hindiLabel: 'घुटने व जोड़ों का दर्द',
    specialty: 'Orthopedics',
    icon: '🦴',
    keywords: [
      'knee',
      'knee pain',
      'joint',
      'joint pain',
      'backache',
      'back pain',
      'sciatica',
      'cervical',
      'neck pain',
      'fracture',
      'sprain',
      'arthritis',
      'घुटने',
      'जोड़',
      'कमर दर्द',
      'हड्डी',
      'मोच',
    ],
  },
  {
    symptomKey: 'sugar-diabetes-fever',
    displayLabel: 'Fever & Diabetes Sugar',
    hindiLabel: 'बुखार / शुगर / कमजोरी',
    specialty: 'General Medicine',
    icon: '💊',
    keywords: [
      'fever',
      'cold',
      'cough',
      'diabetes',
      'sugar',
      'blood sugar',
      'weakness',
      'fatigue',
      'infection',
      'thyroid',
      'बुखार',
      'खांसी',
      'जुकाम',
      'शुगर',
      'कमजोरी',
      'थायराइड',
    ],
  },
  {
    symptomKey: 'child-pediatric-fever',
    displayLabel: 'Child Fever & Cough',
    hindiLabel: 'बच्चों का बुखार / सर्दी',
    specialty: 'Pediatrics',
    icon: '👶',
    keywords: [
      'child',
      'baby',
      'infant',
      'pediatric',
      'child fever',
      'vaccination',
      'immunization',
      'child cough',
      'newborn',
      'बच्चा',
      'बच्चों',
      'शिशु',
      'टीकाकरण',
    ],
  },
  {
    symptomKey: 'stomach-acidity-gas',
    displayLabel: 'Acidity, Gas & Liver',
    hindiLabel: 'पेट दर्द / गैस / एसिडिटी',
    specialty: 'Gastroenterology',
    icon: '🔬',
    keywords: [
      'stomach',
      'acidity',
      'gas',
      'heartburn',
      'indigestion',
      'constipation',
      'diarrhea',
      'liver',
      'jaundice',
      'piles',
      'पेट दर्द',
      'गैस',
      'एसिडिटी',
      'कब्ज',
      'लीवर',
      'पीलिया',
    ],
  },
  {
    symptomKey: 'headache-migraine-stroke',
    displayLabel: 'Migraine & Dizziness',
    hindiLabel: 'सिर दर्द / माइग्रेन / चक्कर',
    specialty: 'Neurology',
    icon: '🧠',
    keywords: [
      'headache',
      'migraine',
      'dizziness',
      'vertigo',
      'stroke',
      'paralysis',
      'seizures',
      'epilepsy',
      'tremor',
      'सिर दर्द',
      'माइग्रेन',
      'चक्कर',
      'दौरे',
      'लकवा',
    ],
    isEmergencyAlert: true,
    emergencyNotice: 'Sudden facial droop, arm weakness, or speech slurring may indicate acute stroke. Please dial 108 immediately.',
  },
  {
    symptomKey: 'women-periods-pregnancy',
    displayLabel: 'Periods & Pregnancy',
    hindiLabel: 'पीरियड्स / महिला स्वास्थ्य',
    specialty: 'Gynecology',
    icon: '🌸',
    keywords: [
      'periods',
      'menstrual',
      'pregnancy',
      'pcos',
      'pcod',
      'fertility',
      'pelvic',
      'white discharge',
      'cramps',
      'महिला',
      'गर्भावस्था',
      'माहवारी',
    ],
  },
];

export interface SearchMatchResult {
  matchedSpecialty: string | null;
  matchedSymptoms: SymptomTaxonomyEntry[];
  emergencyNotice: string | null;
  filteredDoctors: DoctorDirectoryItem[];
}

/**
 * Searches the doctor directory using raw query, selected specialty, and selected locality
 */
export function searchDoctorsAndSymptoms(
  query: string,
  selectedSpecialty: string = 'ALL',
  selectedLocality: string = 'ALL'
): SearchMatchResult {
  const cleanQuery = query.toLowerCase().trim();

  // 1. Detect matching symptoms from query
  const matchedSymptoms = cleanQuery
    ? COMMON_SYMPTOMS_TAXONOMY.filter((entry) =>
        entry.keywords.some((kw) => cleanQuery.includes(kw))
      )
    : [];

  // Determine if query explicitly targets a specialty via symptom or text
  const primaryMatchedSymptom = matchedSymptoms[0];
  const detectedSpecialtyFromSymptom = primaryMatchedSymptom ? primaryMatchedSymptom.specialty : null;

  // Emergency detection
  const emergencyNotice = matchedSymptoms.find((s) => s.isEmergencyAlert)?.emergencyNotice || null;

  // 2. Filter Doctors
  const filteredDoctors = DOCTORS_MASTER_DIRECTORY.filter((doc) => {
    // Locality filter
    const matchesLocality =
      selectedLocality === 'ALL' ||
      doc.venues.some((v) => {
        const locLower = v.locality.toLowerCase();
        if (selectedLocality === 'MP_NAGAR') return locLower.includes('mp nagar');
        if (selectedLocality === 'ARERA') return locLower.includes('arera');
        if (selectedLocality === 'KOLAR') return locLower.includes('kolar');
        if (selectedLocality === 'TT_NAGAR') return locLower.includes('tt nagar') || locLower.includes('platinum');
        if (selectedLocality === 'SHAHPURA') return locLower.includes('shahpura');
        if (selectedLocality === 'AYODHYA') return locLower.includes('ayodhya') || locLower.includes('minal');
        return true;
      });

    // Specialty filter
    const effectiveSpecialty = selectedSpecialty !== 'ALL' ? selectedSpecialty : detectedSpecialtyFromSymptom;
    const matchesSpecialty =
      !effectiveSpecialty ||
      doc.specialty.toLowerCase() === effectiveSpecialty.toLowerCase();

    // Text search filter
    if (!cleanQuery) {
      return matchesLocality && matchesSpecialty;
    }

    const matchesName = doc.fullName.toLowerCase().includes(cleanQuery);
    const matchesBio = doc.bio.toLowerCase().includes(cleanQuery);
    const matchesTreatedSymptoms = doc.treatedSymptoms.some((s) =>
      s.toLowerCase().includes(cleanQuery)
    );
    const matchesVenue = doc.venues.some(
      (v) =>
        v.clinicName.toLowerCase().includes(cleanQuery) ||
        v.address.toLowerCase().includes(cleanQuery) ||
        v.locality.toLowerCase().includes(cleanQuery)
    );

    const matchesDirectSearch =
      matchesName || matchesBio || matchesTreatedSymptoms || matchesVenue;

    // Either matches text directly, OR matches through symptom-to-specialty mapping
    const matchesSymptomEngine = Boolean(
      detectedSpecialtyFromSymptom &&
        doc.specialty.toLowerCase() === detectedSpecialtyFromSymptom.toLowerCase()
    );

    return matchesLocality && (matchesDirectSearch || matchesSymptomEngine);
  });

  return {
    matchedSpecialty: detectedSpecialtyFromSymptom,
    matchedSymptoms,
    emergencyNotice,
    filteredDoctors,
  };
}

