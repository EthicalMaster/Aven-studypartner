import {similarCardPairs} from '../../shared/card-overlap.js';
import {curriculumService} from '../services/curriculum.service.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import express from 'express';
import cookieParser from 'cookie-parser';
import {setPoolForTesting} from '../db/connection.js';
import {passwordRecoveryService as recovery} from '../services/password-recovery.service.js';
import {securityMail} from '../services/security-mail.service.js';
import {hashPassword,verifyPassword,hashSessionToken} from '../utils/crypto.js';
import {flashcardEditService} from '../services/flashcard-edit.service.js';
import {reportReviewRouter} from '../routes/report-review.routes.js';
import {authRouter} from '../routes/auth.routes.js';
import {flashcardRouter} from '../routes/flashcard.routes.js';
import {userRepository} from '../repositories/user.repository.js';
const db=await PGlite.create();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
let injectFailure=false,mailFailure=false;const mail:{to:string;subject:string;text:string}[]=[];
const originalSend=securityMail.send;
let lease=Promise.resolve();
const query=async(sql:string,args?:any[])=>{if(injectFailure&&sql.startsWith('INSERT INTO password_change_events'))throw new Error('injected transaction failure');return db.query(sql,args);};
// PGlite has a single SQL connection. Lease serializes transactions; it does not simulate PostgreSQL lock contention.
setPoolForTesting({query,connect:async()=>{const previous=lease;let release!:()=>void;lease=new Promise<void>(resolve=>release=resolve);await previous;return {query,release};}});
let server:ReturnType<typeof app.listen>|undefined;const app=express();app.use(express.json());app.use(cookieParser());app.use('/api/auth',authRouter);app.use('/api/report-review',reportReviewRouter);app.use('/api/flashcards',flashcardRouter);
try{
 assert.deepEqual(similarCardPairs([{question:'What is conserved in a closed system?',answer:'Total energy remains constant.'},{question:'What is conserved in a closed system?',answer:'Total energy remains constant.'}]),[[0,1]]);assert.deepEqual(similarCardPairs([{question:'What is mass?',answer:'Matter quantity.'},{question:'What does entropy measure?',answer:'Disorder.'}]),[]);
 for(const grade of [5,10,12]){const left=curriculumService.resolveCurriculum({education_level:'School',academic_stage:`Class ${grade}`});const right=curriculumService.resolveCurriculum({education_level:'School',academic_stage:`Grade ${grade}`});assert.deepEqual(left.eligibleSubjects,right.eligibleSubjects);assert.deepEqual(left.topicRestrictions,right.topicRestrictions);}
 for(const file of ['001_initial_schema.sql','002_authentication_sessions.sql','003_auth_compatibility.sql','004_education_profile.sql','006_quiz_engine.sql','012_academic_curriculum_and_onboarding.sql','014_intelligent_flashcards_system.sql','019_academic_preferences.sql','022_flashcard_drafts.sql','023_question_reports.sql','024_account_recovery_and_review.sql'])await db.exec(readFileSync(new URL(`../db/migrations/${file}`,import.meta.url),'utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";',''));
 process.env.RECOVERY_HMAC_SECRET='test-only-secret-long-enough-not-for-production';process.env.RESEND_API_KEY='test';process.env.SECURITY_EMAIL_FROM='test@example.test';
 securityMail.send=async(to,subject,text)=>{if(mailFailure)throw new Error('fake delivery failure');mail.push({to,subject,text});};
 const initial=await hashPassword('OriginalPassword1!');await db.query('INSERT INTO users(id,email,password_hash) VALUES($1,$3,$5),($2,$4,$5)',[a,b,'a@example.test','b@example.test',initial]);await db.query("INSERT INTO student_profiles(id,user_id,full_name) VALUES($1,$1,'A'),($2,$2,'B')",[a,b]);
 await db.query("INSERT INTO user_sessions(user_id,session_token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day'),($3,$4,NOW()+INTERVAL '1 day')",[a,hashSessionToken('a'),b,hashSessionToken('b')]);
 userRepository.resetColumnCacheForTesting();server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server!.once('listening',resolve));const port=(server.address() as {port:number}).port;
 async function request(path:string,token='a',method='GET',body?:unknown){const r=await fetch(`http://127.0.0.1:${port}${path}`,{method,headers:{Cookie:`edumate_session=${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json() as any};}
 assert.equal((await request('/api/report-review')).status,403);assert.equal((await request('/api/report-review','bad')).status,401);
 process.env.AVEN_REVIEWER_USER_IDS=b;assert.equal((await request('/api/report-review/access','b')).data.allowed,true);assert.equal((await request('/api/report-review','a')).status,403);
 const quiz=(await db.query<any>("INSERT INTO quizzes(student_id,title,subject,topic,question_count,time_limit_minutes,difficulty) VALUES($1,'Paper','Physics','Energy',5,10,'easy') RETURNING id",[a])).rows[0].id;
 const question=(await db.query<any>("INSERT INTO quiz_questions(quiz_id,question_text,question_type,options,correct_option_ids,explanation,question_order) VALUES($1,'What is conserved?','MCQ','[]','[]','Energy.',1) RETURNING id",[quiz])).rows[0].id;
 const session=(await db.query<any>("INSERT INTO quiz_sessions(quiz_id,student_id,status,start_time,server_deadline,time_limit_seconds) VALUES($1,$2,'submitted',NOW(),NOW()+INTERVAL '1 day',600) RETURNING id",[quiz,a])).rows[0].id;
 const report=(await db.query<any>("INSERT INTO quiz_question_reports(student_id,question_id,session_id,reason,note,question_snapshot) VALUES($1,$2,$3,'unclear_question','Please check this question.','{\"question\":\"What is conserved?\"}') RETURNING id",[a,question,session])).rows[0];
 await db.query("UPDATE quiz_question_reports SET updated_at='2026-10-26T00:00:00.123456Z' WHERE id=$1",[report.id]);
 const reports=await request('/api/report-review','b');const version=reports.data.reports[0].review_version;assert(version.includes('123456'));
 assert.equal((await request(`/api/report-review/${report.id}`,'a','PATCH',{status:'resolved',note:'This is a response.',version})).status,403);
 assert.equal((await request(`/api/report-review/${report.id}`,'b','PATCH',{status:'resolved',note:'Energy is conserved in a closed system.',version})).status,200);
 assert.equal((await request(`/api/report-review/${report.id}`,'b','PATCH',{status:'resolved',note:'Stale overwrite attempt.',version})).status,409);
 assert.equal((await db.query<any>('SELECT COUNT(*)::int AS count FROM question_report_review_events')).rows[0].count,1);
 const card=(await db.query<any>("INSERT INTO flashcards(student_id,subject,topic,question,answer,repetitions,mastery_state,source_evidence,source_page) VALUES($1,'Physics','Energy','What is energy?','Capacity for work.',7,'mastered','Energy is the capacity for work.',1) RETURNING *",[a])).rows[0];
 const edit={question:'How is energy defined?',answer:'The capacity for doing work.',version:0};
 assert.equal((await request(`/api/flashcards/${card.id}`,'b','PATCH',edit)).status,404);
 const edited=await request(`/api/flashcards/${card.id}`,'a','PATCH',edit);assert.equal(edited.status,200);assert.equal(edited.data.card.repetitions,7);assert.equal(edited.data.card.mastery_state,'mastered');assert.equal(edited.data.card.source_evidence,card.source_evidence);assert.equal(edited.data.card.edit_version,1);
 await assert.rejects(()=>flashcardEditService.update(a,card.id,edit),/elsewhere/);
 assert.equal((await request(`/api/flashcards/${card.id}`,'a','PATCH',{...edit,version:1,source_evidence:'fabricated'})).status,400);
 await recovery.request('missing@example.test');assert.equal(mail.length,0);
 await recovery.request('a@example.test');assert.equal(mail.length,1);const firstCode=mail[0].text.match(/\b\d{6}\b/)![0];
 const stored=(await db.query<any>('SELECT * FROM password_recovery_codes WHERE user_id=$1',[a])).rows[0];assert(!stored.code_hash.includes(firstCode));assert.equal((await recovery.allowance(a)).remaining,2);
 await recovery.request('a@example.test');assert.equal(mail.length,1); // resend cooldown
 for(let i=0;i<5;i++)await assert.rejects(()=>recovery.complete('a@example.test',firstCode==='000000'?'111111':'000000','NewPassword1!'),/Invalid/);
 await assert.rejects(()=>recovery.complete('a@example.test',firstCode,'NewPassword1!'),/Invalid/);
 assert.equal((await recovery.allowance(a)).remaining,2);
 await db.exec('DELETE FROM recovery_rate_limits');await recovery.request('a@example.test');const code=mail.at(-1)!.text.match(/\b\d{6}\b/)![0];
 await db.query("UPDATE password_recovery_codes SET expires_at=NOW()-INTERVAL '1 minute' WHERE user_id=$1",[a]);await assert.rejects(()=>recovery.complete('a@example.test',code,'NewPassword1!'),/Invalid/);
 await db.query("UPDATE password_recovery_codes SET expires_at=NOW()+INTERVAL '10 minutes',attempts=0 WHERE user_id=$1",[a]);
 injectFailure=true;await assert.rejects(()=>recovery.complete('a@example.test',code,'NewPassword1!'),/injected/);injectFailure=false;
 assert.equal((await recovery.allowance(a)).remaining,2);assert.equal((await db.query<any>('SELECT consumed_at FROM password_recovery_codes WHERE user_id=$1',[a])).rows[0].consumed_at,null);
 assert(await verifyPassword((await db.query<any>('SELECT password_hash FROM users WHERE id=$1',[a])).rows[0].password_hash,'OriginalPassword1!'));
 await recovery.complete('a@example.test',code,'NewPassword1!');assert.equal((await recovery.allowance(a)).remaining,1);assert.equal((await request('/api/auth/me')).status,401);assert.equal((await request('/api/auth/me','b')).status,200);
 await assert.rejects(()=>recovery.complete('a@example.test',code,'AnotherPassword1!'),/Invalid/);
 await assert.rejects(()=>recovery.changeSignedIn(a,'wrong','AnotherPassword1!'),/incorrect/);
 await assert.rejects(()=>recovery.changeSignedIn(a,'NewPassword1!','NewPassword1!'),/different/);
 await recovery.changeSignedIn(a,'NewPassword1!','AnotherPassword1!');assert.equal((await recovery.allowance(a)).remaining,0);assert((await recovery.allowance(a)).nextAvailable);
 await assert.rejects(()=>recovery.changeSignedIn(a,'AnotherPassword1!','ThirdPassword1!'),/Two passwords/);
 await db.query("UPDATE password_change_events SET changed_at=NOW()-INTERVAL '31 days' WHERE user_id=$1",[a]);assert.equal((await recovery.allowance(a)).remaining,2);
 await db.exec('DELETE FROM recovery_rate_limits');mailFailure=true;await assert.rejects(()=>recovery.request('b@example.test'),/delivery/);mailFailure=false;assert((await db.query<any>('SELECT consumed_at FROM password_recovery_codes WHERE user_id=$1',[b])).rows[0].consumed_at);
 assert(await recovery.admit('test-limit',2,3600));assert(await recovery.admit('test-limit',2,3600));assert.equal(await recovery.admit('test-limit',2,3600),false);
 const originalKey=process.env.RESEND_API_KEY;delete process.env.RESEND_API_KEY;assert.equal((await request('/api/auth/recovery/status')).data.available,false);assert.equal((await request('/api/auth/recovery/request','a','POST',{email:'a@example.test'})).status,503);process.env.RESEND_API_KEY=originalKey;
 // Exercise both HTTP email adapters without sending email, including shared budget enforcement.
 const network=globalThis.fetch;const sentRequests:any[]=[];
 try{globalThis.fetch=async(url,init)=>{sentRequests.push({url,body:JSON.parse(init!.body as string),headers:init!.headers});return new Response('{}',{status:200});};
  await db.exec('DELETE FROM recovery_rate_limits');
  await originalSend.call(securityMail,'a@example.test','Test','Body');assert.equal(sentRequests[0].url,'https://api.resend.com/emails');
  process.env.SECURITY_EMAIL_PROVIDER='brevo';process.env.BREVO_API_KEY='test-brevo';await originalSend.call(securityMail,'a@example.test','Test','Body');assert.equal(sentRequests[1].body.textContent,'Body');assert.equal(sentRequests[1].body.sender.email,'test@example.test');
  await db.query("UPDATE recovery_rate_limits SET count=90 WHERE key='security-mail-day'");await assert.rejects(()=>originalSend.call(securityMail,'a@example.test','Test','Body'),/allowance/);assert.equal(sentRequests.length,2);
 }finally{globalThis.fetch=network;delete process.env.SECURITY_EMAIL_PROVIDER;delete process.env.BREVO_API_KEY;}
 console.log('PASS: OTP expiry, guess lockout, resend cooldown, missing account, failure invalidation, rollback, successful-only rolling allowance, replay rejection, password reuse rejection, session revocation, durable rate counters; reviewer authorization/audit/stale-write protection; saved-card ownership/history/evidence/conflict checks. PGlite SQL, HTTP routes, mocked email.');
}finally{securityMail.send=originalSend;server?.close();setPoolForTesting(null);await db.close();}
