import {z} from 'zod';
export const pdfQuizOptionsSchema=z.object({
 count:z.union([z.literal(5),z.literal(10)]).default(5),
 difficulty:z.enum(['easy','medium','hard','mixed']).default('mixed'),
 firstPage:z.number().int().min(1).max(100000).optional(),
 lastPage:z.number().int().min(1).max(100000).optional(),
}).strict().refine(value=>!value.firstPage||!value.lastPage||value.lastPage>=value.firstPage,{message:'Last page must not precede first page.'});
export type PdfQuizOptions=z.infer<typeof pdfQuizOptionsSchema>;
