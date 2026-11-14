'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, Badge, Input } from '@medibooking/ui';
import { FamilyMember, AbhaProfile } from '@medibooking/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function FamilyProfilesPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryMobile, setPrimaryMobile] = useState('9826011111');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAbhaModalOpen, setIsAbhaModalOpen] = useState(false);
  const [selectedMemberForAbha, setSelectedMemberForAbha] = useState<FamilyMember | null>(null);

  // New Dependent Form State
  const [newFullName, setNewFullName] = useState('');
  const [newRelationship, setNewRelationship] = useState<'SELF' | 'SPOUSE' | 'PARENT' | 'CHILD' | 'OTHER'>('PARENT');
  const [newGender, setNewGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [newAge, setNewAge] = useState('68');
  const [newBloodGroup, setNewBloodGroup] = useState('O+');
  const [newConditions, setNewConditions] = useState('Hypertension, Knee Joint Pain');
  const [newAllergies, setNewAllergies] = useState('None');
  const [dpdpCaregiverConsent, setDpdpCaregiverConsent] = useState(true);

  // ABHA Modal State
  const [abhaStep, setAbhaStep] = useState<1 | 2 | 3>(1);
  const [abhaInput, setAbhaInput] = useState('91-2345-6789-0123');
  const [abhaTxnId, setAbhaTxnId] = useState('');
  const [otpInput, setOtpInput] = useState('123456');
  const [abhaResult, setAbhaResult] = useState<AbhaProfile | null>(null);
  const [isAbhaSubmitting, setIsAbhaSubmitting] = useState(false);
  const [abhaError, setAbhaError] = useState<string | null>(null);

  useEffect(() => {
    fetchFamilyMembers();
  }, [primaryMobile]);

  const fetchFamilyMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/patient/family?mobile=${primaryMobile}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newAge) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/patient/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryMobile,
          fullName: newFullName.trim(),
          relationship: newRelationship,
          gender: newGender,
          age: parseInt(newAge, 10),
          bloodGroup: newBloodGroup,
          chronicConditions: newConditions.split(',').map((c) => c.trim()).filter(Boolean),
          knownAllergies: newAllergies.split(',').map((a) => a.trim()).filter(Boolean),
          dpdpConsentAcknowledged: dpdpCaregiverConsent,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNewFullName('');
        fetchFamilyMembers();
      }
    } catch (err) {
      console.error('Failed to add family member', err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/patient/family/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete member', err);
    }
  };

  const handleStartAbhaLink = (member: FamilyMember) => {
    setSelectedMemberForAbha(member);
    setAbhaStep(1);
    setAbhaError(null);
    setAbhaInput(member.abhaId || `${member.primaryMobile}`);
    setIsAbhaModalOpen(true);
  };

  const handleGenerateAbhaOtp = async () => {
    setIsAbhaSubmitting(true);
    setAbhaError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/abdm/abha/generate-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileOrAbha: abhaInput,
          authType: 'AADHAAR',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAbhaTxnId(data.txnId);
        setOtpInput(data.demoOtp || '123456');
        setAbhaStep(2);
      } else {
        setAbhaError(data.message || 'Failed to request ABDM OTP');
      }
    } catch {
      setAbhaError('Network error connecting to ABDM Gateway');
    } finally {
      setIsAbhaSubmitting(false);
    }
  };

  const handleVerifyAbhaOtp = async () => {
    setIsAbhaSubmitting(true);
    setAbhaError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/abdm/abha/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnId: abhaTxnId,
          otp: otpInput,
          familyMemberId: selectedMemberForAbha?.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAbhaResult(data.abhaProfile);
        setAbhaStep(3);
        fetchFamilyMembers();
      } else {
        setAbhaError(data.message || 'Invalid ABDM OTP');
      }
    } catch {
      setAbhaError('Failed to verify ABDM credentials');
    } finally {
      setIsAbhaSubmitting(false);
    }
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
                Patient Portal
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
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-xs"
              data-testid="nav-family-profiles"
            >
              Family Profiles
            </Link>
            <Link
              href="/patient/health-vault"
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              data-testid="nav-health-vault"
            >
              Health Vault
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 space-y-6">
        {/* Banner with DPDP & ABDM Accreditation */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="space-y-1.5 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold uppercase tracking-wider border border-emerald-400/30">
                Caregiver Hub • 1-Account Family Care
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 text-[11px] font-semibold">
                🛡️ DPDP Act 2023 Compliant
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 text-[11px] font-semibold">
                🇮🇳 ABDM Milestone 1
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Family Healthcare Profiles
            </h1>
            <p className="text-teal-100/90 text-xs sm:text-sm max-w-xl">
              Manage appointments, chronic condition profiles, and longitudinal prescription histories for your parents, children, and spouse under one mobile number.
            </p>
          </div>

          <Button
            size="lg"
            variant="primary"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shrink-0 z-10"
            onClick={() => setIsAddModalOpen(true)}
            data-testid="btn-add-family-member"
          >
            + Add Family Member
          </Button>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white/80 border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block font-semibold">Total Family Members</span>
            <span className="text-2xl font-black text-slate-900 font-mono" data-testid="metric-family-count">
              {members.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block font-semibold">Active Caregiver</span>
            <span className="text-base font-bold text-emerald-800 truncate block">
              +91 {primaryMobile}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block font-semibold">Chronic Conditions</span>
            <span className="text-base font-bold text-slate-800 truncate block">
              Diabetes, BP, Arthritis
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block font-semibold">ABHA ABDM Linked</span>
            <span className="text-base font-bold text-teal-700 truncate block font-mono" data-testid="metric-abha-linked-count">
              {members.filter((m) => m.isAbhaLinked).length} / {members.length} Linked
            </span>
          </div>
        </div>

        {/* Family Members Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>👨‍👩‍👧‍👦</span> Family Members ({members.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Click &quot;Book Doctor&quot; to auto-fill clinic prescription letterhead
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="family-members-grid">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all space-y-4 relative overflow-hidden"
                data-testid={`family-card-${member.id}`}
              >
                {/* Relationship Pill & Delete */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
                      {member.relationship === 'PARENT' && member.gender === 'MALE' ? '👴' : ''}
                      {member.relationship === 'PARENT' && member.gender === 'FEMALE' ? '👵' : ''}
                      {member.relationship === 'CHILD' ? '👧' : ''}
                      {member.relationship === 'SELF' ? '👤' : ''}
                      {member.relationship === 'SPOUSE' ? '💍' : ''}
                      {member.relationship === 'OTHER' ? '🧑' : ''}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">{member.fullName}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {member.relationship}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {member.age} Years • {member.gender} • Blood Group: <strong className="text-slate-700">{member.bloodGroup || 'B+'}</strong>
                      </div>
                    </div>
                  </div>

                  {member.relationship !== 'SELF' && (
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="text-slate-400 hover:text-red-600 text-xs p-1 rounded transition-colors"
                      title="Remove dependent (DPDP Right to Erasure)"
                      data-testid={`btn-delete-${member.id}`}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Chronic Conditions & Allergies */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] font-bold text-slate-500 shrink-0">Conditions:</span>
                    <div className="flex flex-wrap gap-1">
                      {member.chronicConditions && member.chronicConditions.length > 0 ? (
                        member.chronicConditions.map((cond) => (
                          <span
                            key={cond}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200"
                          >
                            {cond}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">None reported</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-[11px] font-bold text-slate-500 shrink-0">Allergies:</span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      {member.knownAllergies?.join(', ') || 'No known drug allergies'}
                    </span>
                  </div>
                </div>

                {/* ABHA Status Banner */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  {member.isAbhaLinked ? (
                    <div className="flex items-center gap-1.5 text-teal-800 font-bold" data-testid={`abha-badge-${member.id}`}>
                      <span>✓</span>
                      <span className="text-[11px]">ABHA ID: {member.abhaId || '91-2345-6789-0123'}</span>
                      <span className="px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 text-[9px]">ABDM</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartAbhaLink(member)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      data-testid={`btn-link-abha-${member.id}`}
                    >
                      <span>⚡</span> Link ABHA ID (Get ₹25 Credit) →
                    </button>
                  )}
                </div>

                {/* Actions: Book Doctor / View Vault */}
                <div className="pt-2 flex items-center gap-2">
                  <Link
                    href={`/doctors?patientId=${member.id}&name=${encodeURIComponent(member.fullName)}&age=${member.age}&gender=${member.gender}&conditions=${encodeURIComponent(member.chronicConditions.join(', '))}`}
                    className="flex-1"
                  >
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                      data-testid={`btn-book-for-${member.id}`}
                    >
                      Book Doctor for {member.fullName.split(' ')[0]} →
                    </Button>
                  </Link>

                  <Link href={`/patient/health-vault?patientId=${member.id}`}>
                    <Button size="sm" variant="outline" className="text-xs" data-testid={`btn-vault-${member.id}`}>
                      Health Vault 📁
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Add Family Member Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          data-testid="modal-add-family"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in duration-150">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-6 relative">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                ✕
              </button>
              <h3 className="text-xl font-black tracking-tight">Add Family Dependent</h3>
              <p className="text-xs text-emerald-100 mt-1">
                Link parents, children, or spouse for 1-click booking and longitudinal health records.
              </p>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name (पूरा नाम) *
                </label>
                <Input
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Kailash Prasad"
                  data-testid="input-member-name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Relationship *
                  </label>
                  <select
                    value={newRelationship}
                    onChange={(e) => setNewRelationship(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    data-testid="select-member-relationship"
                  >
                    <option value="PARENT">Parent (माता / पिता)</option>
                    <option value="SPOUSE">Spouse (पति / पत्नी)</option>
                    <option value="CHILD">Child (बेटा / बेटी)</option>
                    <option value="OTHER">Other Dependent (अन्य)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gender *
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    data-testid="select-member-gender"
                  >
                    <option value="MALE">Male (पुरुष)</option>
                    <option value="FEMALE">Female (महिला)</option>
                    <option value="OTHER">Other (अन्य)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Age (Years) *
                  </label>
                  <Input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="70"
                    min="1"
                    max="120"
                    data-testid="input-member-age"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Blood Group
                  </label>
                  <select
                    value={newBloodGroup}
                    onChange={(e) => setNewBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    data-testid="select-member-blood"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chronic Health Conditions (comma separated)
                </label>
                <Input
                  value={newConditions}
                  onChange={(e) => setNewConditions(e.target.value)}
                  placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                  data-testid="input-member-conditions"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Known Drug Allergies (comma separated)
                </label>
                <Input
                  value={newAllergies}
                  onChange={(e) => setNewAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  data-testid="input-member-allergies"
                />
              </div>

              {/* DPDP Caregiver Consent Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dpdpCaregiverConsent}
                    onChange={(e) => setDpdpCaregiverConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    data-testid="checkbox-dpdp-caregiver"
                    required
                  />
                  <span className="text-slate-600 text-[11px] leading-relaxed">
                    <strong>DPDP Act 2023 Caregiver Declaration:</strong> I declare that I am the legal caregiver authorized to manage healthcare appointments and records for this dependent.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                  data-testid="btn-save-member"
                >
                  Save Family Profile →
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABHA ABDM Milestone 1 Linking Modal */}
      {isAbhaModalOpen && selectedMemberForAbha && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          data-testid="modal-abha-link"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 relative">
              <button
                onClick={() => setIsAbhaModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
                  Ayushman Bharat Digital Mission (ABDM)
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight">
                Link ABHA ID for {selectedMemberForAbha.fullName}
              </h3>
              <p className="text-xs text-blue-100 mt-1">
                Unified 14-digit National Health Identity under Govt. of India. Earn ₹25 Health Credits upon linking.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {abhaError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {abhaError}
                </div>
              )}

              {/* Step 1: Input 14-digit ABHA or Mobile */}
              {abhaStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      14-Digit ABHA Number or Mobile *
                    </label>
                    <Input
                      value={abhaInput}
                      onChange={(e) => setAbhaInput(e.target.value)}
                      placeholder="e.g. 91-2345-6789-0123"
                      data-testid="input-abha-number"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Enter the 14-digit ABHA or Aadhaar-linked mobile number.
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
                    <span className="font-bold block">🎁 Voluntary Benefit</span>
                    <p className="text-[11px] text-blue-800">
                      Linking ABHA enables paperless health record sharing with hospitals across India and awards ₹25 discount credits for your next polyclinic token.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <Button
                      variant="primary"
                      className="bg-blue-600 hover:bg-blue-700 w-full"
                      onClick={handleGenerateAbhaOtp}
                      disabled={isAbhaSubmitting}
                      data-testid="btn-request-abha-otp"
                    >
                      {isAbhaSubmitting ? 'Requesting OTP...' : 'Request Aadhaar / ABDM OTP →'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Enter 6-digit OTP */}
              {abhaStep === 2 && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    OTP sent to Aadhaar-linked phone for <strong>{abhaInput}</strong>. (Demo OTP: <strong className="font-mono">123456</strong>)
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      6-Digit National Health OTP *
                    </label>
                    <Input
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="font-mono text-center tracking-widest text-lg font-black"
                      data-testid="input-abha-otp"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <Button
                      variant="primary"
                      className="bg-blue-600 hover:bg-blue-700 w-full"
                      onClick={handleVerifyAbhaOtp}
                      disabled={isAbhaSubmitting}
                      data-testid="btn-verify-abha-otp"
                    >
                      {isAbhaSubmitting ? 'Verifying with ABDM...' : 'Verify OTP & Link ABHA Card ✓'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Official Ayushman Bharat Digital Card */}
              {abhaStep === 3 && abhaResult && (
                <div className="space-y-4" data-testid="abha-card-preview">
                  {/* Digital ABHA Card Replica */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-800 to-blue-900 text-white shadow-lg space-y-3 relative overflow-hidden border border-white/20">
                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🇮🇳</span>
                        <span className="text-[10px] font-bold tracking-wider uppercase">
                          National Health Authority • ABDM
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-bold">
                        VERIFIED
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-teal-200 font-semibold">Ayushman Bharat Health Account</div>
                        <h4 className="text-base font-black tracking-tight">{selectedMemberForAbha.fullName}</h4>
                        <div className="font-mono font-bold text-sm tracking-wider mt-1 text-emerald-300">
                          {abhaResult.abhaNumber}
                        </div>
                        <div className="text-[10px] text-teal-100 font-mono">{abhaResult.abhaAddress}</div>
                      </div>

                      {/* Mock QR */}
                      <div className="h-16 w-16 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center text-slate-900 font-mono text-[8px] text-center border border-slate-300">
                        [QR CODE]
                      </div>
                    </div>

                    <div className="text-[9px] text-teal-200/80 pt-1 border-t border-white/10 flex justify-between">
                      <span>DOB: {abhaResult.dob} • Gender: {abhaResult.gender}</span>
                      <span>State: Madhya Pradesh</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold text-center">
                    🎉 ₹25 MediBooking Health Credits Awarded to Caregiver Wallet!
                  </div>

                  <Button
                    variant="primary"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setIsAbhaModalOpen(false)}
                    data-testid="btn-close-abha-success"
                  >
                    Done & View Family Profiles ✓
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        MediBooking.in Caregiver Platform • DPDP Act 2023 Compliant • ABDM Health Information Provider (HIP)
      </footer>
    </div>
  );
}

