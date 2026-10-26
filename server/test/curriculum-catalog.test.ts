import express from 'express';
import cookieParser from 'cookie-parser';
import {quizRouter} from '../routes/quiz.routes.js';
import {hashSessionToken} from '../utils/crypto.js';
import {userRepository} from '../repositories/user.repository.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {setPoolForTesting} from '../db/connection.js';
import {curriculumCatalogService as catalog} from '../services/curriculum-catalog.service.js';
import {quizRepository} from '../repositories/quiz.repository.js';
import {createQuizSchema} from '../utils/validation.js';
const db=await PGlite.create();const student='00000000-0000-4000-8000-000000000001';
let server:ReturnType<typeof app.listen>|undefined;const app=express();app.use(express.json());app.use(cookieParser());app.use('/api/quizzes',quizRouter);
try{
 const query=(sql:string,args?:any[])=>db.query(sql,args);setPoolForTesting({query,connect:async()=>({query,release(){}})});
 for(const name of ['001_initial_schema.sql','002_authentication_sessions.sql','003_auth_compatibility.sql','004_education_profile.sql','006_quiz_engine.sql','012_academic_curriculum_and_onboarding.sql','025_curriculum_catalog.sql'])await db.exec(readFileSync(new URL(`../db/migrations/${name}`,import.meta.url),'utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";',''));
 await db.query("INSERT INTO users(id,email,password_hash) VALUES($1,'test@example.test','x')",[student]);await db.query("INSERT INTO student_profiles(id,user_id,full_name) VALUES($1,$1,'Fixture')",[student]);
 await db.query("INSERT INTO user_sessions(user_id,session_token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[student,hashSessionToken('fixture')]);userRepository.resetColumnCacheForTesting();
 server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server!.once('listening',resolve));const port=(server.address() as {port:number}).port;
 async function http(path:string,token='fixture'){const r=await fetch(`http://127.0.0.1:${port}/api/quizzes${path}`,{headers:{Cookie:`edumate_session=${token}`}});return {status:r.status,data:await r.json() as any};}
 assert.equal((await http('/bank/catalog','bad')).status,401);assert.equal((await http('/bank/meta?curriculum_context_id=bad')).status,400);
 const ids:string[]=[];for(let i=0;i<6;i++)ids.push((await db.query<any>(`INSERT INTO question_bank(subject,topic,question_type,question_text,options,correct_option_ids,explanation) VALUES('Physics','Energy','MCQ',$1,'[{"id":"a","text":"Energy"},{"id":"b","text":"Other"}]','["a"]','Energy is conserved.') RETURNING id`,[`Fixture question ${i}`])).rows[0].id);
 const manifest={level:'school',authority:'Fixture board',stage:'Class 10',curriculumVersion:'Test-only 2026',sourceUrl:'https://example.edu/syllabus',reviewNote:'Synthetic test mapping, not real curriculum.',reviewedBy:'Test reviewer',placements:ids.slice(0,5).map(questionId=>({questionId,unit:'Energy',sourceUrl:'https://example.edu/syllabus',reviewNote:'Synthetic matching fixture only.'}))};
 assert.equal(await quizRepository.countAvailableQuestions({subject:'Physics',allowed_topics:[]}),0);
 assert.equal((await catalog.publish(manifest)).applied,false);assert.equal((await catalog.list()).length,0);
 await assert.rejects(()=>catalog.publish({...manifest,placements:[...manifest.placements,manifest.placements[0]]},true));
 await assert.rejects(()=>catalog.publish({...manifest,placements:[{...manifest.placements[0],questionId:student}]},true),/do not exist/);
 const published=await catalog.publish(manifest,true);const contextId=published.id;assert(contextId);assert.equal((await catalog.list())[0].question_count,5);assert.equal((await http('/bank/catalog')).data.contexts.length,1);assert.equal((await http(`/bank/count?subject=Physics&curriculum_context_id=${contextId}`)).data.available,5);
 assert.equal((await quizRepository.getQuestionBankMetadata()).subjects[0].total_questions,6);assert.equal((await quizRepository.getQuestionBankMetadata(contextId)).subjects[0].total_questions,5);
 assert.equal(await quizRepository.countAvailableQuestions({subject:'Physics',curriculum_context_id:contextId}),5);assert.equal(await quizRepository.countAvailableQuestions({subject:'Mathematics',curriculum_context_id:contextId}),0);
 const input=createQuizSchema.parse({title:'Mapped fixture',subject:'Physics',topic:'Energy',question_count:5,time_limit_minutes:10,curriculum_context_id:contextId});
 const paper=await quizRepository.createQuiz(student,input);assert.equal(paper.questions.length,5);assert(!JSON.stringify(paper.questions).includes('correct_option_ids'));
 const snapshot=(await db.query<any>('SELECT curriculum_snapshot FROM quizzes WHERE id=$1',[paper.quiz.id])).rows[0].curriculum_snapshot;assert.equal(snapshot.authority,'Fixture board');assert.equal((await http(`/${paper.quiz.id}/curriculum`)).data.context.authority,'Fixture board');assert.equal((await http(`/${student}/curriculum`)).status,404);
 await catalog.publish({...manifest,id:contextId,authority:'New fixture label'},true);assert.equal((await db.query<any>('SELECT curriculum_snapshot FROM quizzes WHERE id=$1',[paper.quiz.id])).rows[0].curriculum_snapshot.authority,'Fixture board');
 await db.query('UPDATE curriculum_contexts SET published=false WHERE id=$1',[contextId]);assert.equal((await catalog.list()).length,0);assert.equal(await quizRepository.countAvailableQuestions({subject:'Physics',curriculum_context_id:contextId}),0);
 await assert.rejects(()=>quizRepository.createQuiz(student,input),/unavailable/);assert.equal((await db.query<any>('SELECT COUNT(*)::int AS n FROM question_bank')).rows[0].n,6);assert.equal((await quizRepository.getQuizQuestions(paper.quiz.id)).length,5);
 console.log('PASS: dry-run no writes, validation/unknown IDs, publication, scoped metadata/count/build, safe answer payload, immutable paper context, withdrawn catalog, preserved bank/history. Real PGlite SQL; no AI or live data changes.');
}finally{server?.close();setPoolForTesting(null);await db.close();}
