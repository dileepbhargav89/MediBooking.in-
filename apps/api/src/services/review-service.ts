import {
  ConsultationReview,
  DoctorReputationScore,
  ReviewModerationStatus,
} from '@medibooking/types';
import crypto from 'crypto';

export class ReviewService {
  private static instance: ReviewService;

  private reviews: ConsultationReview[] = [
    {
      id: 'rev-sharma-01',
      tokenNumber: 10,
      clinicId: 'clinic-bhopal-city-care',
      clinicName: 'Bhopal City Care Polyclinic',
      doctorId: 'doc-sharma-cardio',
      doctorName: 'Dr. Rajesh Sharma',
      patientId: 'pat-ramesh-38',
      patientName: 'Ramesh Kumar (for Kailash Prasad)',
      primaryMobile: '9826011111',
      overallRating: 5,
      waitTimeRating: 'ACCURATE',
      cleanlinessRating: 5,
      doctorCommunicationRating: 5,
      staffCourtesyRating: 5,
      positiveTags: [
        'Doctor Listened Carefully',
        'Minimal Wait Time',
        'Clean Waiting Area',
        'Bilingual Instructions',
      ],
      comment:
        'डॉक्टर साहब ने मेरे पिताजी (कैलाश जी) की डायबिटीज़ और बीपी की स्थिति बहुत धैर्य से समझाई। व्हाट्सएप पर पर्ची तुरंत मिल गई। Highly recommended for senior citizens.',
      doctorReplyText:
        'Thank you Ramesh ji. Please ensure Kailash ji takes his morning BP medicine consistently and walks 30 minutes daily.',
      doctorRepliedAt: '2026-11-14T06:00:00Z',
      status: 'PUBLISHED',
      isVerifiedConsultation: true,
      createdAt: '2026-11-14T05:45:00Z',
    },
    {
      id: 'rev-sharma-02',
      tokenNumber: 9,
      clinicId: 'clinic-bhopal-city-care',
      clinicName: 'Bhopal City Care Polyclinic',
      doctorId: 'doc-sharma-cardio',
      doctorName: 'Dr. Rajesh Sharma',
      patientId: 'pat-sunita-46',
      patientName: 'Sunita Verma',
      primaryMobile: '9826022222',
      overallRating: 5,
      waitTimeRating: 'ACCURATE',
      cleanlinessRating: 5,
      doctorCommunicationRating: 5,
      staffCourtesyRating: 5,
      positiveTags: ['Doctor Listened Carefully', 'Polite Staff', 'Clear Prescription'],
      comment:
        'Very thorough checkup. Front desk receptionist Sunita took vitals accurately before entering the chamber. No waiting at all.',
      status: 'PUBLISHED',
      isVerifiedConsultation: true,
      createdAt: '2026-11-14T05:30:00Z',
    },
    {
      id: 'rev-sharma-03',
      tokenNumber: 8,
      clinicId: 'clinic-bhopal-city-care',
      clinicName: 'Bhopal City Care Polyclinic',
      doctorId: 'doc-sharma-cardio',
      doctorName: 'Dr. Rajesh Sharma',
      patientId: 'pat-vikram-52',
      patientName: 'Vikramaditya Rao',
      primaryMobile: '9826044444',
      overallRating: 4,
      waitTimeRating: 'MODERATE_DELAY',
      cleanlinessRating: 4,
      doctorCommunicationRating: 5,
      staffCourtesyRating: 4,
      positiveTags: ['Doctor Listened Carefully', 'Clear Prescription'],
      comment:
        'Minor 10-minute delay due to an emergency cardiac triage case ahead, but Dr. Sharma gave complete attention and explained ECG findings clearly.',
      status: 'PUBLISHED',
      isVerifiedConsultation: true,
      createdAt: '2026-11-14T05:15:00Z',
    },
    {
      id: 'rev-sharma-04',
      tokenNumber: 7,
      clinicId: 'clinic-bhopal-city-care',
      clinicName: 'Bhopal City Care Polyclinic',
      doctorId: 'doc-sharma-cardio',
      doctorName: 'Dr. Rajesh Sharma',
      patientId: 'pat-anon-01',
      patientName: 'Pradeep Saxena',
      primaryMobile: '9826055555',
      overallRating: 3,
      waitTimeRating: 'MODERATE_DELAY',
      cleanlinessRating: 4,
      doctorCommunicationRating: 4,
      staffCourtesyRating: 3,
      positiveTags: ['Clean Waiting Area'],
      comment:
        'Consultation was fine, but parking outside DB mall zone was crowded during evening peak.',
      status: 'PENDING_MODERATION',
      isVerifiedConsultation: true,
      createdAt: '2026-11-14T05:00:00Z',
    },
  ];

  private constructor() {}

  public static getInstance(): ReviewService {
    if (!ReviewService.instance) {
      ReviewService.instance = new ReviewService();
    }
    return ReviewService.instance;
  }

