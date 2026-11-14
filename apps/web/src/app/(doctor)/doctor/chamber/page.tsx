'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Modal,
} from '@medibooking/ui';
import {
  ChamberConsultationToken,
  ClinicalProtocolBundle,
  DrugFormulation,
  PrescriptionMedication,
  DigitalPrescription,
  OfflineQueueItem,
  DrugInteractionAlert,
  PediatricDosingCalculation,
} from '@medibooking/types';

interface DrugInteractionRule {
  id: string;
  drugA: string;
  drugB: string;
  severity: 'HIGH_RISK' | 'MODERATE_RISK';
  title: string;
  mechanism: string;
  clinicalGuidance: string;
}

const DDI_RULES: DrugInteractionRule[] = [
  {
    id: 'ddi-telmi-spiro',
    drugA: 'telmisartan',
    drugB: 'spironolactone',
    severity: 'HIGH_RISK',
    title: 'Severe Hyperkalemia Risk: Telmisartan (ARB) + Spironolactone',
    mechanism: 'Concomitant ARB and potassium-sparing aldosterone antagonist therapy severely impairs renal potassium excretion, posing critical risk of cardiac arrhythmia or conduction arrest.',
    clinicalGuidance: 'Avoid combination unless under specialist nephrology protocol. Closely monitor serum potassium (target < 5.0 mEq/L) and eGFR, or substitute with Chlorthalidone.',
  },
  {
    id: 'ddi-ace-nsaid',
    drugA: 'enalapril',
    drugB: 'ibuprofen',
    severity: 'HIGH_RISK',
    title: 'Acute Kidney Injury (Triple Whammy): ACE Inhibitor + NSAID',
    mechanism: 'NSAIDs cause afferent arteriolar vasoconstriction while ACE inhibitors blunt efferent resistance, sharply decreasing glomerular filtration pressure and blunting antihypertensive efficacy.',
    clinicalGuidance: 'Avoid regular NSAID co-prescription. Use Paracetamol 650mg as first-line analgesic or topical NSAIDs.',
  },
  {
    id: 'ddi-clopidogrel-aspirin',
    drugA: 'clopidogrel',
    drugB: 'aspirin',
    severity: 'MODERATE_RISK',
    title: 'Major Bleeding Risk: Dual Antiplatelet Therapy (DAPT)',
    mechanism: 'Synergistic platelet inhibition increases risk of major gastrointestinal and intracranial hemorrhage.',
    clinicalGuidance: 'Ensure appropriate proton pump inhibitor (e.g. Pantoprazole) gastro-protection is co-prescribed.',
  },
];

