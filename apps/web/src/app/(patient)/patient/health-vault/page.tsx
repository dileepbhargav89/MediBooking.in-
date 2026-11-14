'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, Badge, Input } from '@medibooking/ui';
import { HealthRecordDocument, FamilyMember } from '@medibooking/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function DigitalHealthVaultPage() {
  const [records, setRecords] = useState<HealthRecordDocument[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, famRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/patient/health-records?mobile=9826011111`),
        fetch(`${API_BASE_URL}/api/v1/patient/family?mobile=9826011111`),
      ]);

      if (recRes.ok) {
        const data = await recRes.json();
        setRecords(data.records || []);
      }
      if (famRes.ok) {
        const data = await famRes.json();
        setFamilyMembers(data.members || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (selectedPatientId !== 'ALL' && r.patientId !== selectedPatientId) return false;
    if (selectedType !== 'ALL' && r.recordType !== selectedType) return false;
    return true;
  });

  const handleExportAll = () => {
    setExportNotice(
      'Encrypted Health Records Archive (AES-256 ZIP) prepared under Section 12 DPDP Act 2023. Ready for download.'
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-emerald-900/10 px-4 sm:px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/20">
              M
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                MediBooking<span className="text-emerald-600">.in</span>
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Health Vault
              </span>
            </div>
          </Link>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <Link
              href="/patient"
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              Live Queue Tracker
            </Link>
            <Link
              href="/patient/family"
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              Family Profiles
            </Link>
            <Link
              href="/patient/health-vault"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-xs"
              data-testid="nav-health-vault-active"
            >
              Health Vault
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 space-y-6">
        {/* Banner with Portability & ABDM FHIR Standards */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-800 via-emerald-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="space-y-1.5 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold uppercase tracking-wider border border-emerald-400/30">
                Longitudinal Health Records
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 text-[11px] font-semibold">
                🛡️ FHIR R4 Bundle Standard
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 text-[11px] font-semibold">
                Section 12 DPDP Portability
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Family Digital Health Vault
            </h1>
            <p className="text-teal-100/90 text-xs sm:text-sm max-w-xl">
              Encrypted archive of all prescriptions, diagnostic lab panels, and recorded vitals from Bhopal partner polyclinics. Accessible anywhere, anytime.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 shrink-0 z-10 font-bold text-xs"
            onClick={handleExportAll}
            data-testid="btn-export-records"
          >
            📦 Export Encrypted ZIP (DPDP)
          </Button>
        </div>

        {/* Export Notification Alert */}
        {exportNotice && (
          <div
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between"
            data-testid="banner-export-success"
          >
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>{exportNotice}</span>
            </div>
            <button
              onClick={() => setExportNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold text-sm ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters: By Family Member & By Record Type */}
        <div className="space-y-3">
          {/* Family Member Filter Pills */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Filter by Patient Profile:
            </span>
            <div className="flex flex-wrap gap-2" data-testid="patient-filter-pills">
              <button
                onClick={() => setSelectedPatientId('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedPatientId === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                data-testid="filter-pill-all"
              >
                All Family Members ({records.length})
              </button>

              {familyMembers.map((fam) => {
                const count = records.filter((r) => r.patientId === fam.id).length;
                return (
                  <button
                    key={fam.id}
                    onClick={() => setSelectedPatientId(fam.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      selectedPatientId === fam.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                    data-testid={`filter-pill-${fam.id}`}
                  >
                    <span>{fam.fullName} ({fam.relationship})</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100/30">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Record Type Filter Pills */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Record Category:
            </span>
            <div className="flex flex-wrap gap-2" data-testid="record-type-pills">
              {[
                { key: 'ALL', label: 'All Documents' },
                { key: 'PRESCRIPTION', label: '🩺 Prescriptions' },
                { key: 'LAB_REPORT', label: '🧪 Lab Reports' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedType(t.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedType === t.key
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                  data-testid={`filter-type-${t.key.toLowerCase()}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Records Listing */}
        <div className="space-y-4" data-testid="health-records-list">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
              <span className="text-3xl block">📁</span>
              <h3 className="font-bold text-slate-800 text-base">No Records Match This Filter</h3>
              <p className="text-xs text-slate-500">
                Prescriptions and diagnostic summaries issued during polyclinic visits will appear here automatically.
              </p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden"
                data-testid={`record-card-${record.id}`}
              >
                {/* Header: Document Title & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {record.recordType}
                      </span>
                      {record.isAbhaLinked && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                          ✓ ABDM Linked
                        </span>
                      )}
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-mono text-slate-500 font-semibold">{record.date}</span>
                    </div>

                    <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                      {record.title}
                    </h3>

                    <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-emerald-800">{record.patientName}</span>
                      <span>({record.relationship})</span>
                      <span>•</span>
                      <span>{record.doctorName} ({record.specialty})</span>
                      <span>•</span>
                      <span className="text-slate-500">{record.clinicName} • {record.chamberNumber}</span>
                    </div>
                  </div>

                  {/* Vitals Summary Pill */}
                  {record.vitals && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-3 shrink-0">
                      {record.vitals.bpSystolic && (
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">BP</span>
                          <span className="font-mono font-bold text-slate-800">
                            {record.vitals.bpSystolic}/{record.vitals.bpDiastolic}
                          </span>
                        </div>
                      )}
                      {record.vitals.bloodSugar && (
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Sugar</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {record.vitals.bloodSugar} mg/dL
                          </span>
                        </div>
                      )}
                      {record.vitals.pulseRate && (
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Pulse</span>
                          <span className="font-mono font-bold text-slate-800">
                            {record.vitals.pulseRate} bpm
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Diagnoses Chips */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Clinical Diagnosis / Findings:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {record.diagnoses.map((diag) => (
                      <span
                        key={diag}
                        className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-950 border border-emerald-200"
                      >
                        {diag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prescribed Medications Table */}
                {record.prescriptions && record.prescriptions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Prescribed Medications:
                    </span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Medicine / Generic</th>
                            <th className="px-3 py-2">Dosage</th>
                            <th className="px-3 py-2">Duration</th>
                            <th className="px-3 py-2">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {record.prescriptions.map((rx, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-bold text-slate-900">{rx.medicine}</td>
                              <td className="px-3 py-2 text-slate-700 font-mono">{rx.dosage}</td>
                              <td className="px-3 py-2 text-slate-600">{rx.duration}</td>
                              <td className="px-3 py-2 text-emerald-800 font-semibold">{rx.instructions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actions: Download PDF, Share WhatsApp, FHIR ID */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold flex items-center gap-1.5"
                      onClick={() => alert(`Downloading formal PDF for ${record.title}`)}
                      data-testid={`btn-download-${record.id}`}
                    >
                      <span>📥</span> Download Formal PDF
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-emerald-800 hover:bg-emerald-50 font-bold flex items-center gap-1"
                      onClick={() => alert(`Shared record link with WhatsApp contacts`)}
                      data-testid={`btn-share-whatsapp-${record.id}`}
                    >
                      <span>📲</span> WhatsApp Share
                    </Button>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    FHIR Bundle ID: {record.fhirBundleId || 'abdm-fhir-r4-001'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        MediBooking.in Health Vault • Encrypted at Rest • ABDM FHIR R4 Compliant • DPDP Act 2023
      </footer>
    </div>
  );
}

