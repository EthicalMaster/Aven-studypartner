import {getRequiredPool} from '../db/connection.js';
import {curriculumManifestSchema} from '../../shared/curriculum-catalog.js';
export const curriculumCatalogService={
 async list(){return (await getRequiredPool().query(`SELECT c.id,c.level,c.authority,c.program,c.stage,c.curriculum_version,c.source_url,COUNT(p.question_id)::int AS question_count FROM curriculum_contexts c JOIN curriculum_question_placements p ON p.context_id=c.id WHERE c.published GROUP BY c.id ORDER BY c.level,c.authority,c.program,c.stage`)).rows;},
 async publish(input:unknown,apply=false){
  const data=curriculumManifestSchema.parse(input);const client=await getRequiredPool().connect();
  try{await client.query('BEGIN');
   const found=await client.query('SELECT id FROM question_bank WHERE id=ANY($1::uuid[])',[data.placements.map(p=>p.questionId)]);
   if(found.rows.length!==data.placements.length)throw new Error('One or more question IDs do not exist. Nothing was changed.');
   if(data.id){const existing=await client.query('SELECT id FROM curriculum_contexts WHERE id=$1',[data.id]);if(!existing.rows.length)throw new Error('Context ID not found.');}
   if(!apply){await client.query('ROLLBACK');return {applied:false,questions:found.rows.length};}
   // Existing contexts require their explicit ID; collisions fail rather than silently replacing a catalog.
   let id=data.id;
   if(id){const existing=await client.query('SELECT id FROM curriculum_contexts WHERE id=$1 FOR UPDATE',[id]);if(!existing.rows.length)throw new Error('Context ID not found.');
    await client.query('UPDATE curriculum_contexts SET level=$2,authority=$3,program=$4,stage=$5,curriculum_version=$6,source_url=$7,review_note=$8,reviewed_by=$9,published=true,updated_at=NOW() WHERE id=$1',[id,data.level,data.authority,data.program,data.stage,data.curriculumVersion,data.sourceUrl,data.reviewNote,data.reviewedBy]);
   }else{id=(await client.query('INSERT INTO curriculum_contexts(level,authority,program,stage,curriculum_version,source_url,review_note,reviewed_by,published) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id',[data.level,data.authority,data.program,data.stage,data.curriculumVersion,data.sourceUrl,data.reviewNote,data.reviewedBy])).rows[0].id;}
   await client.query('DELETE FROM curriculum_question_placements WHERE context_id=$1',[id]);
   for(const p of data.placements)await client.query('INSERT INTO curriculum_question_placements(context_id,question_id,unit,source_url,review_note) VALUES($1,$2,$3,$4,$5)',[id,p.questionId,p.unit,p.sourceUrl,p.reviewNote]);
   await client.query('COMMIT');return {applied:true,id,questions:found.rows.length};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
};
