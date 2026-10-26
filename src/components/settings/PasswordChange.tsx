import React,{useEffect,useState} from 'react';
import {useAuth} from '../../context/AuthContext';
import {settingsRequest,fieldClass,actionClass} from './settingsApi';
export function PasswordChange(){
 const {refreshUser}=useAuth();const [allowance,setAllowance]=useState<{remaining:number;nextAvailable:string|null}|null>(null);
 const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;settingsRequest<{remaining:number;nextAvailable:string|null}>('/api/auth/password/allowance').then(r=>{if(active)setAllowance(r);}).catch(()=>{if(active)setError('Could not load password allowance.');});return()=>{active=false;};},[]);
 async function save(e:React.FormEvent){e.preventDefault();setError('');if(password!==confirmation){setError('Passwords do not match.');return;}setBusy(true);try{await settingsRequest('/api/auth/password/change','POST',{currentPassword:current,password});setCurrent('');setPassword('');setConfirmation('');await refreshUser();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="space-y-3"><p className="text-sm">Two successful password changes per rolling 30 days, including email resets. Changing your password signs out every session.</p>
 {allowance&&<p className="text-sm" role="status">{allowance.remaining} changes remaining.{allowance.nextAvailable&&` Next available: ${new Date(allowance.nextAvailable).toLocaleString()}.`}</p>}
 <form onSubmit={save}><fieldset disabled={busy||!allowance||allowance.remaining===0} className="space-y-3">{[['Current password',current,setCurrent,'current-password'],['New password',password,setPassword,'new-password'],['Confirm new password',confirmation,setConfirmation,'new-password']].map(([label,value,setter,auto])=><label className="block text-sm" key={label as string}>{label as string}<input type="password" autoComplete={auto as string} required minLength={auto==='current-password'?1:8} maxLength={128} className={fieldClass} value={value as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)}/></label>)}<button className={actionClass}>{busy?'Changing password…':'Change password & sign out'}</button></fieldset></form>
 {error&&<p role="alert" className="text-red-700 text-sm">{error}</p>}</div>;
}
