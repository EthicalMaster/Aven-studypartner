import { z } from 'zod';
export const editedFlashcardSchema = z.object({
  id: z.string().uuid(), question: z.string().trim().min(3).max(500),
  answer: z.string().trim().min(1).max(1200), keyConcept: z.string().trim().min(1).max(160),
  formula: z.string().trim().max(300), difficulty: z.enum(['easy','medium','hard']),
}).strict();
export const saveFlashcardDraftSchema = z.object({cards:z.array(editedFlashcardSchema).min(1).max(6)}).strict();
export type EditedFlashcard = z.infer<typeof editedFlashcardSchema>;
export interface DraftCard extends EditedFlashcard { evidence:string; page:number }
export interface FlashcardDraft { id:string; title:string; subject:string; topic:string; cards:DraftCard[]; rejectedCount:number }
