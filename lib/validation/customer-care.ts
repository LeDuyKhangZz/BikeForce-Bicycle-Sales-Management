import { z } from 'zod';

export const customerCareSubmissionSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
  misaEmployeeId: z.coerce.number().int().positive(),
  misaCustomerId: z.coerce.number().int().positive(),
  careDate: z.string().date(),
  note: z.string().trim().max(2000).optional(),
});

export const customerCareReviewSchema = z.object({
  submissionId: z.uuid(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().trim().max(1000).optional(),
}).refine(
  (value) => value.decision === 'APPROVED' || Boolean(value.rejectionReason),
  { path: ['rejectionReason'], message: 'Vui lòng nhập lý do từ chối.' },
);
