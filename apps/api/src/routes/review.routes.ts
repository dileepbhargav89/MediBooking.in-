import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ReviewService } from '../services/review-service';
import { ReviewModerationStatus } from '@medibooking/types';

export const reviewRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const reviewService = ReviewService.getInstance();

  // 1. Get Doctor Reviews and Reputation Score
  server.get<{ Params: { doctorId: string } }>(
    '/reviews/doctor/:doctorId',
    async (request, reply) => {
      const { doctorId } = request.params;
      const data = reviewService.getDoctorReputation(doctorId);
      return reply.send({
        success: true,
        score: data.score,
        reviewsCount: data.reviews.length,
        reviews: data.reviews,
      });
    }
  );

  // 2. Submit Transaction-Verified Patient Review
  server.post<{ Body: any }>('/reviews/submit', async (request, reply) => {
    const payload = request.body || {};
    const review = reviewService.submitReview(payload);
    return reply.status(201).send({
      success: true,
      message: 'Verified consultation review published successfully.',
      review,
    });
  });

  // 3. Doctor Professional Public Reply
  server.post<{ Params: { id: string }; Body: { replyText: string } }>(
    '/reviews/:id/reply',
    async (request, reply) => {
      const { id } = request.params;
      const { replyText } = request.body || {};
      if (!replyText || replyText.trim() === '') {
        return reply.status(400).send({ success: false, error: 'Reply text cannot be empty' });
      }
      const result = reviewService.replyToReview(id, replyText);
      return reply.send(result);
    }
  );

  // 4. Super Admin Pending Moderation Queue
  server.get('/reviews/pending-moderation', async (_request, reply) => {
    const pending = reviewService.getPendingModerationReviews();
    return reply.send({
      success: true,
      count: pending.length,
      reviews: pending,
    });
  });

  // 5. Super Admin Moderate Review (Approve or Flag)
  server.post<{ Params: { id: string }; Body: { status: ReviewModerationStatus } }>(
    '/reviews/:id/moderate',
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body || {};
      const result = reviewService.moderateReview(id, status || 'PUBLISHED');
      return reply.send(result);
    }
  );
};

