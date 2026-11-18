import { z } from 'zod';

export const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export const Level = z.enum(LEVELS);
export type Level = z.infer<typeof Level>;

export const Register = z.enum(['formal', 'neutral', 'casual']);
export type Register = z.infer<typeof Register>;
