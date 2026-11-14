'use client';

import React, { useState, useEffect } from 'react';
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
} from '@medibooking/types';

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
    }
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

              return (
                <button
                  key={token.tokenNumber}
                  data-testid={`token-chip-${token.tokenNumber}`}
                  onClick={() => handleSelectToken(token)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shrink-0 ${
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
                  {token.knownAllergies.length > 0 && (
                    <span className="text-[10px]" title="Known Allergies">
                      ⚠️
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Next Patient Peek Badge */}
          {nextQueuedToken && (
            <div
              data-testid="banner-next-patient-peek"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 shrink-0 font-semibold"
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

            {/* Diagnoses Editor */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Clinical Diagnoses (ICD-10 / Provisional)
              </label>
              <div className="flex flex-wrap gap-2 items-center" data-testid="diagnoses-list">
                {diagnoses.map((diag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold"
                  >
                    <span>✓ {diag}</span>
                    <button
                      type="button"
                      onClick={() => setDiagnoses(diagnoses.filter((_, i) => i !== idx))}
                      className="text-emerald-700 hover:text-red-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const d = prompt('Enter additional provisional diagnosis:');
                    if (d) setDiagnoses([...diagnoses, d]);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 text-xs font-semibold"
                >
                  + Add Diagnosis
                </button>
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
                <span className="text-[11px] font-semibold text-slate-600">
                  {medications.length} items in Rx
                </span>
              </div>

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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-500">
        MediBooking.in Clinical EMR • NMC 2023 Compliant • Sub-15ms Pharmacopoeia Search
      </footer>
    </div>
  );
}

