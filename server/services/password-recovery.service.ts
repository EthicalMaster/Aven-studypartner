import {createHmac,randomInt,timingSafeEqual} from 'node:crypto';
import type {PoolClient} from 'pg';
import {getRequiredPool} from '../db/connection.js';
import {hashPassword,verifyPassword} from '../utils/crypto.js';
import {securityMail} from './security-mail.service.js';
export class SecurityError extends Error {constructor(public status:number,message:string){super(message);}}
function digest(value:string){const secret=process.env.RECOVERY_HMAC_SECRET;if(!secret||secret.length<32)throw new SecurityError(503,'Password recovery is not configured yet.');return createHmac('sha256',secret).update(value).digest('hex');}
async function allowance(client:Pick<PoolClient,'query'>,userId:string){
 const result=await client.query("SELECT COUNT(*)::int AS used, MIN(changed_at)+INTERVAL '30 days' AS next_available FROM password_change_events WHERE user_id=$1 AND changed_at>NOW()-INTERVAL '30 days'",[userId]);return {remaining:Math.max(0,2-result.rows[0].used),nextAvailable:result.rows[0].used>=2?result.rows[0].next_available:null};
}
async function change(client:PoolClient,user:any,password:string,method:'otp'|'current_password'){
 if(!(await allowance(client,user.id)).remaining)throw new SecurityError(429,'Two passwords have already been changed in the last 30 days. Check Settings for the next available date.');
 if(user.password_hash && await verifyPassword(user.password_hash,password))throw new SecurityError(400,'Choose a password different from your current password.');
 const hash=await hashPassword(password);
 await client.query('UPDATE users SET password_hash=$2 WHERE id=$1',[user.id,hash]);
 await client.query('INSERT INTO password_change_events(user_id,method) VALUES($1,$2)',[user.id,method]);
 await client.query('UPDATE password_recovery_codes SET consumed_at=NOW() WHERE user_id=$1',[user.id]);
 await client.query('UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL',[user.id]);
}
function notify(email:string){if(securityMail.configured())void securityMail.send(email,'Your Aven password changed','Your Aven password was changed and all sessions were signed out. If this was not you, secure your email account and contact the Aven operator for account recovery.').catch(()=>console.warn('[Security] Password-change notification delivery failed.'));}
export const passwordRecoveryService={
 allowance(userId:string){return allowance(getRequiredPool(),userId);},
 // Database-backed fixed windows survive server restarts. IP keys are HMACs, never raw addresses.
 async admit(key:string,limit:number,seconds:number){
  const result=await getRequiredPool().query(`INSERT INTO recovery_rate_limits(key,count,expires_at) VALUES($1,1,NOW()+$3*INTERVAL '1 second')
   ON CONFLICT(key) DO UPDATE SET count=CASE WHEN recovery_rate_limits.expires_at<=NOW() THEN 1 ELSE recovery_rate_limits.count+1 END,
   expires_at=CASE WHEN recovery_rate_limits.expires_at<=NOW() THEN NOW()+$3*INTERVAL '1 second' ELSE recovery_rate_limits.expires_at END
   WHERE recovery_rate_limits.expires_at<=NOW() OR recovery_rate_limits.count<$2 RETURNING count`,[digest(key),limit,seconds]);return result.rows.length>0;
 },
 async request(email:string){
  if(!securityMail.configured())throw new SecurityError(503,'Password recovery is not configured yet.');
  if(!await this.admit(`email-minute:${email}`,1,60)||!await this.admit(`email-day:${email}`,5,86400))return;
  const client=await getRequiredPool().connect();let code='',userId='';
  try{await client.query('BEGIN');const result=await client.query('SELECT id FROM users WHERE LOWER(email)=$1 AND is_active=true FOR UPDATE',[email]);
   if(result.rows[0]&&(await allowance(client,result.rows[0].id)).remaining){userId=result.rows[0].id;code=randomInt(0,1000000).toString().padStart(6,'0');
    await client.query(`INSERT INTO password_recovery_codes(user_id,code_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes') ON CONFLICT(user_id) DO UPDATE SET code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,attempts=0,consumed_at=NULL,created_at=NOW()`,[userId,digest(`${userId}:${code}`)]);
   }await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  if(code){try{await securityMail.send(email,'Your Aven password reset code',`Your Aven code is ${code}. It expires in 10 minutes. Only the latest code works. Never share it. If you did not request this, ignore this email. Sending a code does not use your password-change allowance.`);}catch(error){await getRequiredPool().query('UPDATE password_recovery_codes SET consumed_at=NOW() WHERE user_id=$1 AND code_hash=$2',[userId,digest(`${userId}:${code}`)]);throw error;}}
 },
 async complete(email:string,code:string,password:string){
  const client=await getRequiredPool().connect();let changedEmail='';
  try{await client.query('BEGIN');const users=await client.query('SELECT id,email,password_hash FROM users WHERE LOWER(email)=$1 AND is_active=true FOR UPDATE',[email]);const user=users.rows[0];
   const codes=user?await client.query('SELECT *,expires_at>NOW() AS valid FROM password_recovery_codes WHERE user_id=$1 FOR UPDATE',[user.id]):{rows:[]};const row=codes.rows[0];
   const expected=digest(`${user?.id||'missing'}:${code}`);
   const valid=row&&row.valid&&!row.consumed_at&&row.attempts<5&&timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(expected,'hex'));
   if(!valid){if(row&&!row.consumed_at)await client.query('UPDATE password_recovery_codes SET attempts=LEAST(attempts+1,5) WHERE user_id=$1',[user.id]);await client.query('COMMIT');throw new SecurityError(400,'Invalid or expired code. Request a new code if needed.');}
   await change(client,user,password,'otp');await client.query('COMMIT');changedEmail=user.email;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}notify(changedEmail);
 },
 async changeSignedIn(userId:string,current:string,password:string){
  const client=await getRequiredPool().connect();let email='';try{await client.query('BEGIN');const result=await client.query('SELECT id,email,password_hash FROM users WHERE id=$1 AND is_active=true FOR UPDATE',[userId]);const user=result.rows[0];
   if(!user?.password_hash||!await verifyPassword(user.password_hash,current))throw new SecurityError(400,'Current password is incorrect.');
   await change(client,user,password,'current_password');await client.query('COMMIT');email=user.email;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}notify(email);
 }
};
