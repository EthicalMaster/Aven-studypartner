import React,{useState} from 'react';
import {questionReportSchema,type QuestionReportInput} from '../../../shared/question-report';
import {settingsRequest,fieldClass,actionClass} from '../settings/settingsApi';
export function QuestionReportForm({sessionId,questionId}:{sessionId:string;questionId:string}){
 const [reason,setReason]=useState<QuestionReportInput['reason']>('incorrect_answer'),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setSaved(false);const input=questionReportSchema.safeParse({sessionId,questionId,reason,note});
 if(!input.success){setError('Explain the issue in 5–1,000 characters.');return;}setBusy(true);
 try{await settingsRequest('/api/quizzes/question-reports','POST',input.data);setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <details className="rounded-xl border border-[var(--aven-border)] p-4 text-sm"><summary className="cursor-pointer font-semibold text-[var(--aven-action)]">Report an issue</summary>
 <form onSubmit={submit} className="mt-4"><fieldset disabled={busy} className="space-y-3">
 <label className="block">Issue type<select aria-label="Issue type" className={fieldClass} value={reason} onChange={e=>{setReason(e.target.value as typeof reason);setSaved(false);}}><option value="incorrect_answer">Incorrect answer</option><option value="unclear_question">Unclear question</option><option value="source_mismatch">Source mismatch</option><option value="other">Other</option></select></label>
 <label className="block">What needs checking?<textarea aria-label="What needs checking?" className={fieldClass} required minLength={5} maxLength={1000} rows={3} value={note} onChange={e=>{setNote(e.target.value);setSaved(false);}}/></label>
 <button className={actionClass}>{busy?'Saving report…':'Save report'}</button></fieldset></form>
 {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}{saved&&<p role="status" className="mt-3">Report saved. View it in Settings → Reports. Your score and answer are unchanged; review is not automatic.</p>}
 </details>;
}
