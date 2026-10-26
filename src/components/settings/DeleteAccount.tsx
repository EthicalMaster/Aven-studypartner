import React,{useState} from 'react';
import {settingsRequest,fieldClass,panelClass} from './settingsApi';
export function DeleteAccount(){
 const [open,setOpen]=useState(false),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await settingsRequest('/api/auth/account','DELETE',{password,confirmation});setPassword('');setDone(true);window.location.replace('/?accountDeleted=1');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className={panelClass} id="delete-account"><h2 className="text-xl font-semibold">Delete your account</h2>
 {done?<div role="status"><p>Your account and linked database records are deleted. Uploaded files are queued for permanent removal and retry automatically if storage is unavailable.</p><a className="underline block mt-3" href="/">Return to Aven</a></div>:<>
 <p className="text-sm text-[var(--aven-muted)]">Permanently remove your profile, PDFs, extracted text, vectors, saved learning content, results and sessions. Anonymous usage totals remain. This cannot be undone.</p>
 <p className="text-xs text-[var(--aven-muted)]">Files are removed by a retryable cleanup process. Provider logs and existing backups follow their retention policies; deletion does not instantly erase those external copies.</p>
 {!open?<button className="rounded-xl border border-red-700 text-red-700 px-4 py-2" onClick={()=>setOpen(true)}>Delete my account</button>:<form onSubmit={submit} className="space-y-3"><fieldset disabled={busy} className="space-y-3">
 <label className="block text-sm">Current password<input className={fieldClass} type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/></label>
 <label className="block text-sm">Type DELETE to confirm<input className={fieldClass} required value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/></label>
 <div className="flex flex-wrap gap-3"><button disabled={confirmation!=='DELETE'||!password} className="rounded-xl bg-red-700 text-white px-4 py-2 disabled:opacity-50">{busy?'Deleting account…':'Permanently delete account'}</button><button type="button" className="rounded-xl border px-4 py-2" onClick={()=>{setOpen(false);setPassword('');setConfirmation('');setError('');}}>Cancel</button></div></fieldset>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</form>}</>}
 </section>;
}
