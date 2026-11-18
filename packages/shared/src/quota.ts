import { z } from 'zod';

export const QuotaBucket = z.enum(['chat', 'assist']);
export type QuotaBucket = z.infer<typeof QuotaBucket>;

export const QuotaResponse = z.object({
  chat: z.object({ used: z.number().int(), limit: z.number().int() }),
  assist: z.object({ used: z.number().int(), limit: z.number().int() }),
  /** ISO 8601, 00:00 giờ Việt Nam kế tiếp. */
  resetsAt: z.string(),
});
export type QuotaResponse = z.infer<typeof QuotaResponse>;
