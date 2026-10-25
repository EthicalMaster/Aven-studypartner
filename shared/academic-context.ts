import { z } from 'zod';
const label=z.string().trim().min(1).max(120);
export const academicContextSchema=z.discriminatedUnion('level',[
 z.object({level:z.literal('school'),authority:label,stage:label,subject:label}).strict(),
 z.object({level:z.literal('university'),authority:label,stage:label,subject:label,program:label}).strict(),
]);
export type AcademicContext=z.infer<typeof academicContextSchema>;

// Subject belongs to the selected document, never to cross-document defaults.
export const academicPreferencesSchema = z.discriminatedUnion('level', [
  academicContextSchema.options[0].omit({ subject: true }),
  academicContextSchema.options[1].omit({ subject: true }),
]);
export type AcademicPreferences = z.infer<typeof academicPreferencesSchema>;
