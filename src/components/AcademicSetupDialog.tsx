import React,{useEffect,useRef,useState} from 'react';
import { academicContextSchema,type AcademicContext } from '../../shared/academic-context';
import { useAuth } from '../context/AuthContext';
interface Props { subject:string; onCancel:()=>void; onConfirm:(context:AcademicContext)=>void }
export function AcademicSetupDialog({subject,onCancel,onConfirm}:Props){
 const {user}=useAuth();const profile=user?.profile;
 const [level,setLevel]=useState<'school'|'university'>(/school|primary|secondary/i.test(profile?.education_level||'')?'school':'university');
 // Institution is deliberately not assumed to be the exam-awarding university/board.
 const [authority,setAuthority]=useState('');
 const [stage,setStage]=useState(profile?.academic_stage|| (profile?.current_year?`Year ${profile.current_year}`:''));
 const [program,setProgram]=useState(profile?.program||profile?.department||'');
 const [selectedSubject,setSubject]=useState(subject==='General Studies'?'':subject);
 const [error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;dialog.current?.showModal();return()=>{dialog.current?.close();previous?.focus();};},[]);
 function confirm(e:React.FormEvent){e.preventDefault();const parsed=academicContextSchema.safeParse({level,authority,stage,subject:selectedSubject,...(level==='university'?{program}:{})});if(!parsed.success){setError('Complete the fields using at most 120 characters each. You can enter “Unknown” where needed.');return;}onConfirm(parsed.data);}
 const input='mt-1 w-full rounded-xl border border-[var(--aven-border)] bg-[var(--aven-canvas)] p-3 text-sm';
 return <dialog ref={dialog} onCancel={e=>{e.preventDefault();onCancel();}} aria-labelledby="academic-setup-title" className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl border border-[var(--aven-border)] bg-[var(--aven-surface)] text-[var(--aven-ink)] p-6 backdrop:bg-slate-950/40">
 <h2 id="academic-setup-title" className="text-2xl font-semibold">Make it fit your studies.</h2><p className="mt-2 text-sm text-[var(--aven-muted)]">Confirm a few details. Your PDF supplies the facts; these details guide the level and wording.</p>
 <form onSubmit={confirm} className="mt-5 space-y-4">
 <label className="block text-sm">Study level<select className={input} value={level} onChange={e=>{setLevel(e.target.value as typeof level);setAuthority('');setStage('');}}><option value="school">School</option><option value="university">University / college</option></select></label>
 <label className="block text-sm">{level==='school'?'Board / curriculum':'Awarding university / autonomous institution'}<input required maxLength={120} className={input} value={authority} onChange={e=>setAuthority(e.target.value)} placeholder="Enter name, or Unknown"/></label>
 <label className="block text-sm">{level==='school'?'Class / grade':'Year / semester'}<input required maxLength={120} className={input} value={stage} onChange={e=>setStage(e.target.value)} placeholder={level==='school'?'For example, Class 10':'For example, Year 1, Semester 1'}/></label>
 {level==='university'&&<label className="block text-sm">Course / program<input required maxLength={120} className={input} value={program} onChange={e=>setProgram(e.target.value)} placeholder="For example, B.Tech Computer Science"/></label>}
 <label className="block text-sm">Subject<input required maxLength={120} className={input} value={selectedSubject} onChange={e=>setSubject(e.target.value)}/></label>
 <p className="text-xs text-[var(--aven-muted)]">No web or past-paper search is performed yet. These choices apply to this generation and do not change your profile.</p>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 <div className="flex justify-end gap-3"><button type="button" className="rounded-xl border px-4 py-2" onClick={onCancel}>Cancel</button><button className="rounded-xl bg-[var(--aven-action)] text-white px-4 py-2" type="submit">Generate flashcards</button></div>
 </form></dialog>;
}
