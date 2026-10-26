import React,{useState} from 'react';
import {useAuth} from '../../context/AuthContext';
import type {StudentUser} from '../../types';
import {EDUCATION_LEVELS,VALID_STAGES_BY_LEVEL} from '../../../server/utils/validation';
import {AcademicDefaults} from '../settings/AcademicDefaults';
import {AccountSecurity} from '../settings/AccountSecurity';
import {MyQuestionReports} from '../settings/MyQuestionReports';
import {settingsRequest,fieldClass,actionClass,panelClass} from '../settings/settingsApi';
interface Props {onOpenOnboarding?:()=>void}
export function SettingsView(props:Props){const {user}=useAuth();return user?<SettingsContent key={user.id} user={user} {...props}/>:<p role="status">Loading your account…</p>;}
function SettingsContent({user,onOpenOnboarding}:Props&{user:StudentUser}){
 const {refreshUser}=useAuth();const profile=user.profile;
 const [form,setForm]=useState({full_name:profile?.full_name||'',institution:profile?.institution||'',education_level:profile?.education_level||'Undergraduate / College',
 academic_stage:profile?.academic_stage||'Other',program:profile?.program||'',stream:profile?.stream||''});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [signingOut,setSigningOut]=useState(false),[accountError,setAccountError]=useState('');
 const stages=VALID_STAGES_BY_LEVEL[form.education_level]||['Other'];
 async function save(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');setNotice('');
 try {await settingsRequest('/api/auth/profile','PATCH',{...form,full_name:form.full_name.trim(),institution:form.institution.trim()||null,program:form.program.trim()||null,stream:form.stream.trim()||null});await refreshUser();setNotice('Profile saved. Your separate AI study defaults are unchanged.');}
 catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function signOut(){setSigningOut(true);setAccountError('');try{await settingsRequest('/api/auth/logout','POST',{});await refreshUser();}catch(e){setAccountError((e as Error).message);}finally{setSigningOut(false);}}
 return <div className="max-w-3xl mx-auto space-y-6 pb-12">
 <header><h1 className="aven-page-title">Make it your space.</h1><p className="mt-3 text-sm text-[var(--aven-muted)]">Manage your profile, study defaults, sessions and question feedback.</p></header>
 <nav aria-label="Settings sections" className="flex flex-wrap gap-3 text-sm text-[var(--aven-action)]">{[['profile','Profile'],['account','Account'],['study-defaults','Study defaults'],['security','Security'],['reports','Reports']].map(([id,label])=><a className="rounded-full border border-[var(--aven-border)] px-3 py-2" key={id} href={`#${id}`}>{label}</a>)}</nav>
 <section className={panelClass} id="profile"><h2 className="text-xl font-semibold">Profile & academic details</h2><p className="text-sm text-[var(--aven-muted)]">Your profile guides workspace suggestions and question-bank filters. Confirm the subject separately when working with a PDF.</p>
 <form onSubmit={save}><fieldset disabled={busy} className="space-y-4">
 <label className="block text-sm">Full name<input required minLength={2} maxLength={120} autoComplete="name" className={fieldClass} value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label>
 <label className="block text-sm">School / college / institution<input maxLength={150} className={fieldClass} value={form.institution} onChange={e=>setForm({...form,institution:e.target.value})}/></label>
 <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm">Education level<select aria-label="Education level" className={fieldClass} value={form.education_level} onChange={e=>setForm({...form,education_level:e.target.value,academic_stage:(VALID_STAGES_BY_LEVEL[e.target.value]||['Other'])[0]})}>{!EDUCATION_LEVELS.includes(form.education_level as any)&&<option>{form.education_level}</option>}{EDUCATION_LEVELS.map(value=><option key={value}>{value}</option>)}</select></label>
 <label className="block text-sm">Academic stage<select aria-label="Academic stage" className={fieldClass} value={form.academic_stage} onChange={e=>setForm({...form,academic_stage:e.target.value})}>{!stages.includes(form.academic_stage)&&<option>{form.academic_stage}</option>}{stages.map(value=><option key={value}>{value}</option>)}</select></label></div>
 <label className="block text-sm">Profile program / course<input maxLength={100} className={fieldClass} value={form.program} onChange={e=>setForm({...form,program:e.target.value})}/></label>
 <label className="block text-sm">Stream / specialization<input maxLength={100} className={fieldClass} value={form.stream} onChange={e=>setForm({...form,stream:e.target.value})}/></label>
 <button className={actionClass}>{busy?'Saving profile…':'Save profile'}</button>
 </fieldset></form>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}</section>
 <section className={panelClass} id="account"><h2 className="text-xl font-semibold">Account</h2>
 <dl className="text-sm space-y-3"><div><dt className="text-[var(--aven-muted)]">Sign-in email</dt><dd className="break-all">{user.email}</dd></div>{profile?.student_identifier&&<div><dt className="text-[var(--aven-muted)]">Learner ID</dt><dd>{profile.student_identifier}</dd></div>}</dl>
 <p className="text-xs text-[var(--aven-muted)]">Your email is read-only here. Email changes require a verification flow, which is not available yet.</p>
 <div className="flex flex-wrap gap-3">{onOpenOnboarding&&<button className="rounded-xl border px-4 py-2 text-sm" onClick={onOpenOnboarding}>Open study guide</button>}<button disabled={signingOut} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50" onClick={signOut}>{signingOut?'Signing out…':'Sign out this session'}</button></div>
 {accountError&&<p role="alert" className="text-sm text-red-700">{accountError}</p>}</section>
 <AcademicDefaults/><AccountSecurity/>
 <section className={panelClass}><h2 className="text-xl font-semibold">Review preferences</h2><p className="text-sm text-[var(--aven-muted)]">Flashcard review uses the current SM-2 scheduling method. Your recall ratings determine when cards return. Alternative schedulers and custom daily targets are not configurable yet.</p></section>
 <MyQuestionReports/>
 </div>;
}
