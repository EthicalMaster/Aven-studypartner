import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {setPoolForTesting} from '../db/connection.js';
import {flashcardDraftService as drafts} from '../services/flashcard-draft.service.js';
import {flashcardService} from '../services/flashcard.service.js';
import {flashcardRepository} from '../repositories/flashcard.repository.js';
import {materialRepository} from '../repositories/material.repository.js';
import {documentRepository} from '../repositories/document.repository.js';
import {aiGatewayService} from '../services/ai/gateway.service.js';
const db=await PGlite.create(),student='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',material='00000000-0000-4000-8000-000000000003';
let fail=false,calls=0;
const query=async(sql:string,args?:any[])=>{
 if(sql.includes('pg_try_advisory_lock'))return {rows:[{acquired:true}]};
 if(sql.includes('pg_advisory_unlock'))return {rows:[{}]};
 if(fail&&sql.startsWith('UPDATE flashcard_generation_drafts SET committed_ids'))throw new Error('injected failure');
 return db.query(sql,args);
};
try{
 setPoolForTesting({query,connect:async()=>({query,release(){}})});
 for(const name of ['001_initial_schema.sql','014_intelligent_flashcards_system.sql','022_flashcard_drafts.sql'])await db.exec(readFileSync(new URL(`../db/migrations/${name}`,import.meta.url),'utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";',''));
 await db.exec(`INSERT INTO users(id,email,password_hash) VALUES('${student}','a@test.local','x'),('${other}','b@test.local','x');
 INSERT INTO student_profiles(id,user_id,full_name) VALUES('${student}','${student}','A'),('${other}','${other}','B');
 INSERT INTO study_materials(id,student_id,filename,file_type,file_size_bytes,storage_location,subject,topic) VALUES('${material}','${student}','Physics','pdf',1,'private','Physics','Energy');
 ALTER TABLE study_materials ADD COLUMN title TEXT;`);
 const evidence='In a closed system total energy is conserved, although it can change form. Energy can be transferred through heat or work.';
 materialRepository.getMaterialById=async(id,s)=>s===student&&id===material?({id,title:'Physics',topic:'Energy'} as any):null;
 documentRepository.getChunksByMaterial=async()=>[{} as any];documentRepository.getPagesByMaterial=async()=>[{page_number:1,text:evidence} as any];
 (aiGatewayService as any).executeStructured=async()=>{calls++;return {data:{flashcards:[
 {question:'What happens to total energy in a closed system?',answer:'It is conserved.',keyConcept:'Energy',formula:'',difficulty:'easy',sourceId:'p1',evidence},
 {question:'How can energy be transferred?',answer:'Through heat or work.',keyConcept:'Energy transfer',formula:'',difficulty:'easy',sourceId:'p1',evidence}]}};};
 const first=await flashcardService.generateFromMaterial(material,student,{level:'school',authority:'CBSE',stage:'Class 10',subject:'P'.repeat(120)},true);
 assert(first.draft);assert.equal(first.cards.length,0);assert.equal(calls,1);assert.equal((await flashcardRepository.getFlashcards(student)).total,0);
 const second=await flashcardService.generateFromMaterial(material,student,undefined,true);assert.equal(second.draft?.id,first.draft.id);assert(second.reused);assert.equal(calls,1);
 assert.equal((await flashcardRepository.getStudyMaterialDecks(student))[0].hasDraft,true);
 assert.equal(await drafts.get(other,material),null);
 const edits=first.draft.cards.map(({page,evidence,...card})=>card);
 await assert.rejects(()=>drafts.commit(other,first.draft!.id,{cards:edits}),/Draft not found/);
 await assert.rejects(()=>drafts.commit(student,first.draft!.id,{cards:[{...edits[0],evidence:'fabricated'}]}));
 await assert.rejects(()=>drafts.commit(student,first.draft!.id,{cards:[edits[0],{...edits[1],question:edits[0].question}]}),/same question/);
 assert.equal((await flashcardRepository.getFlashcards(student)).total,0);
 fail=true;await assert.rejects(()=>drafts.commit(student,first.draft!.id,{cards:edits}),/injected/);fail=false;
 assert.equal((await flashcardRepository.getFlashcards(student)).total,0);assert(await drafts.get(student,material));
 const saved=await drafts.commit(student,first.draft.id,{cards:[{...edits[0],answer:'Total energy remains constant.',keyConcept:'K'.repeat(160)}]});assert.equal(saved.ids.length,1);
 const card=await flashcardRepository.getFlashcardById(saved.ids[0],student);assert.equal(card?.source_evidence,evidence);assert.equal(card?.source_page,1);assert.equal(card?.user_edited,true);assert.equal(card?.answer,'Total energy remains constant.');
 await db.query('UPDATE flashcards SET repetitions=4, mastery_state=$2 WHERE id=$1',[card!.id,'mastered']);
 const retry=await drafts.commit(student,first.draft.id,{cards:edits});assert(retry.reused);assert.deepEqual(retry.ids,saved.ids);
 assert.equal((await flashcardRepository.getFlashcardById(card!.id,student))?.repetitions,4);assert.equal((await flashcardRepository.getFlashcards(student)).total,1);
 const reopened=await flashcardService.generateFromMaterial(material,student,undefined,true);assert.equal(reopened.cards.length,1);assert.equal(reopened.cards[0].mastery_state,'mastered');assert.equal(calls,1);
 assert.equal((await flashcardRepository.getStudyMaterialDecks(student))[0].hasDraft,false);
 await db.query('DELETE FROM study_materials WHERE id=$1',[material]);assert.equal(await drafts.get(student,material),null);assert.equal((await flashcardRepository.getFlashcardById(card!.id,student))?.source_evidence,evidence);
 console.log('PASS: generated drafts do not enter deck; draft resume costs no AI; tenant isolation; strict immutable evidence; selected-only saving; duplicate rejection; complete rollback; idempotent save retry; stored source and edit flag; existing mastery retained; pending badges; material deletion preserves saved source snapshot. Real PGlite SQL, mocked AI and advisory lock.');
}finally{setPoolForTesting(null);await db.close();}
