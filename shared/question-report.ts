import {z} from 'zod';
export const questionReportSchema=z.object({
 sessionId:z.string().uuid(),questionId:z.string().uuid(),
 reason:z.enum(['incorrect_answer','unclear_question','source_mismatch','other']),
 note:z.string().trim().min(5).max(1000),
}).strict();
export type QuestionReportInput=z.infer<typeof questionReportSchema>;
