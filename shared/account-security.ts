import {z} from 'zod';
export const recoveryRequestSchema=z.object({email:z.string().trim().email().max(255).transform(s=>s.toLowerCase())}).strict();
export const newPasswordSchema=z.string().min(8).max(128);
export const recoveryCompleteSchema=recoveryRequestSchema.extend({code:z.string().regex(/^\d{6}$/),password:newPasswordSchema});
export const passwordChangeSchema=z.object({currentPassword:z.string().min(1).max(128),password:newPasswordSchema}).strict();