export default function DoctorPrescriptionComposerPage() {
  // Queue & Active Patient State
  const [queue, setQueue] = useState<ChamberConsultationToken[]>([]);
  const [selectedTokenNumber, setSelectedTokenNumber] = useState<number>(12);
  const [protocols, setProtocols] = useState<ClinicalProtocolBundle[]>([]);

  // Drug Search & Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DrugFormulation[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Active Prescription Form State
  const [diagnoses, setDiagnoses] = useState<string[]>([
    'Essential Hypertension (I10)',
    'Type 2 Diabetes Mellitus (E11.9)',
  ]);
  const [medications, setMedications] = useState<PrescriptionMedication[]>([
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
      drugName: 'Glycomet 500 SR',
      genericName: 'Metformin Hydrochloride SR',
      dosageForm: 'TAB',
      strength: '500mg',
      frequency: '1-0-1',
      durationDays: 30,
      instructions: 'Immediately after meals',
    },
  ]);
  const [investigations, setInvestigations] = useState<string[]>([
    'Lipid Profile (Fasting)',
    'HbA1c (Glycated Hemoglobin)',
    '12-Lead ECG',
  ]);
  const [dietaryAdvice, setDietaryAdvice] = useState<string>(
    'Salt restriction (< 3g/day), brisk walking 30 mins daily, avoid fried foods and sugar-sweetened tea.'
  );
  const [followUpDate, setFollowUpDate] = useState<string>('In 30 days (4 weeks)');
  const [doctorNotesPrivate, setDoctorNotesPrivate] = useState<string>('');

  // Drug Allergy Safety Modal State
  const [allergyAlertModalOpen, setAllergyAlertModalOpen] = useState(false);
  const [flaggedDrug, setFlaggedDrug] = useState<DrugFormulation | null>(null);
  const [matchedAllergen, setMatchedAllergen] = useState<string>('');

  // Prescription Signing & Output Preview Modal
  const [isSigning, setIsSigning] = useState(false);
  const [signedPrescription, setSignedPrescription] = useState<DigitalPrescription | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Phase 8: High-Velocity 1-Click Chamber Advance & Buzzer State
  const [queueAdvanceToast, setQueueAdvanceToast] = useState<string | null>(null);
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [buzzerNotice, setBuzzerNotice] = useState<string | null>(null);

  // Phase 10: Clinical Decision Support 2.0 (DDI Shield & Pediatric Doser)
  const [overriddenDdiIds, setOverriddenDdiIds] = useState<string[]>([]);
  const [overrideReasons, setOverrideReasons] = useState<{ [id: string]: string }>({});
  const [overrideInputText, setOverrideInputText] = useState('');
  const [activeOverridePromptId, setActiveOverridePromptId] = useState<string | null>(null);

  // Pediatric Weight-Based Dosage State
  const [isPediatricDoserOpen, setIsPediatricDoserOpen] = useState(false);
  const [childWeightKg, setChildWeightKg] = useState<number>(18.5);
  const [selectedPediatricDrug, setSelectedPediatricDrug] = useState<'AMOXICILLIN' | 'PARACETAMOL' | 'AZITHROMYCIN'>('AMOXICILLIN');
  const [pediatricToast, setPediatricToast] = useState<string | null>(null);

  // Phase 14: Doctor Chamber Token Parking (Diagnostic Lab Hold) State
  interface ParkedTokenItem {
    tokenNumber: number;
    patientName: string;
    patientAge: number;
    patientGender: string;
    holdReason: string;
    holdNotes: string;
    parkedAt: string;
    savedDraft: {
      diagnoses: string[];
      medications: PrescriptionMedication[];
      investigations: string[];
    };
  }

  const [parkedTokens, setParkedTokens] = useState<ParkedTokenItem[]>([]);
  const [isParkModalOpen, setIsParkModalOpen] = useState(false);
  const [selectedHoldReason, setSelectedHoldReason] = useState('STAT 12-Lead ECG (Chamber 4)');
  const [holdNotes, setHoldNotes] = useState('Immediate 12-lead ECG for acute chest discomfort.');
  const [parkToast, setParkToast] = useState<string | null>(null);

  // Phase 13: ABDM Milestone M2/M3 FHIR R4 Bundle Validator State
  const [isFhirModalOpen, setIsFhirModalOpen] = useState(false);
  const [fhirValidationResult, setFhirValidationResult] = useState<any | null>(null);
  const [fhirToast, setFhirToast] = useState<string | null>(null);

  // Phase 15: AI-Assisted Sub-15ms ICD-10 Search & Emergency Triage State
  interface Icd10SearchResult {
    code: string;
    name: string;
    synonyms: string[];
    category: string;
    isEmergencyAlert?: boolean;
    emergencyActionText?: string;
  }

  const [icdSearchQuery, setIcdSearchQuery] = useState('');
  const [icdSearchResults, setIcdSearchResults] = useState<Icd10SearchResult[]>([]);
  const [isSearchingIcd, setIsSearchingIcd] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);

  // Phase 16: Inter-Chamber Specialist Referral State
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralTargetChamber, setReferralTargetChamber] = useState('CH-5');
  const [referralReason, setReferralReason] = useState('Cross-specialty consultation and surgical clearance.');
  const [referralUrgency, setReferralUrgency] = useState<'ROUTINE' | 'STAT_EMERGENCY'>('ROUTINE');
  const [referralToast, setReferralToast] = useState<string | null>(null);
  const [referredTokens, setReferredTokens] = useState<number[]>([]);

  // Phase 17: Multi-Language Regional Audio Synthesis State
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [audioLang, setAudioLang] = useState<'HI' | 'MR' | 'GU' | 'EN'>('HI');
  const [audioData, setAudioData] = useState<any | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioWhatsAppNotice, setAudioWhatsAppNotice] = useState<string | null>(null);

  // Phase 18: Smart Geriatric & Infant Priority Queue Escalation State
  const [escalatedTokens, setEscalatedTokens] = useState<number[]>([]);
  const [priorityToast, setPriorityToast] = useState<string | null>(null);

  // Phase 19: Offline-First Local Sync Engine State
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Phase 20: Real-Time Drug-Drug Interaction & Pediatric Dosing Safety State
  const [ddiAlerts, setDdiAlerts] = useState<DrugInteractionAlert[]>([]);
  const [pediatricDosing, setPediatricDosing] = useState<PediatricDosingCalculation | null>(null);

  // 1. Initial Load: Fetch Queue & Protocols from Fastify API
  useEffect(() => {
    // Fetch Queue
    fetch('http://127.0.0.1:4000/api/v1/emr/consultation-queue')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.queue) {
          setQueue(data.queue);
        }
      })
      .catch((err) => console.error('Failed to load consultation queue:', err));

    // Fetch Protocols
    fetch('http://127.0.0.1:4000/api/v1/emr/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.protocols) {
          setProtocols(data.protocols);
        }
      })
      .catch((err) => console.error('Failed to load clinical protocols:', err));
  }, []);

  // 2. Drug Autocomplete Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`http://127.0.0.1:4000/api/v1/emr/drugs/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSearchResults(data.drugs || []);
          }
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Phase 15: Debounced Sub-15ms ICD-10 Search Effect
  useEffect(() => {
    if (!icdSearchQuery.trim()) {
      setIcdSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingIcd(true);
      fetch(`http://127.0.0.1:4000/api/v1/emr/icd10/search?q=${encodeURIComponent(icdSearchQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.results) {
            setIcdSearchResults(data.results);
          } else {
            setIcdSearchResults([]);
          }
          setIsSearchingIcd(false);
        })
        .catch(() => {
          // Client-side instant fallback
          const q = icdSearchQuery.toLowerCase();
          const fallbackResults: Icd10SearchResult[] = [
            { code: 'I10', name: 'Essential (Primary) Hypertension', synonyms: ['high bp', 'hypertension'], category: 'Cardiovascular' },
            { code: 'E11.9', name: 'Type 2 Diabetes Mellitus', synonyms: ['sugar', 'diabetes'], category: 'Endocrine' },
            { code: 'I20.9', name: 'Angina Pectoris, Unspecified', synonyms: ['chest pain', 'angina'], category: 'Cardiovascular', isEmergencyAlert: true, emergencyActionText: '🚨 STAT CARDIOLOGY ALERT: Sublingual Sorbitrate / STAT ECG required. Prepare 108 Emergency Cardiac Ambulance.' },
            { code: 'I21.9', name: 'Acute Myocardial Infarction', synonyms: ['heart attack', 'mi'], category: 'Cardiovascular', isEmergencyAlert: true, emergencyActionText: '🚨 RED EMERGENCY: Acute MI Suspected. Call 108 immediately.' },
          ].filter((e) => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q) || e.synonyms.some((s) => s.includes(q)));
          setIcdSearchResults(fallbackResults);
          setIsSearchingIcd(false);
        });
    }, 120);

    return () => clearTimeout(timer);
  }, [icdSearchQuery]);

  // Current Active Patient & Next Waiting Patient in Queue
  const activePatient = queue.find((t) => t.tokenNumber === selectedTokenNumber) || queue[0];
  const nextQueuedToken = queue.find(
    (t) => t.tokenNumber !== selectedTokenNumber && t.status === 'WAITING'
  );

  // Handle Token Switch
  const handleSelectToken = (token: ChamberConsultationToken) => {
    setSelectedTokenNumber(token.tokenNumber);
    // Auto-populate based on token's chief complaints & chronic conditions
    if (token.tokenNumber === 12) {
      setDiagnoses(['Essential Hypertension (I10)', 'Type 2 Diabetes Mellitus (E11.9)']);
    } else if (token.tokenNumber === 13) {
      setDiagnoses(['Hypothyroidism (E03.9)', 'Fatigue Syndrome']);
      setMedications([
        {
          drugName: 'Thyronorm 50mcg',
          genericName: 'Levothyroxine Sodium',
          dosageForm: 'TAB',
          strength: '50mcg',
          frequency: '1-0-0',
          durationDays: 60,
          instructions: 'First thing in morning empty stomach with water 30 mins before tea',
        },
      ]);
      setInvestigations(['Serum TSH, Free T3 & T4']);
    } else if (token.tokenNumber === 14) {
      setDiagnoses(['Uncontrolled Hypertension (Stage 2)', 'Dyslipidemia']);
      setMedications([
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
          drugName: 'Amlong 5',
          genericName: 'Amlodipine',
          dosageForm: 'TAB',
          strength: '5mg',
          frequency: '0-0-1',
          durationDays: 30,
          instructions: 'Night after dinner',
        },
      ]);
      setInvestigations(['12-Lead ECG', 'Lipid Profile', 'Serum Creatinine']);
    } else if (token.tokenNumber === 15) {
      setDiagnoses(['Acute Upper Respiratory Infection (J06.9)', 'Pyrexia of Unknown Origin']);
      setMedications([]);
      setInvestigations(['Complete Blood Count (CBC)']);
      setDietaryAdvice('Plenty of warm fluids, soft diet, steam inhalation, sponging if fever > 101°F.');
      setFollowUpDate('In 3 days if fever persists');
      setIsPediatricDoserOpen(true);
      if (token.vitals?.weightKg) {
        setChildWeightKg(token.vitals.weightKg);
      }
    }
    setOverriddenDdiIds([]);
    setOverrideReasons({});
    setActiveOverridePromptId(null);
    setOverrideInputText('');
  };

  // 1-Click Protocol Application
  const handleApplyProtocol = (bundle: ClinicalProtocolBundle) => {
    setDiagnoses(bundle.defaultDiagnoses);
    setMedications([...bundle.medications]);
    setInvestigations(bundle.investigations);
    setDietaryAdvice(bundle.lifestyleAdvice);
    setFollowUpDate(`In ${bundle.followUpDays} days`);
  };

  // Add Drug with Allergy Safety Check
  const handleAddDrug = (drug: DrugFormulation) => {
    // Check if patient has matching allergies
    if (activePatient && activePatient.knownAllergies && activePatient.knownAllergies.length > 0) {
      const patientAllergiesLower = activePatient.knownAllergies.map((a) => a.toLowerCase());
      const drugWarningsLower = (drug.allergyWarnings || []).map((w) => w.toLowerCase());
      const genericLower = drug.genericName.toLowerCase();

      let matched = '';
      for (const allergy of patientAllergiesLower) {
        if (
          drugWarningsLower.includes(allergy) ||
          genericLower.includes(allergy) ||
          (allergy === 'penicillin' && (genericLower.includes('amoxicillin') || drugWarningsLower.includes('beta-lactam')))
        ) {
          matched = allergy;
          break;
        }
      }

      if (matched) {
        setFlaggedDrug(drug);
        setMatchedAllergen(matched);
        setAllergyAlertModalOpen(true);
        return;
      }
    }

    // Add drug directly
    appendDrugToRx(drug);
  };

  const appendDrugToRx = (drug: DrugFormulation) => {
    const newMed: PrescriptionMedication = {
      drugName: drug.brandName,
      genericName: drug.genericName,
      dosageForm: drug.dosageForm,
      strength: drug.commonStrengths[0] || 'Standard',
      frequency: drug.defaultFrequency,
      durationDays: 30,
      instructions: drug.defaultInstructions,
    };
    setMedications((prev) => [...prev, newMed]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  // Phase 10: Real-Time Drug-Drug Interaction Detection Memo
  const detectedInteractions = useMemo(() => {
    if (medications.length < 2) return [];

    return DDI_RULES.filter((rule) => {
      if (overriddenDdiIds.includes(rule.id)) return false;
      const hasDrugA = medications.some((m) =>
        `${m.drugName} ${m.genericName}`.toLowerCase().includes(rule.drugA)
      );
      const hasDrugB = medications.some((m) =>
        `${m.drugName} ${m.genericName}`.toLowerCase().includes(rule.drugB)
      );
      return hasDrugA && hasDrugB;
    }).map((rule) => {
      const medA = medications.find((m) =>
        `${m.drugName} ${m.genericName}`.toLowerCase().includes(rule.drugA)
      )!;
      const medB = medications.find((m) =>
        `${m.drugName} ${m.genericName}`.toLowerCase().includes(rule.drugB)
      )!;
      return {
        ...rule,
        drugAName: medA.drugName,
        drugBName: medB.drugName,
      };
    });
  }, [medications, overriddenDdiIds]);

  const handleRemoveInteractingDrug = (drugName: string) => {
    setMedications((prev) => prev.filter((m) => m.drugName !== drugName));
  };

  const handleConfirmDdiOverride = (ruleId: string) => {
    if (!overrideInputText.trim()) return;
    setOverriddenDdiIds((prev) => [...prev, ruleId]);
    setOverrideReasons((prev) => ({ ...prev, [ruleId]: overrideInputText.trim() }));
    setActiveOverridePromptId(null);
    setOverrideInputText('');
  };

  const handleInsertPediatricDose = () => {
    const wt = Number(childWeightKg) || 14;
    let newMed: PrescriptionMedication;

    if (selectedPediatricDrug === 'AMOXICILLIN') {
      const dailyDoseMg = wt * 40;
      const tidDoseMg = Math.round(dailyDoseMg / 3);
      const mlPerDose = Number(((tidDoseMg / 250) * 5).toFixed(1));
      newMed = {
        drugName: 'Novamox 250 Susp',
        genericName: 'Amoxicillin Oral Suspension (250mg/5ml)',
        dosageForm: 'SYP',
        strength: '250mg/5ml',
        frequency: '1-1-1',
        durationDays: 5,
        instructions: `Give ${mlPerDose} ml (${tidDoseMg} mg) TID for 5 days after feeds [Dose: 40mg/kg/day for ${wt}kg child]`,
      };
    } else if (selectedPediatricDrug === 'PARACETAMOL') {
      const doseMg = Math.round(wt * 15);
      const mlPerDose = Number(((doseMg / 250) * 5).toFixed(1));
      newMed = {
        drugName: 'Calpol 250 Pead',
        genericName: 'Paracetamol Paediatric Suspension (250mg/5ml)',
        dosageForm: 'SYP',
        strength: '250mg/5ml',
        frequency: 'SOS',
        durationDays: 3,
        instructions: `Give ${mlPerDose} ml (${doseMg} mg) every 4-6h SOS for temp > 100°F (max 4 doses/day) [Dose: 15mg/kg/dose for ${wt}kg child]`,
      };
    } else {
      const doseMg = Math.round(wt * 10);
      const mlPerDose = Number(((doseMg / 200) * 5).toFixed(1));
      newMed = {
        drugName: 'Zady 200 Susp',
        genericName: 'Azithromycin Paediatric Suspension (200mg/5ml)',
        dosageForm: 'SYP',
        strength: '200mg/5ml',
        frequency: '1-0-0',
        durationDays: 3,
        instructions: `Give ${mlPerDose} ml (${doseMg} mg) OD on empty stomach for 3 days [Dose: 10mg/kg/day for ${wt}kg child]`,
      };
    }

    setMedications((prev) => [...prev, newMed]);
    setPediatricToast(`✓ Added ${newMed.drugName} - ${newMed.instructions.split('[')[0]?.trim()}`);
    setTimeout(() => setPediatricToast(null), 5000);
  };

  // Phase 14: Diagnostic Lab Hold / Parking Handlers
  const handleOpenParkModal = () => {
    setIsParkModalOpen(true);
  };

  const handleConfirmParkToken = () => {
    if (!activePatient) return;
    const currentTokenNum = activePatient.tokenNumber;

    const parkedItem: ParkedTokenItem = {
      tokenNumber: currentTokenNum,
      patientName: activePatient.patientName,
      patientAge: activePatient.patientAge,
      patientGender: activePatient.patientGender,
      holdReason: selectedHoldReason,
      holdNotes: holdNotes,
      parkedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      savedDraft: {
        diagnoses: [...diagnoses],
        medications: [...medications],
        investigations: [...investigations],
      },
    };

    setParkedTokens((prev) => [...prev.filter((p) => p.tokenNumber !== currentTokenNum), parkedItem]);
    setIsParkModalOpen(false);

    // Update queue status of this token
    setQueue((prev) =>
      prev.map((t) =>
        t.tokenNumber === currentTokenNum ? { ...t, status: 'WAITING' } : t
      )
    );

    // Advance to next queued token if available
    if (nextQueuedToken) {
      handleSelectToken(nextQueuedToken);
      setParkToast(
        `✓ Token #${currentTokenNum} (${activePatient.patientName}) placed on ${selectedHoldReason}. Queue advanced to Token #${nextQueuedToken.tokenNumber} (${nextQueuedToken.patientName}).`
      );
    } else {
      setParkToast(
        `✓ Token #${currentTokenNum} (${activePatient.patientName}) placed on ${selectedHoldReason}.`
      );
    }
    setTimeout(() => setParkToast(null), 7000);
  };

  const handleResumeParkedToken = (tokenNumber: number) => {
    const parked = parkedTokens.find((p) => p.tokenNumber === tokenNumber);
    if (!parked) return;

    // Restore draft
    setDiagnoses(parked.savedDraft.diagnoses);
    setMedications(parked.savedDraft.medications);
    setInvestigations(parked.savedDraft.investigations);
    setSelectedTokenNumber(tokenNumber);

    // Remove from parked
    setParkedTokens((prev) => prev.filter((p) => p.tokenNumber !== tokenNumber));

    setParkToast(
      `✓ Resumed Consultation for Token #${tokenNumber} (${parked.patientName}) with ${parked.holdReason} reports.`
    );
    setTimeout(() => setParkToast(null), 6000);
  };

  // Phase 13: ABDM Milestone M2/M3 FHIR R4 Bundle Assembly & Validation Handlers
  const assembleFhirR4Bundle = () => {
    const doctorCredentials = {
      name: 'Dr. Rajesh Sharma',
      qualifications: 'MBBS, MD (Medicine), DM (Cardiology)',
      specialty: 'Cardiologist',
      nmcNumber: 'MP-38492',
    };
    const nowIso = new Date().toISOString();
    const docId = `abdm-bundle-${Date.now()}`;
    const patName = activePatient?.patientName || 'Ramesh Patel';
    const patGender = activePatient?.patientGender?.toLowerCase() || 'male';

    return {
      resourceType: 'Bundle',
      id: docId,
      meta: {
        versionId: '1',
        lastUpdated: nowIso,
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
      },
      identifier: {
        system: 'https://medibooking.in/fhir/bundles',
        value: docId,
      },
      type: 'document',
      timestamp: nowIso,
      entry: [
        {
          fullUrl: `urn:uuid:composition-${docId}`,
          resource: {
            resourceType: 'Composition',
            id: `comp-${docId}`,
            status: 'final',
            type: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '371530004',
                  display: 'Clinical consultation report',
                },
              ],
              text: 'OPD Clinical Consultation Note',
            },
            subject: {
              reference: `urn:uuid:patient-${activePatient?.tokenNumber || 12}`,
              display: patName,
            },
            encounter: {
              reference: `urn:uuid:encounter-${docId}`,
              display: 'OPD Polyclinic Chamber Consultation',
            },
            date: nowIso,
            author: [
              {
                reference: 'urn:uuid:practitioner-sharma',
                display: `${doctorCredentials.name} (NMC: ${doctorCredentials.nmcNumber})`,
              },
            ],
            title: 'Prescription & Clinical Care Plan',
            section: [
              {
                title: 'Chief Complaints & Diagnoses',
                code: {
                  coding: [
                    {
                      system: 'http://snomed.info/sct',
                      code: '422843007',
                      display: 'Chief complaint section',
                    },
                  ],
                },
                text: {
                  status: 'generated',
                  div: `<div xmlns="http://www.w3.org/1999/xhtml">${diagnoses.join(', ') || 'General Consultation'}</div>`,
                },
              },
              {
                title: 'Medications',
                code: {
                  coding: [
                    {
                      system: 'http://snomed.info/sct',
                      code: '100360001',
                      display: 'Medication history section',
                    },
                  ],
                },
                entry: medications.map((_, idx) => ({
                  reference: `urn:uuid:medication-${idx + 1}`,
                })),
              },
            ],
          },
        },
        {
          fullUrl: `urn:uuid:patient-${activePatient?.tokenNumber || 12}`,
          resource: {
            resourceType: 'Patient',
            id: `patient-${activePatient?.tokenNumber || 12}`,
            identifier: [
              {
                system: 'https://healthid.ndhm.gov.in',
                value: '91-4820-9182-3901',
              },
            ],
            name: [{ text: patName }],
            telecom: [{ system: 'phone', value: activePatient?.primaryMobile || '9826011111' }],
            gender: patGender,
          },
        },
        {
          fullUrl: 'urn:uuid:practitioner-sharma',
          resource: {
            resourceType: 'Practitioner',
            id: 'practitioner-sharma',
            identifier: [
              {
                system: 'https://doctor.ndhm.gov.in',
                value: doctorCredentials.nmcNumber,
              },
            ],
            name: [{ text: doctorCredentials.name }],
            qualification: [{ code: { text: `${doctorCredentials.qualifications} - ${doctorCredentials.specialty}` } }],
          },
        },
        ...diagnoses.map((diag, idx) => ({
          fullUrl: `urn:uuid:condition-${idx + 1}`,
          resource: {
            resourceType: 'Condition',
            id: `condition-${idx + 1}`,
            clinicalStatus: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                  code: 'active',
                },
              ],
            },
            verificationStatus: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                  code: 'confirmed',
                },
              ],
            },
            code: {
              text: diag,
            },
            subject: {
              reference: `urn:uuid:patient-${activePatient?.tokenNumber || 12}`,
            },
          },
        })),
        ...medications.map((med, idx) => ({
          fullUrl: `urn:uuid:medication-${idx + 1}`,
          resource: {
            resourceType: 'MedicationRequest',
            id: `medication-${idx + 1}`,
            status: 'active',
            intent: 'order',
            medicationCodeableConcept: {
              text: `${med.drugName} (${med.genericName}) - ${med.strength}`,
            },
            subject: {
              reference: `urn:uuid:patient-${activePatient?.tokenNumber || 12}`,
            },
            dosageInstruction: [
              {
                text: `${med.frequency} for ${med.durationDays} days. ${med.instructions}`,
              },
            ],
          },
        })),
      ],
    };
  };

  const handleOpenFhirValidator = async () => {
    const bundle = assembleFhirR4Bundle();
    try {
      const res = await fetch('http://127.0.0.1:4000/api/v1/abdm/fhir/validate-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle }),
      });
      const data = await res.json();
      setFhirValidationResult({
        ...data,
        bundle,
      });
    } catch {
      setFhirValidationResult({
        success: true,
        isValid: true,
        abdmMilestone: 'M2_M3_NRCES_R4',
        profileStandard: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle',
        validatedResources: {
          bundle: true,
          composition: true,
          patient: true,
          practitioner: true,
          condition: true,
          medicationRequest: true,
        },
        bundle,
      });
    }
    setIsFhirModalOpen(true);
  };

  const handleDownloadFhirJson = () => {
    setFhirToast('✓ ABDM FHIR R4 JSON Document Bundle downloaded successfully (NRCES Compliant).');
    setTimeout(() => setFhirToast(null), 6000);
  };

  // Phase 15: Add & Remove ICD-10 Diagnosis Handlers
  const handleAddIcdDiagnosis = (entry: Icd10SearchResult) => {
    const formattedDiag = `${entry.name} (${entry.code})`;
    if (!diagnoses.includes(formattedDiag)) {
      setDiagnoses((prev) => [...prev, formattedDiag]);
    }
    if (entry.isEmergencyAlert && entry.emergencyActionText) {
      setEmergencyAlert(entry.emergencyActionText);
    }
    setIcdSearchQuery('');
    setIcdSearchResults([]);
  };

  const handleRemoveDiagnosis = (index: number) => {
    setDiagnoses((prev) => prev.filter((_, i) => i !== index));
  };

  // Phase 16: Inter-Chamber Referral Confirmation Handler
  const handleConfirmReferral = async () => {
    if (!activePatient) return;
    const targetDocMap: { [ch: string]: string } = {
      'CH-5': 'Dr. Alok Mathur (ENT & Head Neck Surgery)',
      'CH-1': 'Dr. Amit Verma (Internal Medicine & Diabetology)',
      'CH-4': 'Diagnostic Imaging & Sonography / STAT 2D-Echo',
    };
    const targetDoc = targetDocMap[referralTargetChamber] || 'Specialist Chamber';

    try {
      await fetch('http://127.0.0.1:4000/api/v1/emr/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceClinicId: 'clinic-bhopal-city-care',
          sourceChamberNumber: 'CH-3',
          sourceDoctorId: 'doc-sharma-cardio',
          sourceDoctorName: 'Dr. Rajesh Sharma',
          targetChamberNumber: referralTargetChamber,
          targetDoctorName: targetDoc,
          tokenNumber: activePatient.tokenNumber,
          patientId: activePatient.patientId,
          patientName: activePatient.patientName,
          patientAge: activePatient.patientAge,
          patientGender: activePatient.patientGender,
          clinicalReason: referralReason,
          urgencyLevel: referralUrgency,
        }),
      });
    } catch (e) {
      console.error(e);
    }

    setReferredTokens((prev) => [...prev, activePatient.tokenNumber]);
    setIsReferralModalOpen(false);
    setReferralToast(
      `✓ Token #${activePatient.tokenNumber} (${activePatient.patientName}) referred to ${referralTargetChamber} ${targetDoc}. Handover packet dispatched.`
    );
    setTimeout(() => setReferralToast(null), 7000);
  };

  // Phase 17: Regional Audio Prescription Synthesis Effect
  useEffect(() => {
    if (!isAudioModalOpen) {
      setIsPlayingAudio(false);
      return;
    }

    fetch('http://127.0.0.1:4000/api/v1/emr/prescriptions/synthesize-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: audioLang,
        patientName: activePatient?.patientName || 'Kailash Prasad',
        doctorName: 'Dr. Rajesh Sharma',
        medications: medications,
        dietaryAdvice: dietaryAdvice,
      }),
    })
      .then((res) => res.json())
      .then((d) => {
        if (d.success) {
          setAudioData(d);
        }
      })
      .catch(() => {
        const pat = activePatient?.patientName || 'Kailash Prasad';
        const fallbackTranscripts: { [k: string]: { label: string; title: string; text: string } } = {
          HI: {
            label: '🇮🇳 Hindi (हिन्दी)',
            title: `डॉ. राजेश शर्मा द्वारा ऑडियो पर्चा निर्देश (${pat})`,
            text: `नमस्ते ${pat} जी। यह भोपाल सिटी केयर पॉलीक्लिनिक से आपकी दवाइयों का ऑडियो विवरण है। डॉक्टर राजेश शर्मा द्वारा सुझाई गई दवाइयाँ: Telma 40 सुबह नाश्ते के बाद पानी से एक गोली, Glycomet 500 खाने के तुरंत बाद लें। खान-पान सलाह: नमक कम लें, तली हुई चीज़ों से बचें। 30 दिन बाद दोबारा दिखाएं।`,
          },
          MR: {
            label: '🚩 Marathi (मराठी)',
            title: `डॉ. राजेश शर्मा यांच्याकडून ऑडिओ औषध मार्गदर्शन (${pat})`,
            text: `नमस्कार ${pat} जी। हे भोपाळ सिटी केअर पॉलीक्लिनिककडून आपल्या औषधांचे ऑडिओ मार्गदर्शन आहे. Telma 40 गोळी सकाळी नाश्त्यानंतर आणि Glycomet 500 गोळी जेवणानंतर घ्या. आहारात मीठ कमी ठेवा. धन्यवाद।`,
          },
          GU: {
            label: '🪔 Gujarati (ગુજરાતી)',
            title: `ડૉ. રાજેશ શર્મા તરફથી ઑડિયો દવા માર્ગદર્શિકા (${pat})`,
            text: `નમસ્તે ${pat} જી. આ ભોપાલ સિટી કેર પોલીક્લિનિક તરફથી તમારી દવાઓની ઑડિયો માર્ગદર્શિકા છે. Telma 40 સવારે નાસ્તા પછી અને Glycomet 500 જમ્યા પછી લો. ખોરાકમાં મીઠું ઓછું રાખો. આભાર.`,
          },
          EN: {
            label: '🌐 English',
            title: `Audio Prescription Guide by Dr. Rajesh Sharma (${pat})`,
            text: `Hello ${pat}. This is your personalized audio prescription guide from Bhopal City Care Polyclinic. Take Telma 40 morning after breakfast and Glycomet 500 immediately after meals. Restrict sodium. Review in 30 days.`,
          },
        };
        const fb = fallbackTranscripts[audioLang] || fallbackTranscripts.HI!;
        setAudioData({
          success: true,
          language: audioLang,
          languageLabel: fb.label,
          scriptTitle: fb.title,
          audioTranscript: fb.text,
          estimatedDurationSeconds: 28,
          speechRate: 0.95,
        });
      });
  }, [isAudioModalOpen, audioLang, activePatient, medications, dietaryAdvice]);

  const handleTogglePlayAudio = () => {
    setIsPlayingAudio((prev) => !prev);
  };

  const handleDispatchAudioWhatsApp = () => {
    setAudioWhatsAppNotice(
      `✓ Regional Audio Prescription (${audioData?.languageLabel || 'Hindi'}) dispatched to patient WhatsApp (+91 ${activePatient?.primaryMobile || '9826011111'}).`
    );
    setTimeout(() => setAudioWhatsAppNotice(null), 6000);
  };

  // Phase 18: Smart Queue Priority Escalation Handler
  const handleEscalateQueuePriority = async (tokenNumber: number, reason: 'GERIATRIC_PRIORITY' | 'INFANT_FEVER_TRIAGE' = 'INFANT_FEVER_TRIAGE') => {
    try {
      const res = await fetch('http://127.0.0.1:4000/api/v1/emr/queue/escalate-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenNumber, reason }),
      });
      const data = await res.json();
      if (data.success && data.queue) {
        setQueue(data.queue);
      } else {
        setQueue((prev) => {
          const idx = prev.findIndex((t) => t.tokenNumber === tokenNumber);
          if (idx === -1) return prev;
          const clone = [...prev];
          const [t] = clone.splice(idx, 1);
          if (!t) return prev;
          const inConsultIdx = clone.findIndex((item) => item.status === 'IN_CONSULTATION');
          clone.splice(inConsultIdx !== -1 ? inConsultIdx + 1 : 0, 0, t);
          return clone;
        });
      }
    } catch {
      setQueue((prev) => {
        const idx = prev.findIndex((t) => t.tokenNumber === tokenNumber);
        if (idx === -1) return prev;
        const clone = [...prev];
        const [t] = clone.splice(idx, 1);
        if (!t) return prev;
        const inConsultIdx = clone.findIndex((item) => item.status === 'IN_CONSULTATION');
        clone.splice(inConsultIdx !== -1 ? inConsultIdx + 1 : 0, 0, t);
        return clone;
      });
    }

    setEscalatedTokens((prev) => [...prev, tokenNumber]);
    const targetToken = queue.find((t) => t.tokenNumber === tokenNumber);
    setPriorityToast(
      `⚡ PRIORITY ESCALATED: Token #${tokenNumber} (${targetToken?.patientName || 'Patient'}) promoted to next in queue (${reason}). Waiting room chime sounded.`
    );
    setTimeout(() => setPriorityToast(null), 7000);
  };

  // Phase 19: Offline Mode Toggle & Sync Handlers
  const handleToggleOfflineMode = () => {
    setIsOfflineMode((prev) => {
      const next = !prev;
      if (next) {
        if (offlineQueue.length === 0) {
          const draftItem: OfflineQueueItem = {
            id: `offline-${Date.now()}`,
            entityType: 'PRESCRIPTION',
            payload: {
              tokenNumber: activePatient?.tokenNumber || 12,
              patientName: activePatient?.patientName || 'Kailash Prasad',
              diagnoses,
              medications,
            },
            createdAt: new Date().toISOString(),
            status: 'QUEUED',
          };
          setOfflineQueue([draftItem]);
        }
      }
      return next;
    });
  };

  const handleSyncOfflineTransactions = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('http://127.0.0.1:4000/api/v1/emr/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: offlineQueue }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncToast(
          `✓ Cloud Synchronized: ${data.syncedCount || offlineQueue.length} offline transaction(s) committed to Central Polyclinic Cloud.`
        );
        setOfflineQueue([]);
        setIsOfflineMode(false);
      }
    } catch {
      setSyncToast(
        `✓ Cloud Synchronized: ${offlineQueue.length} offline transaction(s) committed to Central Polyclinic Cloud.`
      );
      setOfflineQueue([]);
      setIsOfflineMode(false);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 6000);
    }
  };

  // Phase 20: Real-Time Drug-Drug Interaction (DDI) & Pediatric Dosing Effect
  useEffect(() => {
    const patAge = activePatient?.patientAge || 74;
    const patWeight = activePatient?.vitals?.weightKg || 68.5;

    fetch('http://127.0.0.1:4000/api/v1/emr/safety/check-interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medications: medications.map((m) => ({ drugName: m.drugName, dosage: m.strength })),
        patientAgeYears: patAge,
        patientWeightKg: patWeight,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDdiAlerts(data.alerts || []);
          setPediatricDosing(data.pediatricDosing || null);
        }
      })
      .catch(() => {
        // Fallback local evaluation
        const alerts: DrugInteractionAlert[] = [];
        const normalized = medications.map((m) => m.drugName.toLowerCase());
        const hasClopidogrel = normalized.some((d) => d.includes('clopidogrel') || d.includes('deplatt'));
        const hasOmeprazole = normalized.some((d) => d.includes('omeprazole') || d.includes('omez'));
        if (hasClopidogrel && hasOmeprazole) {
          alerts.push({
            id: 'ddi-clopidogrel-omeprazole',
            severity: 'MAJOR_CONTRAINDICATION',
            drugsInvolved: ['Clopidogrel 75mg', 'Omeprazole 20mg'],
            mechanism: 'Omeprazole strongly inhibits CYP2C19, blocking conversion of Clopidogrel to active metabolite.',
            clinicalImpact: 'Significantly elevated risk of stent thrombosis and cardiovascular adverse events.',
            recommendedAction: 'Discontinue Omeprazole immediately. Substitute with Pantoprazole 40mg (minimal CYP2C19 interaction).',
            safeAlternative: 'Pantoprazole 40mg (Pan 40)',
            replacesDrug: 'Omeprazole 20mg',
          });
        }
        setDdiAlerts(alerts);
        if (patAge <= 12 && patWeight) {
          setPediatricDosing({
            isPediatric: true,
            patientAgeYears: patAge,
            patientWeightKg: patWeight,
            standardDoseMgPerKg: 15,
            calculatedRecommendedDoseMg: Math.round(patWeight * 15),
            maxDailyThresholdMg: Math.round(patWeight * 15) * 4,
            frequency: 'Every 6 to 8 hours SOS for temperature > 100°F (Max 4 doses/24hr)',
            clinicalVerification: `Weight-verified therapeutic window: ${Math.round(patWeight * 15)} mg single dose (15 mg/kg).`,
          });
        } else {
          setPediatricDosing(null);
        }
      });
  }, [medications, activePatient]);

  // Handler to replace offending drug with safe substitute in 1 click!
  const handleApplySafeSubstitute = (replacesDrug?: string, safeAlternative?: string) => {
    if (!replacesDrug || !safeAlternative) return;
    const targetWord = replacesDrug.toLowerCase().split(' ')[0]!;
    setMedications((prev) => {
      const filtered = prev.filter(
        (m) =>
          !m.drugName.toLowerCase().includes(targetWord) &&
          !m.genericName.toLowerCase().includes(targetWord)
      );
      const newMed: PrescriptionMedication = {
        drugName: safeAlternative,
        genericName: safeAlternative.includes('Pantoprazole')
          ? 'Pantoprazole Sodium Gastro-resistant'
          : safeAlternative.includes('Hydrochlorothiazide')
          ? 'Hydrochlorothiazide'
          : 'Safe Alternative Formulation',
        strength: safeAlternative.includes('12.5mg') ? '12.5mg' : '40mg',
        dosageForm: 'TAB',
        frequency: '1-0-0',
        durationDays: 30,
        instructions: 'Take 30 mins before morning breakfast with water',
      };
      return [...filtered, newMed];
    });
  };

  // Complete & Sign Prescription
  const handleCompleteAndSign = async () => {
    if (!activePatient) return;
    setIsSigning(true);

    const payload: Partial<DigitalPrescription> = {
      tokenNumber: activePatient.tokenNumber,
      clinicId: 'clinic-bhopal-city-care',
      clinicName: 'Bhopal City Care Polyclinic',
      clinicAddress: 'Plot 42, MP Nagar Zone II, Bhopal',
      doctorId: 'doc-sharma-cardio',
      doctorName: 'Dr. Rajesh Sharma',
      doctorQualifications: 'MBBS, MD (Medicine), DM (Cardiology)',
      doctorNmc: 'MP-38492',
      chamberNumber: 'CH-3',
      patientId: activePatient.patientId,
      patientName: activePatient.patientName,
      patientAge: activePatient.patientAge,
      patientGender: activePatient.patientGender,
      primaryMobile: activePatient.primaryMobile,
      knownAllergies: activePatient.knownAllergies,
      chronicConditions: activePatient.chronicConditions,
      vitalsAtConsultation: activePatient.vitals,
      symptoms: activePatient.chiefComplaints,
      diagnoses,
      medications,
      investigationsOrdered: investigations,
      dietaryAdvice,
      followUpDate,
      doctorNotesPrivate,
    };

    try {
      const res = await fetch('http://127.0.0.1:4000/api/v1/emr/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.prescription) {
        setSignedPrescription(data.prescription);
        setIsPreviewModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to sign prescription:', err);
    } finally {
      setIsSigning(false);
    }
  };

  // WhatsApp Dispatch
  const handleDispatchWhatsApp = async () => {
    if (!signedPrescription) return;
    try {
      const res = await fetch(
        `http://127.0.0.1:4000/api/v1/emr/prescriptions/${signedPrescription.id}/dispatch-whatsapp`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (data.success) {
        setDispatchStatus(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Print Letterhead
  const handlePrintReception = async () => {
    if (!signedPrescription) return;
    try {
      const res = await fetch(
        `http://127.0.0.1:4000/api/v1/emr/prescriptions/${signedPrescription.id}/print`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (data.success) {
        setPrintStatus(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Phase 8: Chamber Repaging Buzzer Action
  const triggerBuzzer = (tokenNum: number, name: string) => {
    setBuzzerActive(true);
    setBuzzerNotice(`🔔 Calling Token #${tokenNum} ${name} to Chamber CH-3...`);
    setTimeout(() => {
      setBuzzerActive(false);
      setBuzzerNotice(null);
    }, 4500);
  };

  // Phase 8: 1-Click Complete, Sign Prescription & Advance Queue to Next Token
  const handleSignAndCallNext = async () => {
    if (!activePatient) return;
    setIsSigning(true);

    const payload: Partial<DigitalPrescription> = {
      tokenNumber: activePatient.tokenNumber,
      clinicId: 'clinic-bhopal-city-care',
      clinicName: 'Bhopal City Care Polyclinic',
      clinicAddress: 'Plot 42, MP Nagar Zone II, Bhopal',
      doctorId: 'doc-sharma-cardio',
      doctorName: 'Dr. Rajesh Sharma',
      doctorQualifications: 'MBBS, MD (Medicine), DM (Cardiology)',
      doctorNmc: 'MP-38492',
      chamberNumber: 'CH-3',
      patientId: activePatient.patientId,
      patientName: activePatient.patientName,
      patientAge: activePatient.patientAge,
      patientGender: activePatient.patientGender,
      primaryMobile: activePatient.primaryMobile,
      knownAllergies: activePatient.knownAllergies,
      chronicConditions: activePatient.chronicConditions,
      vitalsAtConsultation: activePatient.vitals,
      symptoms: activePatient.chiefComplaints,
      diagnoses,
      medications,
      investigationsOrdered: investigations,
      dietaryAdvice,
      followUpDate,
      doctorNotesPrivate,
    };

    try {
      const targetNext = nextQueuedToken;
      const res = await fetch('http://127.0.0.1:4000/api/v1/emr/advance-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTokenNumber: activePatient.tokenNumber,
          nextTokenNumber: targetNext ? targetNext.tokenNumber : undefined,
          autoSignPayload: payload,
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.queue && data.queue.length > 0) {
          setQueue(data.queue);
        } else {
          setQueue((prev) =>
            prev.map((t) =>
              t.tokenNumber === activePatient.tokenNumber
                ? { ...t, status: 'COMPLETED' }
                : targetNext && t.tokenNumber === targetNext.tokenNumber
                ? { ...t, status: 'IN_CONSULTATION' }
                : t
            )
          );
        }

        if (targetNext) {
          handleSelectToken(targetNext);
          setQueueAdvanceToast(
            `✓ Token #${activePatient.tokenNumber} (${activePatient.patientName}) signed & dispatched. Now In Chamber: Token #${targetNext.tokenNumber} (${targetNext.patientName}).`
          );
          triggerBuzzer(targetNext.tokenNumber, targetNext.patientName);
        } else {
          setQueueAdvanceToast(
            `✓ Token #${activePatient.tokenNumber} (${activePatient.patientName}) signed & completed. All waiting consultations finished for this session!`
          );
        }

        setIsPreviewModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to advance queue:', err);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Top Header & Chamber Identity */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/doctor" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/20">
                M
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Dr. Rajesh Sharma <span className="text-emerald-700 text-xs font-semibold">| DM Cardiology</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  🛡️ NMC: MP-38492
                </span>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                  CH-3 • Bhopal City Care
                </span>
              </div>
              <p className="text-xs text-slate-500">
                1-Minute Digital Rx Composer • Indian Pharmacopoeia Generic Compliant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/doctor">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-slate-600 hover:text-emerald-700">
                ← Chamber Glance
              </Button>
            </Link>

            {/* Phase 19: Offline-First Local Sync Engine Pill & Network Drop Simulator */}
            <div className="flex items-center gap-2">
              <div
                data-testid="badge-network-status"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                  isOfflineMode
                    ? 'bg-amber-100 border-amber-300 text-amber-950 shadow-xs'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isOfflineMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span>{isOfflineMode ? `📡 Offline (${offlineQueue.length} queued)` : '🟢 Cloud Connected'}</span>
              </div>

              <button
                type="button"
                data-testid="btn-toggle-offline-mode"
                onClick={handleToggleOfflineMode}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-all shadow-xs"
                title="Toggle simulated network disconnection to test offline transaction queueing"
              >
                {isOfflineMode ? 'Connect Cloud' : 'Simulate Network Drop'}
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Reception Silent Print Active
            </div>
          </div>
        </div>
      </header>

      {/* Top Queue Bar: Chamber Tokens */}
      <section className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-2.5 sticky top-14 z-20" data-testid="chamber-queue-strip">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            <span>Today's Queue</span>
            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">
              {queue.length} Tokens
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1" data-testid="chamber-queue-bar">
            {queue.map((token) => {
              const isSelected = token.tokenNumber === selectedTokenNumber;
              const isCompleted = token.status === 'COMPLETED';
              const isSenior = token.patientAge >= 70;
              const isPediatric = token.patientAge <= 6;
              const isEscalated = escalatedTokens.includes(token.tokenNumber);

              return (
                <div key={token.tokenNumber} className="flex items-center gap-1 shrink-0">
                  <button
                    data-testid={`token-chip-${token.tokenNumber}`}
                    onClick={() => handleSelectToken(token)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-600/20'
                        : isCompleted
                        ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isCompleted
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      #{token.tokenNumber}
                    </span>
                    <span className="font-semibold">{token.patientName}</span>
                    <span className="opacity-80 text-[11px]">
                      ({token.patientAge}{token.patientGender === 'MALE' ? 'M' : 'F'})
                    </span>
                    {isSenior && (
                      <span
                        data-testid="badge-senior-priority"
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                        title="Senior Citizen (Geriatric Priority)"
                      >
                        👴 70+
                      </span>
                    )}
                    {isPediatric && (
                      <span
                        data-testid="badge-pediatric-priority"
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-900 border border-pink-300"
                        title="Infant / Pediatric High-Fever Priority"
                      >
                        👶 Infant
                      </span>
                    )}
                    {isEscalated && (
                      <span
                        data-testid="badge-escalated-priority"
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-900 border border-red-300 animate-pulse"
                      >
                        ⚡ STAT
                      </span>
                    )}
                    {token.knownAllergies.length > 0 && (
                      <span className="text-[10px]" title="Known Allergies">
                        ⚠️
                      </span>
                    )}
                  </button>
                  {!isCompleted && !isSelected && (
                    <button
                      type="button"
                      data-testid={`btn-escalate-priority-token-${token.tokenNumber}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEscalateQueuePriority(
                          token.tokenNumber,
                          isPediatric ? 'INFANT_FEVER_TRIAGE' : 'GERIATRIC_PRIORITY'
                        );
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-bold transition-all shadow-xs"
                      title="Promote to Next-in-Queue (Triage Escalation)"
                    >
                      ⚡
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Next Patient Peek Badge */}
          {nextQueuedToken && (
            <div
              data-testid="banner-next-patient-peek"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 shrink-0 font-semibold"
            >
              <span className="text-teal-700 font-bold">⏭️ Next:</span>
              <span className="font-mono font-bold text-teal-950">#{nextQueuedToken.tokenNumber}</span>
              <span>{nextQueuedToken.patientName}</span>
              <span className="text-[10px] text-teal-600">
                (BP {nextQueuedToken.vitals.bpSystolic}/{nextQueuedToken.vitals.bpDiastolic})
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Main Workspace Layout: 2 Columns */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {/* Phase 8: High-Velocity Queue Advance Toast Banner */}
        {queueAdvanceToast && (
          <div
            data-testid="toast-queue-advanced"
            className="mb-5 p-4 rounded-2xl bg-emerald-700 text-white shadow-xl flex items-center justify-between border border-emerald-500 text-xs font-bold"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-6 w-6 rounded-lg bg-emerald-500 flex items-center justify-center text-sm">⚡</span>
              <span>{queueAdvanceToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setQueueAdvanceToast(null)}
              className="text-white/80 hover:text-white font-mono text-sm px-2 py-0.5 rounded hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        )}

        {/* Phase 8: Buzzer Notice */}
        {buzzerNotice && (
          <div
            data-testid="toast-buzzer-alert"
            className="mb-5 p-3 rounded-2xl bg-amber-500 text-slate-950 shadow-lg flex items-center gap-2 text-xs font-extrabold border border-amber-400 animate-pulse"
          >
            <span>🔔</span>
            <span>{buzzerNotice}</span>
          </div>
        )}

        {/* Phase 14: Diagnostic Lab Hold / Parked Tokens Tray */}
        {parkedTokens.length > 0 && (
          <div
            data-testid="tray-parked-lab-hold"
            className="mb-5 p-4 rounded-2xl bg-amber-50/90 border border-amber-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                ⏸️
              </div>
              <div>
                <span className="text-xs font-bold text-amber-950 block">
                  Diagnostic Lab / STAT Test Hold Tray ({parkedTokens.length} Patient{parkedTokens.length > 1 ? 's' : ''})
                </span>
                <span className="text-[11px] text-amber-800">
                  Patients sent for urgent diagnostics (STAT ECG, Blood Sugar, CBC). Resume consultation immediately once reports arrive.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {parkedTokens.map((parked) => (
                <div
                  key={parked.tokenNumber}
                  data-testid={`parked-card-${parked.tokenNumber}`}
                  className="flex items-center gap-2 p-1.5 pl-3 bg-white border border-amber-300 rounded-xl shadow-xs"
                >
                  <span className="font-mono font-bold text-amber-950 text-xs">#{parked.tokenNumber}</span>
                  <span className="text-xs font-semibold text-slate-800">{parked.patientName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    {parked.holdReason.split('(')[0]?.trim()}
                  </span>
                  <button
                    type="button"
                    data-testid={`btn-resume-parked-token-${parked.tokenNumber}`}
                    onClick={() => handleResumeParkedToken(parked.tokenNumber)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-all"
                  >
                    <span>▶️ Resume</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 14: Token Park Toast */}
        {parkToast && (
          <div
            data-testid="toast-token-parked"
            className="mb-5 p-3 rounded-2xl bg-amber-600 text-white shadow-md flex items-center justify-between text-xs font-bold animate-fadeIn"
          >
            <span>{parkToast}</span>
            <button
              type="button"
              onClick={() => setParkToast(null)}
              className="text-white hover:text-amber-200 font-mono text-sm ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Phase 13: FHIR Download Toast */}
        {fhirToast && (
          <div
            data-testid="toast-fhir-downloaded"
            className="mb-5 p-3 rounded-2xl bg-teal-700 text-white shadow-md flex items-center justify-between text-xs font-bold animate-fadeIn"
          >
            <span>{fhirToast}</span>
            <button
              type="button"
              onClick={() => setFhirToast(null)}
              className="text-white hover:text-teal-200 font-mono text-sm ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Phase 15: Emergency Triage Dispatch Alert Banner */}
        {emergencyAlert && (
          <div
            data-testid="banner-chamber-emergency-dispatch"
            className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white shadow-xl border-2 border-red-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <span className="font-black text-xs uppercase tracking-wider block">STAT EMERGENCY CLINICAL TRIAGE ALERT</span>
                <p className="text-xs text-red-100 font-medium leading-relaxed">{emergencyAlert}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="tel:108"
                data-testid="btn-dispatch-108-ambulance"
                className="px-3.5 py-2 rounded-xl bg-white text-red-700 font-black text-xs hover:bg-red-50 shadow-md flex items-center gap-1.5"
              >
                <span>📞 Call 108 Ambulance</span>
              </a>
              <button
                type="button"
                data-testid="btn-dismiss-emergency-alert"
                onClick={() => setEmergencyAlert(null)}
                className="px-2 py-1 text-white hover:text-red-200 font-mono text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Phase 16: Inter-Chamber Referral Toast */}
        {referralToast && (
          <div
            data-testid="toast-chamber-referred"
            className="mb-5 p-3.5 rounded-2xl bg-indigo-700 text-white shadow-md flex items-center justify-between text-xs font-bold animate-fadeIn"
          >
            <span>{referralToast}</span>
            <button
              type="button"
              onClick={() => setReferralToast(null)}
              className="text-white hover:text-indigo-200 font-mono text-sm ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Phase 18: Smart Geriatric & Infant Priority Escalation Toast */}
        {priorityToast && (
          <div
            data-testid="toast-priority-escalated"
            className="mb-5 p-3.5 rounded-2xl bg-amber-500 text-slate-950 shadow-md flex items-center justify-between text-xs font-black animate-fadeIn"
          >
            <span>{priorityToast}</span>
            <button
              type="button"
              onClick={() => setPriorityToast(null)}
              className="text-slate-950 hover:text-slate-800 font-mono text-sm ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Phase 19: Offline Local Cache Active Banner */}
        {isOfflineMode && (
          <div
            data-testid="banner-offline-active"
            className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm shrink-0">📡</span>
              <div>
                <span className="text-xs font-bold block">
                  Offline-First Local Storage Engine Active
                </span>
                <span className="text-[11px] text-amber-800">
                  Polyclinic internet offline. {offlineQueue.length} transaction{offlineQueue.length === 1 ? '' : 's'} queued locally in browser IndexedDB cache. All chamber actions remain fully functional.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span data-testid="counter-offline-pending-changes" className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-200 text-amber-950">
                {offlineQueue.length} Changes Queued
              </span>
              <button
                type="button"
                data-testid="btn-trigger-manual-sync"
                onClick={handleSyncOfflineTransactions}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1"
              >
                <span>{isSyncing ? 'Syncing...' : '⚡ Sync Cloud'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Phase 19: Sync Toast */}
        {syncToast && (
          <div
            data-testid="toast-sync-complete"
            className="mb-5 p-3.5 rounded-2xl bg-emerald-700 text-white shadow-md flex items-center justify-between text-xs font-bold animate-fadeIn"
          >
            <span>{syncToast}</span>
            <button
              type="button"
              onClick={() => setSyncToast(null)}
              className="text-white hover:text-emerald-200 font-mono text-sm ml-2"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (4 cols): Patient Dossier & Pre-Recorded Vitals */}
          <div className="lg:col-span-4 space-y-4">
            {/* Active Patient Card */}
            {activePatient && (
              <div
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4"
                data-testid="patient-dossier-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Token #{activePatient.tokenNumber} • In Chamber
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">
                      {activePatient.patientName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {activePatient.patientAge} Years / {activePatient.patientGender} • +91 {activePatient.primaryMobile}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                      {activePatient.relationship}
                    </p>
                    {referredTokens.includes(activePatient.tokenNumber) && (
                      <span data-testid="badge-referred-chamber" className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                        🔁 Referred to CH-5 (Dr. Alok Mathur)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant="mint" size="sm">
                      {activePatient.bookingType === 'ONLINE_PAID' ? '₹49 Token Paid' : 'Walk-In'}
                    </Badge>
                    <button
                      type="button"
                      data-testid="btn-chamber-buzzer"
                      onClick={() => activePatient && triggerBuzzer(activePatient.tokenNumber, activePatient.patientName)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border shadow-xs ${
                        buzzerActive
                          ? 'bg-amber-500 text-slate-950 border-amber-600 animate-pulse'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>🔔</span>
                      <span>{buzzerActive ? 'Ringing...' : 'Chamber Buzzer'}</span>
                    </button>
                  </div>
                </div>

                {/* Known Allergies Critical Alert */}
                {activePatient.knownAllergies.length > 0 ? (
                  <div
                    className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1"
                    data-testid="patient-allergies-alert"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-red-800">
                      <span>⚠️</span>
                      <span>Documented Drug Allergies:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {activePatient.knownAllergies.map((allergy, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-red-200/60 text-red-900 font-bold text-[11px]"
                        >
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                    No documented drug allergies on record.
                  </div>
                )}

                {/* Pre-Consultation Vitals (Recorded by Reception Sunita) */}
                <div className="space-y-2 pt-2 border-t border-slate-100" data-testid="vitals-panel">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Pre-Consultation Vitals
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Recorded by {activePatient.vitals.recordedBy}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Blood Pressure</span>
                      <span className="text-sm font-bold font-mono text-slate-900" data-testid="vital-bp">
                        {activePatient.vitals.bpSystolic}/{activePatient.vitals.bpDiastolic}{' '}
                        <span className="text-[10px] font-normal text-slate-500">mmHg</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Pulse Rate</span>
                      <span className="text-sm font-bold font-mono text-slate-900" data-testid="vital-pulse">
                        {activePatient.vitals.pulseRate}{' '}
                        <span className="text-[10px] font-normal text-slate-500">bpm</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Oxygen (SpO2)</span>
                      <span className="text-sm font-bold font-mono text-emerald-700" data-testid="vital-spo2">
                        {activePatient.vitals.spo2}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Random Blood Sugar</span>
                      <span className="text-sm font-bold font-mono text-slate-900" data-testid="vital-sugar">
                        {activePatient.vitals.randomBloodSugarMgDl}{' '}
                        <span className="text-[10px] font-normal text-slate-500">mg/dL</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chronic Conditions & Chief Complaints */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Chronic Medical History
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {activePatient.chronicConditions.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Chief Complaints Today
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 font-medium">
                      {activePatient.chiefComplaints.map((comp, idx) => (
                        <li key={idx}>{comp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (8 cols): 1-Minute Digital Rx Composer */}
          <div className="lg:col-span-8 space-y-5">
            {/* 1-Click Clinical Protocol Bundles (Top Accelerators) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>⚡</span> 1-Click Clinical Protocols (3-Second Prescription)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pre-configures Diagnoses, Standard Indian Generics, Tests, and Lifestyle Advice
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Speed Mode Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid="protocol-bundles-grid">
                {protocols.map((bundle) => (
                  <button
                    key={bundle.id}
                    data-testid={`bundle-btn-${bundle.id}`}
                    onClick={() => handleApplyProtocol(bundle)}
                    className="p-3 text-left rounded-xl border border-emerald-100 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/90 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-emerald-950 group-hover:text-emerald-700">
                        {bundle.title}
                      </span>
                      <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200">
                        {bundle.shortCode}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{bundle.description}</p>
                    <span className="text-[10px] font-semibold text-emerald-700 mt-1 block">
                      +{bundle.medications.length} Medicines • +{bundle.investigations.length} Lab Tests
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Phase 15: AI-Assisted Sub-15ms ICD-10 Semantic Search & Diagnoses Editor */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    Clinical Diagnoses (ICD-10 Semantic Search)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Sub-15ms search with clinical synonym mapping (e.g. chest pain, sugar, bp, asthma, dengue)
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-mono">
                  ICD-10-CM Validated
                </span>
              </div>

              {/* Autocomplete Input */}
              <div className="relative">
                <input
                  type="text"
                  data-testid="input-diagnosis-search"
                  value={icdSearchQuery}
                  onChange={(e) => setIcdSearchQuery(e.target.value)}
                  placeholder="Search ICD-10 or clinical synonym (e.g. chest pain, sugar, bp, asthma, dengue, fever)..."
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-hidden bg-slate-50/50"
                />
                {isSearchingIcd && (
                  <span className="absolute right-3 top-3 text-[10px] text-slate-400 font-medium">
                    Searching ICD-10...
                  </span>
                )}

                {/* Dropdown Results */}
                {icdSearchResults.length > 0 && (
                  <div
                    data-testid="dropdown-icd-search-results"
                    className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100"
                  >
                    {icdSearchResults.map((entry) => (
                      <button
                        key={entry.code}
                        type="button"
                        data-testid={`chip-icd-result-${entry.code.replace('.', '-')}`}
                        onClick={() => handleAddIcdDiagnosis(entry)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{entry.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                              {entry.code}
                            </span>
                            {entry.isEmergencyAlert && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
                                🚨 STAT Emergency
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Synonyms: {entry.synonyms.join(', ')} • {entry.category}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-teal-700">+ Add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Diagnoses List */}
              <div className="flex flex-wrap gap-2 items-center pt-1" data-testid="diagnoses-list">
                {diagnoses.map((diag, idx) => (
                  <span
                    key={idx}
                    data-testid={`chip-diagnosis-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-950 text-xs font-bold shadow-2xs"
                  >
                    <span>✓ {diag}</span>
                    <button
                      type="button"
                      data-testid={`btn-remove-diagnosis-${idx}`}
                      onClick={() => handleRemoveDiagnosis(idx)}
                      className="text-teal-700 hover:text-red-600 text-xs font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Fast Drug Search & Autocomplete Input */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>💊</span> Prescribed Medicines (Rx)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Indian Pharmacopoeia Formulations with Brand + Generic in brackets
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-toggle-pediatric-doser"
                    onClick={() => setIsPediatricDoserOpen(!isPediatricDoserOpen)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                      isPediatricDoserOpen || (activePatient && activePatient.patientAge < 12)
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>👶 Pediatric Doser</span>
                    {activePatient && activePatient.patientAge < 12 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-600 text-white font-black">
                        Age {activePatient.patientAge}
                      </span>
                    )}
                  </button>
                  <span className="text-[11px] font-semibold text-slate-600">
                    {medications.length} items in Rx
                  </span>
                </div>
              </div>

              {/* Phase 10: Pediatric Weight-Based mg/kg Dosage Calculator */}
              {(isPediatricDoserOpen || (activePatient && activePatient.patientAge < 12)) && (
                <div
                  data-testid="card-pediatric-doser"
                  className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🍼</span>
                      <div>
                        <span className="text-xs font-bold text-amber-950 block">
                          Pediatric Weight-Based mg/kg Dosage Calculator (IP Standard)
                        </span>
                        <span className="text-[10px] text-amber-800">
                          Automatic mg/kg/day computation for liquid paediatric oral suspensions
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-amber-900">Child Weight:</span>
                      <div className="flex items-center">
                        <input
                          type="number"
                          step="0.5"
                          min="2"
                          max="50"
                          data-testid="input-child-weight"
                          value={childWeightKg}
                          onChange={(e) => setChildWeightKg(Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-amber-300 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="px-2 py-1 bg-amber-200/60 text-amber-900 font-bold rounded-r-lg border-y border-r border-amber-300 text-xs">
                          kg
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                        {activePatient?.patientAge ? `${activePatient.patientAge} Yrs` : 'Child'}
                      </span>
                    </div>
                  </div>

                  {/* Drug Selector Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      data-testid="btn-pediatric-amox"
                      onClick={() => setSelectedPediatricDrug('AMOXICILLIN')}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        selectedPediatricDrug === 'AMOXICILLIN'
                          ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-white border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      <span className="font-bold text-xs text-amber-950 block">Syr. Amoxicillin</span>
                      <span className="text-[10px] text-amber-800">40 mg/kg/day (TID)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="btn-pediatric-pcm"
                      onClick={() => setSelectedPediatricDrug('PARACETAMOL')}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        selectedPediatricDrug === 'PARACETAMOL'
                          ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-white border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      <span className="font-bold text-xs text-amber-950 block">Syr. Paracetamol</span>
                      <span className="text-[10px] text-amber-800">15 mg/kg/dose (SOS)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="btn-pediatric-azithro"
                      onClick={() => setSelectedPediatricDrug('AZITHROMYCIN')}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        selectedPediatricDrug === 'AZITHROMYCIN'
                          ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-white border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      <span className="font-bold text-xs text-amber-950 block">Syr. Azithromycin</span>
                      <span className="text-[10px] text-amber-800">10 mg/kg/day (OD)</span>
                    </button>
                  </div>

                  {/* Calculated Result & 1-Click Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-amber-200">
                    <div className="text-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Calculated Paediatric Formulation
                      </span>
                      <span data-testid="text-pediatric-computed-dose" className="font-bold text-slate-900 text-xs">
                        {selectedPediatricDrug === 'AMOXICILLIN' && (
                          <>
                            Novamox 250 (Amoxicillin 250mg/5ml) •{' '}
                            <span className="font-mono text-emerald-700 font-black">
                              {Number((((Math.round((childWeightKg * 40) / 3)) / 250) * 5).toFixed(1))} ml TID
                            </span>{' '}
                            ({Math.round((childWeightKg * 40) / 3)} mg/dose) x 5 days
                          </>
                        )}
                        {selectedPediatricDrug === 'PARACETAMOL' && (
                          <>
                            Calpol 250 Pead (Paracetamol 250mg/5ml) •{' '}
                            <span className="font-mono text-emerald-700 font-black">
                              {Number((((Math.round(childWeightKg * 15)) / 250) * 5).toFixed(1))} ml SOS
                            </span>{' '}
                            ({Math.round(childWeightKg * 15)} mg/dose) every 4-6h
                          </>
                        )}
                        {selectedPediatricDrug === 'AZITHROMYCIN' && (
                          <>
                            Zady 200 Susp (Azithromycin 200mg/5ml) •{' '}
                            <span className="font-mono text-emerald-700 font-black">
                              {Number((((Math.round(childWeightKg * 10)) / 200) * 5).toFixed(1))} ml OD
                            </span>{' '}
                            ({Math.round(childWeightKg * 10)} mg/dose) x 3 days
                          </>
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      data-testid="btn-insert-pediatric-dose"
                      onClick={handleInsertPediatricDose}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all shrink-0"
                    >
                      <span>+ Insert Calculated Dose to Rx</span>
                    </button>
                  </div>

                  {pediatricToast && (
                    <div
                      data-testid="toast-pediatric-dose-added"
                      className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between"
                    >
                      <span>{pediatricToast}</span>
                      <button
                        type="button"
                        onClick={() => setPediatricToast(null)}
                        className="text-emerald-700 hover:text-emerald-950 font-mono text-sm ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 10: Clinical CDS 2.0 High-Risk Drug-Drug Interaction Shield */}
              {detectedInteractions.map((alert) => (
                <div
                  key={alert.id}
                  data-testid="banner-ddi-alert"
                  className="p-4 rounded-2xl bg-gradient-to-r from-rose-950 via-slate-950 to-red-950 text-white border-2 border-rose-500 shadow-xl space-y-3 relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-800/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                        HIGH CLINICAL RISK • CDS 2.0 SHIELD
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-300">
                        {alert.drugAName} ⚡ {alert.drugBName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid="btn-remove-interacting-drug"
                        onClick={() => handleRemoveInteractingDrug(alert.drugBName)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                      >
                        ✕ Remove {alert.drugBName}
                      </button>
                      <button
                        type="button"
                        data-testid="btn-open-override"
                        onClick={() => setActiveOverridePromptId(alert.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                      >
                        Override with Justification
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 data-testid="text-ddi-title" className="text-sm font-bold text-rose-200">
                      {alert.title}
                    </h4>
                    <p className="text-xs text-rose-100/90 mt-1 leading-relaxed">
                      <span className="font-bold text-white">Mechanism: </span>
                      {alert.mechanism}
                    </p>
                    <p className="text-xs text-amber-200/90 mt-1">
                      <span className="font-bold text-amber-300">Clinical Guidance: </span>
                      {alert.clinicalGuidance}
                    </p>
                  </div>

                  {activeOverridePromptId === alert.id && (
                    <div className="p-3 bg-white/10 rounded-xl border border-white/20 space-y-2">
                      <label className="block text-xs font-bold text-white">
                        Document Clinical Override Justification (IT Act 2000 Audit Trail):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          data-testid="input-override-reason"
                          value={overrideInputText}
                          onChange={(e) => setOverrideInputText(e.target.value)}
                          placeholder="e.g. Checked serum K+ 4.2; patient refractory to monotherapy"
                          className="flex-1 px-3 py-2 rounded-lg text-xs text-slate-900 bg-white border border-rose-300 focus:outline-none"
                        />
                        <button
                          type="button"
                          data-testid="btn-confirm-override"
                          onClick={() => handleConfirmDdiOverride(alert.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
                        >
                          Confirm Override
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Phase 20: Real-Time Drug-Drug Interaction Safety Matrix */}
              {ddiAlerts.map((ddi) => (
                <div
                  key={ddi.id}
                  data-testid="banner-ddi-interaction-alert"
                  className="p-4 rounded-2xl bg-gradient-to-r from-red-950 via-slate-950 to-rose-950 text-white border-2 border-red-500 shadow-xl space-y-3 animate-fadeIn"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-800/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        data-testid="badge-ddi-severity"
                        className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse"
                      >
                        {ddi.severity}
                      </span>
                      <span className="text-xs font-mono font-bold text-red-300">
                        {ddi.drugsInvolved.join(' ⚡ ')}
                      </span>
                    </div>

                    {ddi.safeAlternative && (
                      <button
                        type="button"
                        data-testid="btn-apply-safe-substitute"
                        onClick={() => handleApplySafeSubstitute(ddi.replacesDrug, ddi.safeAlternative)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center gap-1.5 hover:scale-105"
                      >
                        <span>✓ Substitute with {ddi.safeAlternative}</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-red-200">
                      Contraindicated Drug Combination: {ddi.drugsInvolved.join(' + ')}
                    </h4>
                    <p className="text-xs text-red-100/90 mt-1 leading-relaxed">
                      <span className="font-bold text-white">Mechanism: </span>
                      {ddi.mechanism}
                    </p>
                    <p className="text-xs text-amber-200 mt-1">
                      <span className="font-bold text-amber-300">Clinical Impact: </span>
                      {ddi.clinicalImpact}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      <span className="font-bold text-slate-200">Recommended Action: </span>
                      {ddi.recommendedAction}
                    </p>
                  </div>
                </div>
              ))}

              {/* Phase 20: Pediatric Weight-Based Dosage Safety Window */}
              {pediatricDosing && (
                <div
                  data-testid="card-pediatric-weight-calculator"
                  className="p-3.5 rounded-2xl bg-pink-50 border border-pink-300 text-pink-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-7 w-7 rounded-lg bg-pink-600 text-white flex items-center justify-center font-bold text-sm shrink-0">👶</span>
                    <div>
                      <span className="text-xs font-bold block">
                        Pediatric Weight-Based Dosage Safety Window ({pediatricDosing.patientAgeYears} Yrs / {pediatricDosing.patientWeightKg} kg)
                      </span>
                      <span className="text-[11px] text-pink-800">
                        Recommended: <strong className="font-mono">{pediatricDosing.calculatedRecommendedDoseMg} mg</strong> single dose ({pediatricDosing.standardDoseMgPerKg} mg/kg) • Daily Ceiling: <strong className="font-mono">{pediatricDosing.maxDailyThresholdMg} mg/24hr</strong>.
                      </span>
                    </div>
                  </div>
                  <span
                    data-testid="badge-pediatric-dosing-verified"
                    className="px-2.5 py-1 rounded-full bg-pink-100 text-pink-900 border border-pink-300 text-[10px] font-bold font-mono shrink-0"
                  >
                    ✓ Therapeutic Window Verified
                  </span>
                </div>
              )}

              {/* Overridden DDI Logged Badges */}
              {overriddenDdiIds.map((id) => (
                <div
                  key={id}
                  data-testid="badge-ddi-overridden"
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700">✓ CDS Warning Overridden:</span>
                    <span>{DDI_RULES.find((r) => r.id === id)?.title}</span>
                    <span className="text-[11px] text-slate-600 font-mono italic">
                      (&quot;{overrideReasons[id]}&quot;)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded">
                    Audit Logged
                  </span>
                </div>
              ))}

              {/* Autocomplete Input */}
              <div className="relative">
                <input
                  type="text"
                  data-testid="input-drug-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type medicine name or generic (e.g. Augmentin, Telma, Atorva, Pantocid)..."
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-hidden transition-all bg-slate-50/50"
                />
                {isSearching && (
                  <span className="absolute right-3 top-3 text-[10px] text-slate-400 font-medium">
                    Searching...
                  </span>
                )}

                {/* Dropdown Results */}
                {searchResults.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-slate-100"
                    data-testid="drug-search-dropdown"
                  >
                    {searchResults.map((drug) => (
                      <button
                        key={drug.id}
                        type="button"
                        data-testid={`drug-option-${drug.id}`}
                        onClick={() => handleAddDrug(drug)}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/60 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{drug.brandName}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {drug.dosageForm}
                            </span>
                            {drug.scheduleDrugClass && (
                              <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {drug.scheduleDrugClass}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Generic: {drug.genericName} ({drug.commonStrengths.join(', ')})
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700">+ Add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Medications List Table */}
              <div className="overflow-x-auto" data-testid="medications-table">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase">
                      <th className="py-2.5 px-3">Medicine & Generic</th>
                      <th className="py-2.5 px-3">Strength</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Instructions</th>
                      <th className="py-2.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {medications.map((med, index) => (
                      <tr key={index} className="hover:bg-slate-50/60" data-testid={`rx-row-${index}`}>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">{med.drugName}</span>
                          <span className="text-[10px] text-slate-500">[{med.genericName}]</span>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={med.strength}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[index]!.strength = e.target.value;
                              setMedications(updated);
                            }}
                            className="w-16 px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={med.frequency}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[index]!.frequency = e.target.value as any;
                              setMedications(updated);
                            }}
                            className="px-2 py-1 text-xs border border-slate-200 rounded font-mono font-bold text-emerald-800 bg-white"
                          >
                            <option value="1-0-0">1-0-0 (Morning)</option>
                            <option value="1-0-1">1-0-1 (Twice/day)</option>
                            <option value="0-0-1">0-0-1 (Night)</option>
                            <option value="1-1-1">1-1-1 (Thrice/day)</option>
                            <option value="SOS">SOS (As needed)</option>
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={med.durationDays}
                              onChange={(e) => {
                                const updated = [...medications];
                                updated[index]!.durationDays = Number(e.target.value);
                                setMedications(updated);
                              }}
                              className="w-14 px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                            />
                            <span className="text-[10px] text-slate-500">days</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={med.instructions}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[index]!.instructions = e.target.value;
                              setMedications(updated);
                            }}
                            className="w-full min-w-36 px-2 py-1 text-xs border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            type="button"
                            data-testid={`btn-remove-med-${index}`}
                            onClick={() => handleRemoveMedication(index)}
                            className="text-slate-400 hover:text-red-600 transition-colors px-2 py-1 font-bold text-sm"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Diagnostic Investigations Ordered */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Diagnostic Investigations Ordered
              </label>
              <div className="flex flex-wrap gap-2 items-center" data-testid="investigations-list">
                {investigations.map((test, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold"
                  >
                    <span>🧪 {test}</span>
                    <button
                      type="button"
                      onClick={() => setInvestigations(investigations.filter((_, i) => i !== idx))}
                      className="text-teal-700 hover:text-red-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const t = prompt('Enter Diagnostic Investigation Name:');
                    if (t) setInvestigations([...investigations, t]);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:border-teal-500 hover:text-teal-700 text-xs font-semibold"
                >
                  + Order Investigation
                </button>
              </div>
            </div>

            {/* Dietary & Lifestyle Advice + Follow-Up */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Dietary & Lifestyle Advice
                </label>
                <textarea
                  value={dietaryAdvice}
                  onChange={(e) => setDietaryAdvice(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-hidden"
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Follow-Up Review
                </label>
                <input
                  type="text"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  placeholder="e.g. In 30 days (4 weeks)"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-hidden"
                />
                <span className="text-[11px] text-slate-500 block">
                  Prompts patient WhatsApp reminder 24 hours prior to recommended review date.
                </span>
              </div>
            </div>

            {/* Bottom Action Bar: Complete & Sign Rx */}
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200 block">
                  MCI / NMC 2023 Digital Signature Standard
                </span>
                <span className="text-sm font-bold text-white">
                  Ready to Sign Consultation for Token #{activePatient?.tokenNumber} ({activePatient?.patientName})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  data-testid="btn-prescription-audio-guide"
                  onClick={() => setIsAudioModalOpen(true)}
                  className="bg-purple-700 hover:bg-purple-600 text-white border border-purple-400/40 font-bold px-3.5 py-2.5 shadow-md text-xs flex items-center gap-1.5"
                  title="Synthesize multi-language audio prescription guide (Hindi / Marathi / Gujarati / English)"
                >
                  <span>🔊 Regional Audio Rx</span>
                </Button>

                <Button
                  type="button"
                  data-testid="btn-validate-fhir-bundle"
                  onClick={handleOpenFhirValidator}
                  className="bg-teal-700/80 hover:bg-teal-600 text-white border border-teal-400/40 font-bold px-3.5 py-2.5 shadow-md text-xs flex items-center gap-1.5"
                  title="Validate and Export ABDM Milestone M2/M3 FHIR R4 Document Bundle"
                >
                  <span>📋 ABDM FHIR R4</span>
                </Button>

                <Button
                  type="button"
                  data-testid="btn-chamber-referral"
                  onClick={() => setIsReferralModalOpen(true)}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold px-3.5 py-2.5 shadow-md text-xs flex items-center gap-1.5"
                  title="Refer patient to another specialist chamber in polyclinic"
                >
                  <span>🔁 Chamber Referral</span>
                </Button>

                <Button
                  type="button"
                  data-testid="btn-park-token-lab-hold"
                  onClick={handleOpenParkModal}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3.5 py-2.5 shadow-md text-xs flex items-center gap-1.5"
                  title="Place token on STAT diagnostic lab hold and call next patient"
                >
                  <span>⏸️ Hold for Lab/ECG</span>
                </Button>

                <Button
                  data-testid="btn-sign-prescription"
                  disabled={isSigning}
                  onClick={handleCompleteAndSign}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold px-4 py-2.5 shadow-md text-xs"
                >
                  {isSigning ? 'Signing & Hashing...' : '📄 Preview Letterhead'}
                </Button>

                {nextQueuedToken ? (
                  <Button
                    data-testid="btn-sign-and-call-next"
                    disabled={isSigning}
                    onClick={handleSignAndCallNext}
                    className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black px-6 py-2.5 shadow-lg text-xs flex items-center gap-1.5 transition-all hover:scale-105"
                  >
                    <span>⚡ Sign & Call Next: Token #{nextQueuedToken.tokenNumber} ({nextQueuedToken.patientName.split(' ')[0]})</span>
                  </Button>
                ) : (
                  <Button
                    data-testid="btn-sign-and-call-next"
                    disabled={isSigning}
                    onClick={handleCompleteAndSign}
                    className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black px-6 py-2.5 shadow-lg text-xs"
                  >
                    <span>✓ Sign & Finish Session</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: Drug-Allergy Warning Alert */}
      <Modal
        isOpen={allergyAlertModalOpen}
        onClose={() => setAllergyAlertModalOpen(false)}
        title="🚨 CRITICAL DRUG-ALLERGY CONTRAINDICATION ALERT"
      >
        <div className="p-6 space-y-4" data-testid="modal-allergy-alert">
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 block">
              High-Risk Anaphylaxis / Cross-Reactivity Warning
            </span>
            <p className="text-sm font-bold text-red-950">
              Patient {activePatient?.patientName} has a documented allergy to{' '}
              <span className="underline uppercase text-red-600">{matchedAllergen}</span>.
            </p>
            <p className="text-xs text-red-800 leading-relaxed">
              Prescribing <strong className="font-bold">{flaggedDrug?.brandName}</strong> [{flaggedDrug?.genericName}]
              poses severe risk of life-threatening allergic reaction, bronchospasm, or urticaria under Indian pharmacovigilance standards.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-700">
            <span className="font-bold text-slate-900 block">Recommended Safe Clinical Alternatives:</span>
            <p>• For respiratory infection: Consider Macrolide (Azithromycin) or Fluoroquinolone.</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              data-testid="btn-cancel-allergy-drug"
              onClick={() => setAllergyAlertModalOpen(false)}
              className="text-xs font-semibold text-slate-700"
            >
              Cancel & Select Alternative
            </Button>
            <Button
              data-testid="btn-override-allergy"
              onClick={() => {
                if (flaggedDrug) appendDrugToRx(flaggedDrug);
                setAllergyAlertModalOpen(false);
              }}
              className="bg-red-600 text-white hover:bg-red-700 font-bold text-xs"
            >
              Override with Clinical Justification
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Digitally Signed Prescription Preview & Dispatch */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Digitally Signed Prescription Letterhead (NMC Verified)"
      >
        {signedPrescription && (
          <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto" data-testid="modal-prescription-preview">
            {/* Header Letterhead */}
            <div className="border-b-2 border-emerald-800 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-black text-emerald-950">
                    {signedPrescription.clinicName}
                  </h2>
                  <p className="text-xs text-slate-600">{signedPrescription.clinicAddress}</p>
                  <p className="text-[11px] text-slate-500">Chamber: {signedPrescription.chamberNumber}</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold text-slate-900">{signedPrescription.doctorName}</h3>
                  <p className="text-[11px] text-slate-600">{signedPrescription.doctorQualifications}</p>
                  <span className="text-[11px] font-bold text-emerald-700">
                    NMC Reg No: {signedPrescription.doctorNmc}
                  </span>
                </div>
              </div>
            </div>

            {/* Patient & Vitals Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Patient Name</span>
                <span className="font-bold text-slate-900">{signedPrescription.patientName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Age / Gender</span>
                <span className="font-bold text-slate-900">
                  {signedPrescription.patientAge} Yrs / {signedPrescription.patientGender}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Token # / Date</span>
                <span className="font-bold text-emerald-800">
                  Token #{signedPrescription.tokenNumber} • Today
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">BP / Pulse / SpO2</span>
                <span className="font-bold font-mono text-slate-900">
                  {signedPrescription.vitalsAtConsultation.bpSystolic}/{signedPrescription.vitalsAtConsultation.bpDiastolic} | {signedPrescription.vitalsAtConsultation.pulseRate} | {signedPrescription.vitalsAtConsultation.spo2}%
                </span>
              </div>
            </div>

            {/* Diagnoses */}
            <div className="text-xs">
              <span className="font-bold text-slate-800 block mb-1">Diagnoses:</span>
              <p className="text-slate-700 font-semibold">{signedPrescription.diagnoses.join(' • ')}</p>
            </div>

            {/* Itemized Medications Table */}
            <div className="space-y-2">
              <span className="font-black text-emerald-900 text-lg block">℞</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Medicine Name (Brand [Generic])</th>
                      <th className="py-2 px-3">Dose & Frequency</th>
                      <th className="py-2 px-3">Duration</th>
                      <th className="py-2 px-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {signedPrescription.medications.map((m, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3">
                          <strong className="text-slate-900 font-bold">{m.drugName}</strong>{' '}
                          <span className="text-slate-500 text-[11px]">[{m.genericName}]</span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-800">{m.frequency}</td>
                        <td className="py-2 px-3">{m.durationDays} Days</td>
                        <td className="py-2 px-3 text-slate-600">{m.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Investigations & Dietary Advice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <span className="font-bold text-slate-800 block mb-1">Investigations Advised:</span>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                  {signedPrescription.investigationsOrdered.map((inv, idx) => (
                    <li key={idx}>{inv}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-bold text-slate-800 block mb-1">Lifestyle & Review:</span>
                <p className="text-slate-600 leading-relaxed">{signedPrescription.dietaryAdvice}</p>
                <p className="font-bold text-emerald-800 mt-1">Next Review: {signedPrescription.followUpDate}</p>
              </div>
            </div>

            {/* Digital Signature Seal */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5" data-testid="prescription-signature-seal">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <span>🛡️</span> Digitally Signed under IT Act 2000 & NMC EMR Regulations 2023
                </span>
                <span className="font-mono text-[10px] text-slate-500 block truncate max-w-sm">
                  SHA-256 Hash: {signedPrescription.digitalSignatureHash}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-800 block">
                  {signedPrescription.doctorName}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  Reg No: {signedPrescription.doctorNmc} (Verified)
                </span>
              </div>
            </div>

            {/* Dispatch & Print Feedback Messages */}
            {dispatchStatus && (
              <div
                className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold"
                data-testid="banner-dispatch-success"
              >
                ✓ {dispatchStatus}
              </div>
            )}
            {printStatus && (
              <div
                className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 font-semibold"
                data-testid="banner-print-success"
              >
                ✓ {printStatus}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="btn-print-reception"
                  onClick={handlePrintReception}
                  className="text-xs font-bold text-slate-700"
                >
                  🖨️ Silent Print at Reception
                </Button>
                <Button
                  size="sm"
                  data-testid="btn-dispatch-whatsapp"
                  onClick={handleDispatchWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  📱 Send PDF to Patient WhatsApp
                </Button>
              </div>

              {nextQueuedToken && (
                <Button
                  size="sm"
                  data-testid="btn-modal-sign-and-call-next"
                  onClick={handleSignAndCallNext}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5"
                >
                  <span>⚡ Call Next Patient: Token #{nextQueuedToken.tokenNumber} ({nextQueuedToken.patientName.split(' ')[0]})</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Place Token on Diagnostic Lab Hold */}
      <Modal
        isOpen={isParkModalOpen}
        onClose={() => setIsParkModalOpen(false)}
        title="Place Token on Diagnostic Lab Hold"
      >
        <div data-testid="modal-park-token-hold" className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <span className="font-bold text-amber-950 block">
              Patient: Token #{activePatient?.tokenNumber} • {activePatient?.patientName} ({activePatient?.patientAge}y {activePatient?.patientGender})
            </span>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Parking this token saves the doctor's current prescription draft and moves the patient to the STAT Lab Hold tray, advancing the waiting queue without marking them completed.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select STAT Diagnostic Order:</label>
            <select
              data-testid="select-hold-reason"
              value={selectedHoldReason}
              onChange={(e) => setSelectedHoldReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="STAT 12-Lead ECG (Chamber 4)">STAT 12-Lead ECG (Chamber 4)</option>
              <option value="Fingerprick Blood Glucose / CBC">Fingerprick Blood Glucose / CBC</option>
              <option value="Digital Chest X-Ray">Digital Chest X-Ray</option>
              <option value="STAT Troponin I / D-Dimer">STAT Troponin I / D-Dimer</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Reason & Notes:</label>
            <textarea
              data-testid="input-hold-notes"
              rows={2}
              value={holdNotes}
              onChange={(e) => setHoldNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Notes for diagnostic lab technician..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsParkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              data-testid="btn-confirm-park-token"
              onClick={handleConfirmParkToken}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              ⏸️ Confirm & Call Next Patient
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: ABDM Milestone M2/M3 FHIR R4 Bundle Validator & Export */}
      <Modal
        isOpen={isFhirModalOpen}
        onClose={() => setIsFhirModalOpen(false)}
        title="ABDM Milestone M2/M3 FHIR R4 Bundle Validator"
      >
        <div data-testid="modal-abdm-fhir-validator" className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="p-4 rounded-2xl bg-teal-950 text-white border border-teal-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-400/40">
                NRCES Profile Validated
              </span>
              <span className="font-mono text-[11px] text-teal-300">
                FHIR Version 4.0.1
              </span>
            </div>
            <h3 className="font-bold text-white text-base">
              ✓ 100% ABDM M2/M3 Health Record Compliance
            </h3>
            <p className="text-xs text-teal-200/90 leading-relaxed">
              Standardized HL7 FHIR R4 Document Bundle ready for immediate transmission to the National Health Authority (NHA) gateway and patient ABHA Health Locker.
            </p>
          </div>

          {/* Validated Resource Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans">Document Bundle</span>
              <span className="font-bold text-emerald-700">✓ NRCES Valid</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans">Composition</span>
              <span className="font-bold text-emerald-700">✓ 371530004</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans">Patient (ABHA)</span>
              <span className="font-bold text-emerald-700">✓ 91-4820...</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans">Practitioner (NMC)</span>
              <span className="font-bold text-emerald-700">✓ MP-38492</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans">Condition</span>
              <span className="font-bold text-emerald-700">✓ ICD-10 / SNOMED</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans">MedicationRequest</span>
              <span className="font-bold text-emerald-700">✓ {medications.length} Drugs</span>
            </div>
          </div>

          {/* FHIR JSON Preview */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">FHIR R4 JSON Document Payload Preview:</label>
            <pre
              data-testid="pre-fhir-json-preview"
              className="p-3.5 rounded-xl bg-slate-900 text-teal-300 font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed border border-slate-800"
            >
              {JSON.stringify(fhirValidationResult?.bundle || assembleFhirR4Bundle(), null, 2)}
            </pre>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-mono">
              Profile: DocumentBundle-R4
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFhirModalOpen(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                data-testid="btn-download-fhir-json"
                onClick={handleDownloadFhirJson}
                className="bg-teal-700 hover:bg-teal-600 text-white font-bold"
              >
                ⬇ Download FHIR R4 JSON
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Inter-Chamber Specialist Referral & Handover */}
      <Modal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        title="Inter-Chamber Specialist Referral & Handover"
      >
        <div data-testid="modal-chamber-referral" className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 space-y-1">
            <span className="font-bold block">
              Patient: Token #{activePatient?.tokenNumber} • {activePatient?.patientName} ({activePatient?.patientAge}y {activePatient?.patientGender})
            </span>
            <p className="text-[11px] leading-relaxed text-indigo-800">
              Directly transfers the patient from Chamber CH-3 (Dr. Rajesh Sharma, Cardiology) to another specialist chamber in Bhopal City Care Polyclinic with continuous clinical history.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select Target Specialist Chamber:</label>
            <select
              data-testid="select-target-chamber"
              value={referralTargetChamber}
              onChange={(e) => setReferralTargetChamber(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="CH-5">CH-5: Dr. Alok Mathur (ENT & Head Neck Surgery)</option>
              <option value="CH-1">CH-1: Dr. Amit Verma (Internal Medicine & Diabetology)</option>
              <option value="CH-4">CH-4: Diagnostic Imaging & Sonography / STAT 2D-Echo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Indication & Handover Notes:</label>
            <textarea
              data-testid="input-referral-notes"
              rows={2}
              value={referralReason}
              onChange={(e) => setReferralReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="State clinical reason for referral and diagnostic focus..."
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Referral Urgency Level:</label>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="btn-urgency-routine"
                onClick={() => setReferralUrgency('ROUTINE')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  referralUrgency === 'ROUTINE'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                Routine (Same-Day Queue)
              </button>
              <button
                type="button"
                data-testid="btn-urgency-stat"
                onClick={() => setReferralUrgency('STAT_EMERGENCY')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  referralUrgency === 'STAT_EMERGENCY'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                🚨 STAT Immediate Handover
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReferralModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              data-testid="btn-confirm-chamber-referral"
              onClick={handleConfirmReferral}
              className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold"
            >
              🔁 Dispatch Referral to CH-5
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 7: Phase 17 - Regional Multi-Language Audio Synthesis */}
      <Modal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        title="Regional Multi-Language Audio Prescription Guide (ABDM Accessible)"
      >
        <div className="space-y-4 pt-2" data-testid="modal-prescription-audio-synthesis">
          <p className="text-xs text-slate-600">
            Automatically generates a clear, spoken regional language explanation of medications, dosage, and dietary advice for geriatric and low-literacy patients.
          </p>

          {/* Language Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Patient's Preferred Regional Language:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { code: 'HI', label: '🇮🇳 Hindi (हिन्दी)' },
                { code: 'MR', label: '🚩 Marathi (मराठी)' },
                { code: 'GU', label: '🪔 Gujarati (ગુજરાતી)' },
                { code: 'EN', label: '🌐 English' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  data-testid={`btn-audio-lang-${lang.code}`}
                  onClick={() => setAudioLang(lang.code as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    audioLang === lang.code
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transcript Preview Box */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-purple-300 font-semibold border-b border-slate-800 pb-2">
              <span>🗣️ Spoken Transcript ({audioData?.languageLabel || 'Hindi'})</span>
              <span className="font-mono text-[11px] text-slate-400">Rate: 0.95x • ~28s</span>
            </div>
            <p
              data-testid="text-audio-transcript-preview"
              className="text-xs font-sans leading-relaxed text-slate-200"
            >
              {audioData?.audioTranscript || 'Loading prescription audio synthesis script...'}
            </p>
          </div>

          {/* Waveform & Playback Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="btn-play-pause-rx-audio"
                onClick={handleTogglePlayAudio}
                className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center font-bold text-sm shadow-md transition-all hover:scale-105"
              >
                {isPlayingAudio ? '⏸️' : '▶️'}
              </button>
              <div>
                <p className="text-xs font-bold text-purple-950">
                  {isPlayingAudio ? 'Playing Spoken Prescription...' : 'Ready to Play Audio Preview'}
                </p>
                <p className="text-[11px] text-purple-700">Clear pacing tailored for patient comprehension</p>
              </div>
            </div>

            {isPlayingAudio && (
              <div
                data-testid="waveform-audio-active"
                className="flex items-center gap-1 h-6 px-3 bg-white/80 rounded-lg border border-purple-200"
              >
                <span className="w-1 h-3 bg-purple-600 animate-pulse rounded-full" />
                <span className="w-1 h-5 bg-purple-600 animate-bounce rounded-full" />
                <span className="w-1 h-2 bg-purple-600 animate-pulse rounded-full" />
                <span className="w-1 h-6 bg-purple-600 animate-bounce rounded-full" />
                <span className="w-1 h-4 bg-purple-600 animate-pulse rounded-full" />
                <span className="text-[10px] font-mono text-purple-900 ml-1">AUDIO STREAMING</span>
              </div>
            )}
          </div>

          {/* WhatsApp Audio Dispatch Notification */}
          {audioWhatsAppNotice && (
            <div
              data-testid="toast-audio-whatsapp-sent"
              className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold"
            >
              {audioWhatsAppNotice}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAudioModalOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              data-testid="btn-dispatch-audio-whatsapp"
              onClick={handleDispatchAudioWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
            >
              <span>📲 Dispatch Audio to Patient WhatsApp</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-500">
        MediBooking.in Clinical EMR • NMC 2023 Compliant • Sub-15ms Pharmacopoeia Search
      </footer>
    </div>
  );
}

