import {z} from 'zod';
import {getRequiredPool} from '../db/connection.js';
import {SecurityError} from './password-recovery.service.js';
export const cardEditSchema=z.object({question:z.string().trim().min(3).max(500),answer:z.string().trim().min(1).max(1200),version:z.number().int().nonnegative()}).strict();
export const flashcardEditService={
 async update(studentId:string,id:string,input:unknown){const data=cardEditSchema.parse(input);const client=await getRequiredPool().connect();
  try{await client.query('BEGIN');await client.query('SELECT id FROM student_profiles WHERE id=$1 FOR UPDATE',[studentId]);
   const result=await client.query('SELECT * FROM flashcards WHERE id=$1 AND student_id=$2 FOR UPDATE',[id,studentId]);const card=result.rows[0];
   if(!card)throw new SecurityError(404,'Flashcard not found.');if(card.edit_version!==data.version)throw new SecurityError(409,'This card was edited elsewhere. Reload the library before editing again.');
   const duplicate=await client.query("SELECT id FROM flashcards WHERE student_id=$1 AND id<>$2 AND subject=$3 AND source_material_id IS NOT DISTINCT FROM $4 AND regexp_replace(trim(question),'\\s+',' ','g')=regexp_replace(trim($5),'\\s+',' ','g') LIMIT 1",[studentId,id,card.subject,card.source_material_id,data.question]);
   if(duplicate.rows.length)throw new SecurityError(409,'This question already exists in this deck.');
   const updated=await client.query('UPDATE flashcards SET question=$3,answer=$4,user_edited=true,edit_version=edit_version+1 WHERE id=$1 AND student_id=$2 RETURNING *',[id,studentId,data.question,data.answer]);
   await client.query('COMMIT');return updated.rows[0];
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
};
