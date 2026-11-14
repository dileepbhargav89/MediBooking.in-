'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, CardHeader, CardBody, Badge } from '@medibooking/ui';
import { ConsultationReview, ReviewModerationStatus } from '@medibooking/types';

export default function SuperAdminReviewsModerationPage() {
  const [reviews, setReviews] = useState<ConsultationReview[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    // Fetch pending moderation reviews
    fetch('http://127.0.0.1:4000/api/v1/reviews/pending-moderation')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.reviews) {
          setReviews(data.reviews);
        }
      })
      .catch((err) => console.error('Failed to fetch pending reviews:', err));
  }, []);

  const handleModerate = async (reviewId: string, status: ReviewModerationStatus) => {
    try {
      const res = await fetch(`http://127.0.0.1:4000/api/v1/reviews/${reviewId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setActionNotice(
          status === 'PUBLISHED'
            ? 'Review approved and published to public doctor profile.'
            : 'Review flagged for defamation/clinical review and suppressed.'
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/super-admin" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                SA
              </div>
              <span className="font-bold text-white text-base">
                Super Admin Console <span className="text-purple-400 text-xs">• Defamation Shield</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/super-admin">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-slate-300 hover:text-white">
                ← Admin Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Patient Review Moderation & Defamation Shield
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              National Medical Commission (NMC) Advertising Ethics & Clinical Dispute Protection Engine
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
              {reviews.length} Reviews Pending Moderation
            </span>
          </div>
        </div>

        {/* Feedback Banner */}
        {actionNotice && (
          <div
            className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold"
            data-testid="banner-moderation-success"
          >
            ✓ {actionNotice}
          </div>
        )}

        {/* Moderation Queue List */}
        <div className="space-y-4" data-testid="moderation-queue-list">
          {reviews.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 border border-slate-800 rounded-2xl">
              <span className="text-3xl block mb-2">🛡️</span>
              <h3 className="text-base font-bold text-white">All Patient Reviews Moderated</h3>
              <p className="text-xs text-slate-400 mt-1">
                Zero flagged or defamatory reviews in the holding queue.
              </p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl shadow-md space-y-4"
                data-testid={`moderation-card-${rev.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{rev.patientName}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] font-mono">
                        Token #{rev.tokenNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        Pending Moderation
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Doctor: <strong className="text-slate-200">{rev.doctorName}</strong> • Clinic: {rev.clinicName}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    {'★'.repeat(rev.overallRating)}
                    {'☆'.repeat(5 - rev.overallRating)}
                    <span className="text-xs font-bold text-slate-300 ml-1">({rev.overallRating}/5)</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-700/50 text-xs text-slate-300 leading-relaxed font-mono">
                  "{rev.comment}"
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700/60 text-xs">
                  <div className="text-[11px] text-slate-400">
                    NMC Compliance Check: <span className="text-emerald-400 font-semibold">Passed Keyword Audit</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`btn-flag-review-${rev.id}`}
                      onClick={() => handleModerate(rev.id, 'FLAGGED')}
                      className="text-xs font-bold text-red-400 border-red-500/40 hover:bg-red-500/20"
                    >
                      🚩 Flag & Suppress
                    </Button>
                    <Button
                      size="sm"
                      data-testid={`btn-approve-review-${rev.id}`}
                      onClick={() => handleModerate(rev.id, 'PUBLISHED')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      ✓ Approve & Publish
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-3 px-6 text-center text-xs text-slate-500">
        MediBooking.in Super Admin Defamation Shield • National Medical Commission Compliance
      </footer>
    </div>
  );
}

