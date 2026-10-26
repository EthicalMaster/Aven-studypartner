import {quotaService} from './governance/quota.service.js';
import {createHmac} from 'node:crypto';
import {getRequiredPool} from '../db/connection.js';
import {verifyPassword} from '../utils/crypto.js';
import {SecurityError} from './password-recovery.service.js';
import {storageService} from './storage.service.js';
import {aiTelemetryService} from './ai/telemetry.service.js';

export async function deleteAccount(userId:string,password:string){
 const client=await getRequiredPool().connect();let studentId:string|undefined;
 try{
  await client.query('BEGIN');
  const user=(await client.query('SELECT id,email,password_hash FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
  if(!user?.password_hash||!await verifyPassword(user.password_hash,password))throw new SecurityError(400,'Current password is incorrect.');
  // Lock the profile against concurrent child inserts before removing dependent records.
  studentId=(await client.query('SELECT id FROM student_profiles WHERE user_id=$1 FOR UPDATE',[userId])).rows[0]?.id;
  await client.query('DELETE FROM question_report_review_events WHERE reviewer_id=$1',[userId]);
  await client.query('UPDATE quiz_question_reports SET reviewer_note=NULL,reviewed_at=NULL,reviewed_by=NULL WHERE reviewed_by=$1',[userId]);
  if(studentId){
   // Explicit order handles historical RESTRICT references to quizzes.
   await client.query('DELETE FROM quiz_results WHERE student_id=$1 OR quiz_id IN(SELECT id FROM quizzes WHERE student_id=$1)',[studentId]);
   await client.query('DELETE FROM quiz_sessions WHERE student_id=$1 OR quiz_id IN(SELECT id FROM quizzes WHERE student_id=$1)',[studentId]);
  }
  const secret=process.env.RECOVERY_HMAC_SECRET;
  if(secret)for(const prefix of ['email-minute:','email-day:'])await client.query('DELETE FROM recovery_rate_limits WHERE key=$1',[createHmac('sha256',secret).update(prefix+user.email.toLowerCase()).digest('hex')]);
  await client.query('DELETE FROM users WHERE id=$1',[userId]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 if(studentId){aiTelemetryService.forgetStudent(studentId);quotaService.forgetStudent(studentId);}
 // Physical file cleanup is durable and retryable; it is not part of the DB transaction.
 return {deleted:true, message:'Account and linked database records deleted. Uploaded files are queued for permanent removal. Anonymous lifetime totals remain.'};
}
let cleanupRunning=false;
export async function drainStorageDeletions(){
 if(cleanupRunning)return;cleanupRunning=true;
 try{
  const pool=getRequiredPool();
  await pool.query('DELETE FROM recovery_rate_limits WHERE expires_at<NOW()');
  const rows=(await pool.query('SELECT storage_key FROM storage_deletion_queue WHERE next_attempt_at<=NOW() ORDER BY created_at LIMIT 25')).rows;
  for(const row of rows){try{
   if(!await storageService.delete(row.storage_key))throw Error('Storage cleanup failed');
   await pool.query('DELETE FROM storage_deletion_queue WHERE storage_key=$1',[row.storage_key]);
  }catch{await pool.query("UPDATE storage_deletion_queue SET attempts=attempts+1,next_attempt_at=NOW()+INTERVAL '5 minutes' WHERE storage_key=$1",[row.storage_key]);}}
 }finally{cleanupRunning=false;}
}