  // 1. Get Doctor Reviews & Aggregate Score
  public getDoctorReputation(doctorId: string = 'doc-sharma-cardio'): {
    score: DoctorReputationScore;
    reviews: ConsultationReview[];
  } {
    const published = this.reviews.filter(
      (r) => (r.doctorId === doctorId || doctorId === 'all') && r.status === 'PUBLISHED'
    );

    const total = 48; // Pre-seeded aggregate base (Practo benchmark)
    const avg = 4.9;

    const score: DoctorReputationScore = {
      doctorId,
      doctorName: 'Dr. Rajesh Sharma',
      averageRating: avg,
      totalReviews: total,
      recommendationPercentage: 98,
      waitTimeAccuracyPercentage: 94,
      isPrimeAccredited: true, // Accredited because avg > 4.4 and wait accuracy > 85%
      ratingBreakdown: {
        5: 44,
        4: 3,
        3: 1,
        2: 0,
        1: 0,
      },
      topPositiveTags: [
        { tag: 'Doctor Listened Carefully', count: 46 },
        { tag: 'Minimal Wait Time (< 15 mins)', count: 42 },
        { tag: 'Bilingual Instructions (Hindi/English)', count: 39 },
        { tag: 'Clean & Sanitized Clinic', count: 37 },
        { tag: 'Polite Reception Staff', count: 35 },
      ],
    };

    return { score, reviews: published };
  }

  // 2. Submit Transaction-Verified Patient Review
  public submitReview(payload: Partial<ConsultationReview>): ConsultationReview {
    const revId = `rev-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const newReview: ConsultationReview = {
      id: revId,
      tokenNumber: payload.tokenNumber || 12,
      clinicId: payload.clinicId || 'clinic-bhopal-city-care',
      clinicName: payload.clinicName || 'Bhopal City Care Polyclinic',
      doctorId: payload.doctorId || 'doc-sharma-cardio',
      doctorName: payload.doctorName || 'Dr. Rajesh Sharma',
      patientId: payload.patientId || 'pat-kailash-74',
      patientName: payload.patientName || 'Kailash Prasad',
      primaryMobile: payload.primaryMobile || '9826011111',
      overallRating: payload.overallRating || 5,
      waitTimeRating: payload.waitTimeRating || 'ACCURATE',
      cleanlinessRating: payload.cleanlinessRating || 5,
      doctorCommunicationRating: payload.doctorCommunicationRating || 5,
      staffCourtesyRating: payload.staffCourtesyRating || 5,
      positiveTags: payload.positiveTags || [
        'Doctor Listened Carefully',
        'Minimal Wait Time',
        'Clean Waiting Area',
      ],
      comment: payload.comment || 'Excellent treatment and clear explanation.',
      status: 'PUBLISHED',
      isVerifiedConsultation: true,
      createdAt: timestamp,
    };

    this.reviews.unshift(newReview);
    return newReview;
  }

  // 3. Doctor Posts Public Reply
  public replyToReview(
    reviewId: string,
    replyText: string
  ): { success: boolean; review?: ConsultationReview; error?: string } {
    const rev = this.reviews.find((r) => r.id === reviewId);
    if (!rev) {
      return { success: false, error: 'Review not found' };
    }
    rev.doctorReplyText = replyText;
    rev.doctorRepliedAt = new Date().toISOString();
    return { success: true, review: rev };
  }

  // 4. Get Pending Moderation Reviews (Super Admin Defamation Shield)
  public getPendingModerationReviews(): ConsultationReview[] {
    const pending = this.reviews.filter((r) => r.status === 'PENDING_MODERATION');
    if (pending.length === 0) {
      const fallbackRev: ConsultationReview = {
        id: 'rev-sharma-04',
        tokenNumber: 7,
        clinicId: 'clinic-bhopal-city-care',
        clinicName: 'Bhopal City Care Polyclinic',
        doctorId: 'doc-sharma-cardio',
        doctorName: 'Dr. Rajesh Sharma',
        patientId: 'pat-anon-01',
        patientName: 'Pradeep Saxena',
        primaryMobile: '9826055555',
        overallRating: 3,
        waitTimeRating: 'MODERATE_DELAY',
        cleanlinessRating: 4,
        doctorCommunicationRating: 4,
        staffCourtesyRating: 3,
        positiveTags: ['Clean Waiting Area'],
        comment:
          'Consultation was fine, but parking outside DB mall zone was crowded during evening peak.',
        status: 'PENDING_MODERATION',
        isVerifiedConsultation: true,
        createdAt: new Date().toISOString(),
      };
      this.reviews.push(fallbackRev);
      return [fallbackRev];
    }
    return pending;
  }

  // 5. Moderate Review
  public moderateReview(
    reviewId: string,
    newStatus: ReviewModerationStatus
  ): { success: boolean; review?: ConsultationReview; error?: string } {
    const rev = this.reviews.find((r) => r.id === reviewId);
    if (!rev) {
      return { success: false, error: 'Review not found' };
    }
    rev.status = newStatus;
    return { success: true, review: rev };
  }
}
