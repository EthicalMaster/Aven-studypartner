import { z } from 'zod';
import { evidenceMatches, normalizeEvidence, type Passage } from './flashcards.js';

export const quizBatchSchema = z.object({ questions: z.array(z.unknown()).min(1).max(10) }).strict();
const questionSchema = z.object({
  question: z.string().trim().min(3).max(500),
  options: z.array(z.string().trim().min(1).max(240)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1).max(700),
  sourceId: z.string().trim().min(1).max(40),
  evidence: z.string().trim().min(1).max(800),
}).strict();

export function validateQuizBatch(value: unknown, passages: Passage[]) {
  const batch = quizBatchSchema.parse(value);
  const seen = new Set<string>();
  const questions: (z.infer<typeof questionSchema> & { page: number })[] = [];
  for (const item of batch.questions) {
    const parsed = questionSchema.safeParse(item);
    if (!parsed.success) continue;
    const q = parsed.data;
    const source = passages.find(p => p.id === q.sourceId);
    const normalized = normalizeEvidence(q.question);
    if (!source || !evidenceMatches(source.text, q.evidence) || seen.has(normalized)) continue;
    if (new Set(q.options.map(normalizeEvidence)).size !== 4) continue;
    if (/what (?:does|is) (?:this|the) (?:paragraph|passage|unit|chapter)|what is (?:unit|chapter|module)\s+\d/i.test(q.question)) continue;
    if (q.options.some(o => /^(?:all|none) of the above[.!]?$/i.test(o))) continue;
    seen.add(normalized);
    questions.push({ ...q, page: source.page });
  }
  return { questions, rejectedCount: batch.questions.length - questions.length };
}
