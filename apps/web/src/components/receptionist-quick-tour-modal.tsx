'use client';

import React, { useState } from 'react';
import { Button, Card, Badge, Input } from '@medibooking/ui';

interface ReceptionistQuickTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicName?: string;
}

export function ReceptionistQuickTourModal({
  isOpen,
  onClose,
  clinicName = 'City Polyclinic',
}: ReceptionistQuickTourModalProps) {
  const [tourStep, setTourStep] = useState<number>(1);
  const [patientName, setPatientName] = useState('Ramesh Kumar');
  const [mobile, setMobile] = useState('9826011111');
  const [selectedChamber, setSelectedChamber] = useState('CH-1 (Cardiology)');
  const [bp, setBp] = useState('120/80');
  const [sugar, setSugar] = useState('110');
  const [pulse, setPulse] = useState('76');
  const [isTokenGenerated, setIsTokenGenerated] = useState(false);
  const [isVitalsSaved, setIsVitalsSaved] = useState(false);

  if (!isOpen) return null;

  const handleGenerateSampleToken = () => {
    setIsTokenGenerated(true);
    setTourStep(2);
  };

  const handleSaveVitals = () => {
    setIsVitalsSaved(true);
    setTourStep(3);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      data-testid="receptionist-quick-tour-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            data-testid="btn-close-tour"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-100 text-xs font-bold uppercase tracking-wider">
              90-Second Rapid Onboarding • 90 सेकंड त्वरित प्रशिक्षण
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Sunita&apos;s Front Desk Quick Tour / सुनीता रिसेप्शनिस्ट प्रशिक्षण
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            Learn 10-second token generation, vitals recording, and one-click letterhead printing.
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          {[
            { num: 1, titleEn: '1. Walk-in Token', titleHi: 'पर्ची बनाएं' },
            { num: 2, titleEn: '2. Quick Vitals', titleHi: 'वाइटल्स दर्ज करें' },
            { num: 3, titleEn: '3. One-Click Print', titleHi: 'प्रिंट पर्ची' },
          ].map((st) => (
            <div
              key={st.num}
              className={`flex-1 text-center py-2 px-1 border-b-2 transition-all ${
                tourStep === st.num
                  ? 'border-emerald-600 text-emerald-800 font-bold'
                  : tourStep > st.num
                  ? 'border-emerald-400 text-emerald-600 font-semibold'
                  : 'border-transparent text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">
                {tourStep > st.num ? '✓ ' : ''}
                {st.titleEn}
              </div>
              <div className="text-[10px] text-slate-500">{st.titleHi}</div>
            </div>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* STEP 1: 10-Second Walk-in Token */}
          {tourStep === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    Step 1: 10-Second Patient Walk-in Intake / 10 सेकंड में मरीज का टोकन बनाएं
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Enter the patient name and phone number. The system automatically assigns the next token number and alerts the waiting room TV!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Patient Name / मरीज का नाम *
                  </label>
                  <Input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    data-testid="input-tour-patient-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Number / मोबाइल नंबर *
                  </label>
                  <Input
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9826011111"
                    maxLength={10}
                    data-testid="input-tour-patient-mobile"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Chamber / डॉक्टर कक्ष
                </label>
                <select
                  value={selectedChamber}
                  onChange={(e) => setSelectedChamber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  data-testid="select-tour-chamber"
                >
                  <option value="CH-1 (Cardiology)">CH-1 • Dr. Rajesh Sharma (Cardiology)</option>
                  <option value="CH-2 (Dermatology)">CH-2 • Dr. Priya Patel (Dermatology)</option>
                  <option value="CH-3 (Orthopedics)">CH-3 • Dr. Alok Sharma (Orthopedics)</option>
                  <option value="CH-4 (Pediatrics)">CH-4 • Dr. Sunita Deshmukh (Pediatrics)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Consultation Fee / परामर्श शुल्क</span>
                  <span className="text-lg font-black text-slate-900">₹600</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">
                    UPI / Cash
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button
                  size="lg"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleGenerateSampleToken}
                  data-testid="btn-tour-step1-next"
                >
                  Issue Token #01 & Record Vitals →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Quick Vitals Entry */}
          {tourStep === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3">
                <span className="text-2xl">🩺</span>
                <div>
                  <h4 className="text-sm font-bold text-teal-950">
                    Step 2: Quick Vitals Triage / रक्तचाप, शुगर और पल्स दर्ज करें
                  </h4>
                  <p className="text-xs text-teal-800 mt-0.5">
                    Recording vitals takes 15 seconds. These are printed directly on the doctor&apos;s prescription letterhead for immediate review.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-700 font-bold">Active Patient Token</span>
                  <div className="text-sm font-bold text-slate-900">
                    #01 • {patientName} ({mobile})
                  </div>
                </div>
                <Badge variant="emerald">CH-1</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Blood Pressure (BP)
                  </label>
                  <Input
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    placeholder="120/80"
                    data-testid="input-tour-bp"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">mmHg (e.g. 120/80)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Random Sugar (RBS)
                  </label>
                  <Input
                    value={sugar}
                    onChange={(e) => setSugar(e.target.value)}
                    placeholder="110"
                    data-testid="input-tour-sugar"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">mg/dL</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pulse Rate
                  </label>
                  <Input
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="76"
                    data-testid="input-tour-pulse"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">bpm</span>
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setTourStep(1)}>
                  ← Back
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSaveVitals}
                  data-testid="btn-tour-step2-next"
                >
                  Save Vitals & Preview Slip →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Thermal Slip & Letterhead Preview */}
          {tourStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <span className="text-2xl">🖨️</span>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    Step 3: Auto-Print Thermal Receipt & Doctor Letterhead / पर्ची प्रिंट करें
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Press Ctrl+P or click print. The thermal printer prints the token with barcode and vitals in 2 seconds!
                  </p>
                </div>
              </div>

              {/* Thermal Slip Mockup */}
              <div
                className="max-w-xs mx-auto p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl shadow-inner font-mono text-xs text-slate-800 space-y-2"
                data-testid="tour-sample-receipt"
              >
                <div className="text-center border-b border-dashed border-slate-300 pb-2">
                  <div className="font-bold text-sm tracking-tight">{clinicName}</div>
                  <div className="text-[10px] text-slate-500">Outpatient Consultation Slip</div>
                </div>

                <div className="flex justify-between font-bold text-base bg-slate-100 p-1.5 rounded">
                  <span>TOKEN:</span>
                  <span className="text-emerald-700">#01</span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <span className="font-semibold">{patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mobile:</span>
                    <span>{mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chamber:</span>
                    <span className="font-bold text-emerald-800">CH-1 (Cardio)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vitals:</span>
                    <span>BP: {bp} | Sugar: {sugar}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-slate-200 pt-1 font-bold">
                    <span>Fee Paid:</span>
                    <span>₹600 (Cash/UPI)</span>
                  </div>
                </div>

                <div className="text-center pt-1 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
                  ||||| ||||||| |||||| ||||
                  <div className="mt-0.5">Track live at medibooking.in</div>
                </div>
              </div>

              {/* Completion Alert */}
              <div
                className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-center text-emerald-900 text-xs font-bold"
                data-testid="tour-completion-badge"
              >
                🎉 Sunita is 100% Ready for Day-1 Receptionist Desk! / सुनीता अब रिसेप्शन काउंटर के लिए पूरी तरह तैयार हैं!
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setTourStep(2)}>
                  ← Back to Vitals
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={onClose}
                  data-testid="btn-tour-finish"
                >
                  Complete Quick Tour & Close ✕
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
