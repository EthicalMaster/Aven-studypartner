import React,{useEffect,useRef,useState} from 'react';
import { academicContextSchema,academicPreferencesSchema,type AcademicContext } from '../../shared/academic-context';
import { useAuth } from '../context/AuthContext';
interface Props { confirmLabel?:string; researchEnabled?:boolean; subject:string; onCancel:()=>void; onConfirm:(context:AcademicContext)=>void }
export function AcademicSetupDialog({subject,onCancel,onConfirm,confirmLabel='Generate flashcards',researchEnabled=false}:Props){
 const {user}=useAuth();const profile=user?.profile;
 const [level,setLevel]=useState<'school'|'university'>(/school|primary|secondary/i.test(profile?.education_level||'')?'school':'university');
 // Institution is deliberately not assumed to be the exam-awarding university/board.
 const [authority,setAuthority]=useState('');
 const [stage,setStage]=useState(profile?.academic_stage|| (profile?.current_year?`Year ${profile.current_year}`:''));
 const [program,setProgram]=useState(profile?.program||profile?.department||'');
 const [selectedSubject,setSubject]=useState(subject==='General Studies'?'':subject);
 const [remember,setRemember]=useState(false);
 const [hasSaved,setHasSaved]=useState(false);
 const [busy,setBusy]=useState(true);
 const [notice,setNotice]=useState('');
 const alive=useRef(true);
 const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;dialog.current?.showModal();return()=>{dialog.current?.close();previous?.focus();};},[]);
 useEffect(()=>{
   alive.current=true;const abort=new AbortController();
   fetch('/api/auth/academic-preferences',{credentials:'include',signal:abort.signal})
     .then(async res=>{if(!res.ok)throw new Error();return res.json();})
     .then(data=>{if(!alive.current)return;if(data.preferences){const saved=academicPreferencesSchema.parse(data.preferences);setLevel(saved.level);setAuthority(saved.authority);setStage(saved.stage);setProgram(saved.level==='university'?saved.program:'');setHasSaved(true);setRemember(true);setNotice('Saved study details loaded. Confirm they still apply to this document.');}})
     .catch(()=>{if(alive.current&&!abort.signal.aborted)setNotice('Saved preferences could not be loaded. You can enter details for this generation.');})
     .finally(()=>{if(alive.current)setBusy(false);});
   return()=>{alive.current=false;abort.abort();};
 },[]);
 async function confirm(e:React.FormEvent){
   e.preventDefault();setError('');
   const parsed=academicContextSchema.safeParse({level,authority,stage,subject:selectedSubject,...(level==='university'?{program}:{})});
   if(!parsed.success){setError('Complete the fields using at most 120 characters each. You can enter “Unknown” where needed.');return;}
   setBusy(true);
   try {
     if(remember){const {subject:_,...preferences}=parsed.data;const res=await fetch('/api/auth/academic-preferences',{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(preferences)});if(!res.ok)throw new Error('Could not save your preferences. Try again, or uncheck Remember to generate without saving.');}
     if(alive.current)onConfirm(parsed.data);
   }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Could not save preferences.');}
   finally{if(alive.current)setBusy(false);}
 }
 async function forget(){setBusy(true);setError('');try{const res=await fetch('/api/auth/academic-preferences',{method:'DELETE',credentials:'include'});if(!res.ok)throw new Error('Could not remove saved preferences. Try again.');if(alive.current){setHasSaved(false);setRemember(false);setNotice('Saved preferences removed. The current form is unchanged.');}}catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setBusy(false);}}
 const input='mt-1 w-full rounded-xl border border-[var(--aven-border)] bg-[var(--aven-canvas)] p-3 text-sm';
 return <dialog ref={dialog} onCancel={e=>{e.preventDefault();onCancel();}} aria-labelledby="academic-setup-title" className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl border border-[var(--aven-border)] bg-[var(--aven-surface)] text-[var(--aven-ink)] p-6 backdrop:bg-slate-950/40">
 <h2 id="academic-setup-title" className="text-2xl font-semibold">Make it fit your studies.</h2><p className="mt-2 text-sm text-[var(--aven-muted)]">Confirm a few details. Your PDF supplies the facts; these details guide the level and wording.</p>
 <form onSubmit={confirm} className="mt-5"><fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
 <p role="status" className="text-xs text-[var(--aven-muted)]">{busy?'Loading or saving preferences…':notice}</p>
 <label className="block text-sm">Study level<select className={input} value={level} onChange={e=>{setLevel(e.target.value as typeof level);setAuthority('');setStage('');}}><option value="school">School</option><option value="university">University / college</option></select></label>
 <label className="block text-sm">{level==='school'?'Board / curriculum':'Awarding university / autonomous institution'}<input required maxLength={120} className={input} value={authority} onChange={e=>setAuthority(e.target.value)} placeholder="Enter name, or Unknown"/></label>
 <label className="block text-sm">{level==='school'?'Class / grade':'Year / semester'}<input required maxLength={120} className={input} value={stage} onChange={e=>setStage(e.target.value)} placeholder={level==='school'?'For example, Class 10':'For example, Year 1, Semester 1'}/></label>
 {level==='university'&&<label className="block text-sm">Course / program<input required maxLength={120} className={input} value={program} onChange={e=>setProgram(e.target.value)} placeholder="For example, B.Tech Computer Science"/></label>}
 <label className="block text-sm">Subject<input required maxLength={120} className={input} value={selectedSubject} onChange={e=>setSubject(e.target.value)}/></label>
 <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>Remember these study details for future documents (subject stays document-specific)</label>
 {hasSaved&&<button type="button" onClick={forget} className="text-sm underline">Forget saved study details</button>}
 <p className="text-xs text-[var(--aven-muted)]">{researchEnabled ? 'Next, search public sources using these academic labels only. Your PDF text is not sent to search. Review any results before using them.' : 'These choices apply to this generation and do not change your profile. No web search is performed for PDF-only practice.'}</p>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 <div className="flex justify-end gap-3"><button type="button" className="rounded-xl border px-4 py-2" onClick={onCancel}>Cancel</button><button className="rounded-xl bg-[var(--aven-action)] text-white px-4 py-2" type="submit">{confirmLabel}</button></div>
 </fieldset></form></dialog>;
}
