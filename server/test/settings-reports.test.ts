import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import express from 'express';
import cookieParser from 'cookie-parser';
import {setPoolForTesting} from '../db/connection.js';
import {authRouter} from '../routes/auth.routes.js';
import {quizRouter} from '../routes/quiz.routes.js';
import {hashSessionToken} from '../utils/crypto.js';
import {userRepository} from '../repositories/user.repository.js';
import {quizRepository} from '../repositories/quiz.repository.js';
import {quizSessionRepository} from '../repositories/quiz_session.repository.js';
import {scoringService} from '../services/scoring.service.js';
import {adaptiveModelService} from '../services/adaptive-model.service.js';
import {createQuizSchema} from '../utils/validation.js';
const db=await PGlite.create();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const app=express();app.use(express.json());app.use(cookieParser());app.use('/api/auth',authRouter);app.use('/api/quizzes',quizRouter);
let server:ReturnType<typeof app.listen>|undefined;
try{
 const query=(sql:string,args?:any[])=>db.query(sql,args);setPoolForTesting({query,connect:async()=>({query,release(){}})});userRepository.resetColumnCacheForTesting();
 for(const file of ['001_initial_schema.sql','002_authentication_sessions.sql','003_auth_compatibility.sql','004_education_profile.sql','006_quiz_engine.sql','012_academic_curriculum_and_onboarding.sql','019_academic_preferences.sql','023_question_reports.sql'])await db.exec(readFileSync(new URL(`../db/migrations/${file}`,import.meta.url),'utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";',''));
 await db.exec(`INSERT INTO users(id,email,password_hash) VALUES('${a}','a@example.test','x'),('${b}','b@example.test','x'); INSERT INTO student_profiles(id,user_id,full_name) VALUES('${a}','${a}','Student A'),('${b}','${b}','Student B')`);
 for(const [id,token] of [[a,'current-a'],[a,'other-a'],[b,'current-b']])await db.query("INSERT INTO user_sessions(user_id,session_token_hash,user_agent,expires_at) VALUES($1,$2,'Fixture browser',NOW()+INTERVAL '1 day')",[id,hashSessionToken(token)]);
 server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server!.once('listening',resolve));const address=server.address() as {port:number};
 async function request(path:string,token='current-a',method='GET',body?:unknown){const response=await fetch(`http://127.0.0.1:${address.port}${path}`,{method,headers:{Cookie:`edumate_session=${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json() as any};}
 assert.equal((await request('/api/auth/sessions','invalid')).status,401);
 const sessions=await request('/api/auth/sessions');assert.equal(sessions.data.sessions.length,2);assert.equal(sessions.data.sessions.filter((s:any)=>s.current).length,1);assert(!JSON.stringify(sessions.data).includes('session_token_hash'));assert(!JSON.stringify(sessions.data).includes('current-a'));
 const profile=await request('/api/auth/profile','current-a','PATCH',{full_name:'Updated Learner',institution:null,education_level:'School',academic_stage:'Class 10',program:null,stream:null});assert.equal(profile.status,200);assert.equal((await request('/api/auth/me')).data.user.profile.full_name,'Updated Learner');assert.equal((await request('/api/auth/me','current-b')).data.user.profile.full_name,'Student B');
 const prefs={level:'school',authority:'CBSE',stage:'Class 10'};assert.equal((await request('/api/auth/academic-preferences','current-a','PUT',prefs)).status,200);assert.deepEqual((await request('/api/auth/academic-preferences')).data.preferences,prefs);assert.equal((await request('/api/auth/academic-preferences','current-b')).data.preferences,null);
 await request('/api/auth/academic-preferences','current-a','DELETE');assert.equal((await request('/api/auth/academic-preferences')).data.preferences,null);
 assert.equal((await request('/api/auth/sessions/revoke-others','current-a','POST',{})).data.revoked,1);
 assert.equal((await request('/api/auth/sessions','other-a')).status,401);assert.equal((await request('/api/auth/sessions','current-b')).status,200);assert.equal((await request('/api/auth/sessions')).data.sessions.length,1);
 const input=createQuizSchema.parse({title:'Fixture paper',subject:'Physics',topic:'Energy',question_count:5,time_limit_minutes:10,custom_questions:Array.from({length:5},(_,i)=>({question_text:`Question ${i}`,question_type:'MCQ',options:[{id:'a',text:'Correct'},{id:'b',text:'Other'}],correct_option_ids:['a'],explanation:'Fixture explanation'}))});
 const paper=await quizRepository.createQuiz(a,input);const session=await quizSessionRepository.createSession(a,paper.quiz.id);
 const report={sessionId:session.id,questionId:paper.questions[0].id,reason:'incorrect_answer',note:'The source appears to support the other option.'};
 assert.equal((await request('/api/quizzes/question-reports','current-a','POST',report)).status,404); // active session
 adaptiveModelService.recordQuizSubmission=async()=>undefined as any;
 await quizSessionRepository.saveAnswer(session.id,a,{question_id:paper.questions[0].id,selected_option_ids:['a'],time_spent_seconds:1});
 const scored=await scoringService.submitAndScoreSession(session.id,a,'manual_submit');
 assert.equal((await request('/api/quizzes/question-reports','current-b','POST',report)).status,404);
 assert.equal((await request('/api/quizzes/question-reports','current-a','POST',{...report,studentId:b})).status,400);
 assert.equal((await request('/api/quizzes/question-reports','current-a','POST',{...report,note:'x'})).status,400);
 const first=await request('/api/quizzes/question-reports','current-a','POST',report);assert.equal(first.status,200);assert.equal(first.data.report.status,'pending_review');
 const second=await request('/api/quizzes/question-reports','current-a','POST',{...report,note:'Please compare the source definition on page 2.'});assert.equal(second.data.report.id,first.data.report.id);
 const mine=await request('/api/quizzes/reports/mine');assert.equal(mine.data.reports.length,1);assert.equal(mine.data.reports[0].note,'Please compare the source definition on page 2.');assert(!JSON.stringify(mine.data).includes('correct_option_ids'));
 assert.equal((await request('/api/quizzes/reports/mine','current-b')).data.reports.length,0);
 assert.equal((await scoringService.getDetailedResult(session.id,a)).result.percentage,scored.result.percentage);
 console.log('PASS: HTTP auth enforcement, profile persistence/isolation, saved defaults/forget, session list sanitization, revoke others preserves current and unrelated user, report only completed owned questions, strict payload, duplicate update, private report list and unchanged score. Real PGlite SQL and Express routes; no external AI.');
}finally{server?.close();setPoolForTesting(null);await db.close();}
