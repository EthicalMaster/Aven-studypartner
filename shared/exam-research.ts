import { z } from 'zod';
export interface ExamSourceCandidate {
  id: string;
  title: string;
  url: string;
  host: string;
  snippet: string;
}
export interface ExamResearchResult {
  cacheKey: string | null;
  sources: ExamSourceCandidate[];
  fetchedAt: string | null;
  cached: boolean;
  message: string;
}
export const researchSelectionSchema = z.object({
  cacheKey: z.string().regex(/^[a-f0-9]{64}$/),
  sourceIds: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(2),
  reviewed: z.literal(true),
}).strict();
export type ResearchSelection = z.infer<typeof researchSelectionSchema>;
