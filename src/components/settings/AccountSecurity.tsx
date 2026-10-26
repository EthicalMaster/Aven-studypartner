import React,{useEffect,useState} from 'react';
import {settingsRequest,actionClass,panelClass} from './settingsApi';
interface Session {id:string;browser:string;current:boolean;created_at:string;last_seen_at:string;expires_at:string}
export function AccountSecurity(){
 const [sessions,setSessions]=useState<Session[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{let alive=true;settingsRequest<{sessions:Session[]}>('/api/auth/sessions').then(data=>{if(alive)setSessions(data.sessions);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
 async function revoke(){setBusy(true);setNotice('');setError('');try{const result=await settingsRequest<{revoked:number}>('/api/auth/sessions/revoke-others','POST',{});setSessions(previous=>previous.filter(s=>s.current));setNotice(`${result.revoked} other ${result.revoked===1?'session':'sessions'} signed out. This session stays active.`);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className={panelClass} id="security"><h2 className="text-xl font-semibold">Password & security</h2>
 <p className="text-sm text-[var(--aven-muted)]">Email OTP recovery and password changes are not available yet. They remain the next account-security phase.</p>
 <h3 className="font-semibold">Active sessions</h3><p className="text-xs text-[var(--aven-muted)]">Up to 20 recent active sessions. Browser labels are supplied by the device, not verified identities.</p>
 {loading?<p role="status">Loading sessions…</p>:<ul className="space-y-3">{sessions.map(session=><li key={session.id} className="rounded-xl bg-[var(--aven-canvas)] p-3 text-sm break-words"><strong>{session.current?'This session':'Other session'}</strong><p className="mt-1 text-xs break-all">{session.browser}</p><p className="mt-1 text-xs text-[var(--aven-muted)]">Last active: {new Date(session.last_seen_at).toLocaleString()}</p></li>)}</ul>}
 <button className={actionClass} disabled={busy||loading} onClick={revoke}>{busy?'Signing out…':'Sign out other sessions'}</button>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}</section>;
}
