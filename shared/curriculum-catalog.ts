import {z} from 'zod';
const label=z.string().trim().min(1).max(160);
const source=z.string().url().max(1500).refine(s=>s.startsWith('https://'),'Use an HTTPS source URL');
export const curriculumManifestSchema=z.object({
 id:z.string().uuid().optional(),level:z.enum(['school','university']),authority:label,
 program:z.string().trim().max(160).default(''),stage:label,curriculumVersion:label,
 sourceUrl:source,reviewNote:z.string().trim().min(10).max(2000),reviewedBy:label,
 placements:z.array(z.object({questionId:z.string().uuid(),unit:label,sourceUrl:source,reviewNote:z.string().trim().min(10).max(2000)}).strict()).min(1).max(2000)
}).strict().refine(v=>v.level!=='university'||v.program.length>0,'University contexts require a program').refine(v=>new Set(v.placements.map(p=>p.questionId)).size===v.placements.length,'Duplicate question placements');
export interface CurriculumContext {id:string;level:'school'|'university';authority:string;program:string;stage:string;curriculum_version:string;source_url:string;question_count:number}
