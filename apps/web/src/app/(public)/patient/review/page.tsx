'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardHeader, CardBody, Badge } from '@medibooking/ui';
import { WaitTimeRating } from '@medibooking/types';

export default function PatientReviewSubmissionPage() {
  const [overallRating, setOverallRating] = useState<number>(5);
  const [waitTimeRating, setWaitTimeRating] = useState<WaitTimeRating>('ACCURATE');
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(5);
  const [doctorCommunicationRating, setDoctorCommunicationRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Doctor Listened Carefully',
    'Minimal Wait Time',
    'Clean Waiting Area',
  ]);
  const [comment, setComment] = useState<string>(
    'डॉक्टर साहब ने बहुत अच्छे से समझाया। दवाइयों की पर्ची तुरंत फोन पर मिल गई और काउंटर पर बिल्कुल भी इंतज़ार नहीं करना पड़ा।'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const availableTags = [
    'Doctor Listened Carefully',
    'Minimal Wait Time',
    'Clean Waiting Area',
    'Polite Staff',
    'Clear Prescription',
    'Bilingual Instructions',
    'Affordable Consultation',
  ];

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      tokenNumber: 12,
      clinicId: 'clinic-bhopal-city-care',
      clinicName: 'Bhopal City Care Polyclinic',
      doctorId: 'doc-sharma-cardio',
      doctorName: 'Dr. Rajesh Sharma',
      patientId: 'pat-kailash-74',
      patientName: 'Kailash Prasad (by Ramesh Kumar)',
      primaryMobile: '9826011111',
      overallRating,
      waitTimeRating,
      cleanlinessRating,
      doctorCommunicationRating,
      staffCourtesyRating: 5,
      positiveTags: selectedTags,
      comment,
    };

    try {
      const res = await fetch('http://127.0.0.1:4000/api/v1/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 flex flex-col justify-between text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-emerald-100/70 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/20">
              M
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              MediBooking<span className="text-emerald-600">.in</span>
            </span>
          </Link>

          <Link href="/dr/dr-rajesh-sharma-cardio">
            <Button variant="ghost" size="sm" className="text-xs font-semibold text-emerald-800 hover:text-emerald-900">
              ← View Doctor Profile
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Review Form */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 border-b border-slate-100 pb-5">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider">
              ✓ Verified Consultation Feedback
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Rate Your Consultation with Dr. Rajesh Sharma
            </h1>
            <p className="text-xs text-slate-500">
              Bhopal City Care Polyclinic • Token #12 • Completed Today
            </p>
          </div>

          {/* Submission Success Banner */}
          {isSubmitted ? (
            <div
              className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3"
              data-testid="banner-review-published"
            >
              <div className="h-12 w-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-xl font-black shadow-md">
                ✓
              </div>
              <h3 className="text-lg font-bold text-emerald-950">
                Thank You, Ramesh ji! Your Review is Published.
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                Your feedback has been verified and published on Dr. Rajesh Sharma's public profile. Your rating helps maintain Bhopal City Care's <strong>MediBooking Prime Polyclinic Accreditation</strong>.
              </p>
              <div className="pt-2">
                <Link href="/dr/dr-rajesh-sharma-cardio">
                  <Button size="sm" className="bg-emerald-700 text-white font-bold text-xs">
                    View on Doctor Profile
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-patient-review">
              {/* Star Rating Selector */}
              <div className="text-center space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Overall Experience (1 to 5 Stars)
                </label>
                <div className="flex items-center justify-center gap-2" data-testid="star-rating-selector">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      data-testid={`star-btn-${star}`}
                      onClick={() => setOverallRating(star)}
                      className={`text-3xl transition-transform hover:scale-125 focus:outline-hidden ${
                        star <= overallRating ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-emerald-800 block" data-testid="rating-label">
                  {overallRating === 5 && '⭐⭐⭐⭐⭐ Excellent (अत्यंत उत्तम)'}
                  {overallRating === 4 && '⭐⭐⭐⭐ Good (अच्छा अनुभव)'}
                  {overallRating === 3 && '⭐⭐⭐ Average (सामान्य)'}
                  {overallRating === 2 && '⭐⭐ Below Expectations (सुधार की आवश्यकता)'}
                  {overallRating === 1 && '⭐ Poor (असंतोषजनक)'}
                </span>
              </div>

              {/* Dimension 1: Wait Time Accuracy */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Queue Wait Time Experience (प्रतीक्षा समय)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    data-testid="wait-btn-accurate"
                    onClick={() => setWaitTimeRating('ACCURATE')}
                    className={`p-3 rounded-xl border text-center font-bold transition-all ${
                      waitTimeRating === 'ACCURATE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    ⚡ &lt; 15 Mins
                    <span className="block text-[10px] font-normal opacity-80">On Time / Minimal Wait</span>
                  </button>

                  <button
                    type="button"
                    data-testid="wait-btn-moderate"
                    onClick={() => setWaitTimeRating('MODERATE_DELAY')}
                    className={`p-3 rounded-xl border text-center font-bold transition-all ${
                      waitTimeRating === 'MODERATE_DELAY'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    ⏱️ 15–30 Mins
                    <span className="block text-[10px] font-normal opacity-80">Moderate Waiting</span>
                  </button>

                  <button
                    type="button"
                    data-testid="wait-btn-long"
                    onClick={() => setWaitTimeRating('VERY_LONG')}
                    className={`p-3 rounded-xl border text-center font-bold transition-all ${
                      waitTimeRating === 'VERY_LONG'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    ⏳ &gt; 30 Mins
                    <span className="block text-[10px] font-normal opacity-80">Delayed Queue</span>
                  </button>
                </div>
              </div>

              {/* Dimension 2: Doctor Communication & Cleanliness */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Doctor Communication Clarity
                  </label>
                  <select
                    value={doctorCommunicationRating}
                    onChange={(e) => setDoctorCommunicationRating(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value={5}>5/5 - Listened with extreme patience</option>
                    <option value={4}>4/5 - Explained diagnoses well</option>
                    <option value={3}>3/5 - Satisfactory</option>
                    <option value={2}>2/5 - Rushed consultation</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Clinic Cleanliness & Hygiene
                  </label>
                  <select
                    value={cleanlinessRating}
                    onChange={(e) => setCleanlinessRating(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value={5}>5/5 - Spotless & sanitized</option>
                    <option value={4}>4/5 - Clean waiting room</option>
                    <option value={3}>3/5 - Average cleanliness</option>
                  </select>
                </div>
              </div>

              {/* Quick Feedback Tags */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  What did you like the most? (चुनें क्या सबसे अच्छा लगा)
                </label>
                <div className="flex flex-wrap gap-2" data-testid="feedback-tags-group">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-1 ring-emerald-500/20'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment Textarea */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Your Detailed Experience (Hindi / English)
                </label>
                <textarea
                  data-testid="input-review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="डॉक्टर साहब का व्यवहार, पर्ची मिलने की गति, या क्लिनिक के बारे में अपना अनुभव लिखें..."
                  className="w-full p-3.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-hidden leading-relaxed"
                />
              </div>

              {/* Anti-Defamation Shield & Consent Notice */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                🛡️ <strong>Transaction-Verified Review:</strong> Your review is linked to Token #12. The National Medical Commission regulations encourage objective patient experience feedback while prohibiting defamatory language. Doctors have a statutory right to post a professional reply.
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                data-testid="btn-submit-review"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/25 text-sm"
              >
                {isSubmitting ? 'Publishing Review...' : '✓ Publish Verified Review (प्रतिक्रिया सबमिट करें)'}
              </Button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        MediBooking.in Reputation Engine • Transaction-Verified Feedback • DPDP Act 2023 Compliant
      </footer>
    </div>
  );
}

