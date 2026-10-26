import {quizRepository} from '../repositories/quiz.repository.js';
import {quizSessionRepository} from '../repositories/quiz_session.repository.js';
import {createQuizSchema} from '../utils/validation.js';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {vector} from '@electric-sql/pglite-pgvector';
import express from 'express';import cookieParser from 'cookie-parser';
import {setPoolForTesting} from '../db/connection.js';
import {hashPassword,hashSessionToken} from '../utils/crypto.js';
import {authRouter} from '../routes/auth.routes.js';
import {recordAiAccount,publicUsage} from '../services/public-usage.service.js';
import {drainStorageDeletions} from '../services/account-deletion.service.js';
import {storageService} from '../services/storage.service.js';
const db=await PGlite.create({extensions:{vector}});const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let server:ReturnType<typeof express.application.listen>|undefined;const originalDelete=storageService.delete;
try{
 const query=async(sql:string,args?:any[])=>{const r=await db.query(sql,args);return {rows:r.rows,rowCount:r.affectedRows};};setPoolForTesting({query,connect:async()=>({query,release(){}})});
 for(const file of readdirSync('server/db/migrations').filter(f=>/^\d+.*\.sql$/.test(f)&&!f.includes('_down')).sort())await db.exec(readFileSync('server/db/migrations/'+file,'utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";',''));
 const hash=await hashPassword('TestPassword123!');
 for(const n of [1,2]){await db.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[id(n),`person${n}@example.test`,hash]);await db.query('INSERT INTO student_profiles(id,user_id,full_name) VALUES($1,$1,$2)',[id(n),`Person ${n}`]);await db.query("INSERT INTO user_sessions(user_id,session_token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[id(n),hashSessionToken('token'+n)]);}
 await recordAiAccount(id(1));await recordAiAccount(id(1));assert.equal((await publicUsage()).aiAccounts,1);assert.equal((await publicUsage()).registeredAccounts,2);
 for(const n of [1,2])await db.query("INSERT INTO study_materials(id,student_id,filename,file_type,file_size_bytes,storage_location,storage_key,subject,topic) VALUES($1,$2,'private.pdf','pdf',10,$3::text,$3::text,'Physics','Energy')",[id(n+10),id(n),`file-${n}.pdf`]);
 await db.query("INSERT INTO document_chunks(id,material_id,chunk_index,text,page_start,page_end,character_count,token_estimate) VALUES($1,$2,0,'private passage',1,1,15,4)",[id(21),id(11)]);
 await db.query('INSERT INTO document_vectors(chunk_id,embedding) VALUES($1,$2)',[id(21),'['+Array.from({length:384},(_,i)=>i===0?1:0).join(',')+']']);
 const input=createQuizSchema.parse({title:'Delete fixture',subject:'Physics',topic:'Energy',question_count:5,time_limit_minutes:10,custom_questions:Array.from({length:5},(_,i)=>({question_text:`Question ${i}`,question_type:'MCQ',options:[{id:'a',text:'Correct'},{id:'b',text:'Other'}],correct_option_ids:['a'],explanation:'Fixture'}))});
 const paper=await quizRepository.createQuiz(id(1),input);await quizSessionRepository.createSession(id(1),paper.quiz.id);
 const app=express();app.use(express.json());app.use(cookieParser());app.use('/api/auth',authRouter);server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server!.once('listening',r));const port=(server.address() as any).port;
 const request=async(token:string,body:any)=>fetch(`http://127.0.0.1:${port}/api/auth/account`,{method:'DELETE',headers:{Cookie:`edumate_session=${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await request('invalid',{password:'TestPassword123!',confirmation:'DELETE'})).status,401);
 assert.equal((await request('token1',{password:'wrong',confirmation:'DELETE'})).status,400);
 assert.equal((await request('token1',{password:'TestPassword123!',confirmation:'wrong'})).status,400);
 storageService.delete=async()=>{throw Error('Mock storage outage');};
 assert.equal((await request('token1',{password:'TestPassword123!',confirmation:'DELETE'})).status,200);
 // Wait for route-triggered cleanup; durable row remains on provider failure.
 await new Promise(r=>setTimeout(r,50));
 for(const table of ['document_chunks','document_vectors','account_ai_usage','quizzes','quiz_questions','quiz_sessions'])assert.equal((await db.query<any>(`SELECT COUNT(*)::int AS n FROM ${table}`)).rows[0].n,0);
 assert.equal((await db.query<any>('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,1);
 assert.equal((await db.query<any>('SELECT COUNT(*)::int AS n FROM study_materials')).rows[0].n,1);
 assert.equal((await db.query<any>('SELECT storage_key FROM storage_deletion_queue')).rows[0].storage_key,'file-1.pdf');
 assert.equal((await publicUsage()).registeredAccounts,2);assert.equal((await publicUsage()).aiAccounts,1);assert.equal((await publicUsage()).active30Days,1);
 await recordAiAccount(id(1));assert.equal((await publicUsage()).aiAccounts,1,'Deleted identity must not return');
 assert.equal((await request('token1',{password:'TestPassword123!',confirmation:'DELETE'})).status,401);
 const removed:string[]=[];storageService.delete=async key=>{removed.push(key);return true;};await db.exec('UPDATE storage_deletion_queue SET next_attempt_at=NOW()');await drainStorageDeletions();assert.deepEqual(removed,['file-1.pdf']);assert.equal((await db.query<any>('SELECT COUNT(*)::int AS n FROM storage_deletion_queue')).rows[0].n,0);
 console.log('PASS: all migrations, authenticated deletion/password/confirmation, cascaded vectors and records, other account isolation, durable failed-storage retry, lifetime totals, unique AI counting and revoked sessions. Real SQL and HTTP; mocked file provider.');
}finally{server?.close();storageService.delete=originalDelete;setPoolForTesting(null);await db.close();}
