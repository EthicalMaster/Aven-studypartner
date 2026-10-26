import {getRequiredPool} from '../db/connection.js';
// No SDK or paid fallback. Never include provider response bodies in logs.
export const securityMail={
 configured(){if(!['resend','brevo'].includes(process.env.SECURITY_EMAIL_PROVIDER||'resend'))return false;return Boolean(((process.env.SECURITY_EMAIL_PROVIDER||'resend')==='brevo'?process.env.BREVO_API_KEY:process.env.RESEND_API_KEY) && process.env.SECURITY_EMAIL_FROM && (process.env.RECOVERY_HMAC_SECRET?.length||0)>=32);},
 async send(to:string,subject:string,text:string){
  if(!this.configured())throw new Error('Security email is not configured');
  for(const [key,limit,seconds] of [['security-mail-day',90,86400],['security-mail-month',2700,2592000]] as const){
   const reserved=await getRequiredPool().query(`INSERT INTO recovery_rate_limits(key,count,expires_at) VALUES($1,1,NOW()+$3*INTERVAL '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN recovery_rate_limits.expires_at<=NOW() THEN 1 ELSE recovery_rate_limits.count+1 END,expires_at=CASE WHEN recovery_rate_limits.expires_at<=NOW() THEN NOW()+$3*INTERVAL '1 second' ELSE recovery_rate_limits.expires_at END WHERE recovery_rate_limits.expires_at<=NOW() OR recovery_rate_limits.count<$2 RETURNING count`,[key,limit,seconds]);
   if(!reserved.rows.length)throw new Error('Security email allowance exhausted');
  }
  const brevo=process.env.SECURITY_EMAIL_PROVIDER==='brevo';
  const response=await fetch(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{
   method:'POST',signal:AbortSignal.timeout(10000),
   headers:brevo?{'api-key':process.env.BREVO_API_KEY!,'Content-Type':'application/json'}:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify(brevo?{sender:{email:process.env.SECURITY_EMAIL_FROM,name:'Aven'},to:[{email:to}],subject,textContent:text}:{from:process.env.SECURITY_EMAIL_FROM,to:[to],subject,text})});
  if(!response.ok)throw new Error('Security email delivery failed');
 }
};
