import React,{useEffect,useState} from 'react';
import {settingsRequest,fieldClass,actionClass} from '../settings/settingsApi';
export function PasswordRecovery({onBack}:{onBack:()=>void}){
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 const [sent,setSent]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [available,setAvailable]=useState<boolean|null>(null);
 useEffect(()=>{let active=true;settingsRequest<{available:boolean}>('/api/auth/recovery/status').then(r=>{if(active)setAvailable(r.available);}).catch(()=>{if(active)setError('Could not check email recovery. Please try again later.');});return()=>{active=false;};},[]);
 async function send(){setBusy(true);setError('');try{const r=await settingsRequest<{message:string}>('/api/auth/recovery/request','POST',{email:email.trim().toLowerCase()});setSent(true);setNotice(r.message);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function submit(e:React.FormEvent){e.preventDefault();if(!sent){await send();return;}if(password!==confirmation){setError('Passwords do not match.');return;}setBusy(true);setError('');try{await settingsRequest('/api/auth/recovery/complete','POST',{email:email.trim().toLowerCase(),code,password});setDone(true);setPassword('');setConfirmation('');setCode('');setNotice('Password changed. All sessions were signed out. Sign in with your new password.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="space-y-4"><h2 className="text-2xl font-semibold">A fresh start.</h2><p className="text-sm">Reset your password with an email code. You can change it twice in any 30 days. Requesting a code does not count.</p>
 {available===false&&<p role="status">Email recovery is not available yet. The Aven operator needs to configure the email sender.</p>}
 {available===null&&!error&&<p role="status">Checking recovery availability…</p>}
 {!done&&<form onSubmit={submit}><fieldset disabled={busy||available!==true} className="space-y-4"><label className="block text-sm">Recovery email<input type="email" autoComplete="email" required maxLength={255} className={fieldClass} value={email} readOnly={sent} onChange={e=>setEmail(e.target.value)}/></label>
 {sent&&<><label className="block text-sm">Email code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className={fieldClass} value={code} onChange={e=>setCode(e.target.value)}/></label><label className="block text-sm">New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required className={fieldClass} value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="block text-sm">Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required className={fieldClass} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label></>}
 <button className={actionClass}>{busy?'Please wait…':sent?'Reset password':'Send reset code'}</button>
 {sent&&<div className="flex gap-4 text-sm"><button type="button" onClick={send} className="underline">Resend code</button><button type="button" onClick={()=>{setSent(false);setCode('');setNotice('');}} className="underline">Use another email</button></div>}</fieldset></form>}
 {error&&<p role="alert" className="text-red-700 text-sm">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}
 <button type="button" disabled={busy} className="underline text-sm" onClick={onBack}>Back to sign in</button></div>;
}
