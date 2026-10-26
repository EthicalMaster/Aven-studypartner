import React,{useEffect,useState} from 'react';
import {academicPreferencesSchema,type AcademicPreferences} from '../../../shared/academic-context';
import {settingsRequest,fieldClass,actionClass,panelClass} from './settingsApi';
export function AcademicDefaults(){
 const [value,setValue]=useState<AcademicPreferences>({level:'university',authority:'',program:'',stage:''});
 const [hasSaved,setHasSaved]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{let alive=true;settingsRequest<{preferences:AcademicPreferences|null}>('/api/auth/academic-preferences').then(data=>{
 if(alive&&data.preferences){setValue(academicPreferencesSchema.parse(data.preferences));setHasSaved(true);}
 }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
 async function save(e:React.FormEvent){e.preventDefault();setError('');setNotice('');const parsed=academicPreferencesSchema.safeParse(value);
 if(!parsed.success){setError('Complete the study details using at most 120 characters per field. Use Unknown if needed.');return;}
 setBusy(true);try{await settingsRequest('/api/auth/academic-preferences','PUT',parsed.data);setHasSaved(true);setNotice('Study defaults saved. You can confirm or change them for each PDF.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function clear(){setBusy(true);setError('');setNotice('');try{await settingsRequest('/api/auth/academic-preferences','DELETE');setHasSaved(false);setValue({level:'university',authority:'',program:'',stage:''});setNotice('Saved study defaults removed.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className={panelClass} id="study-defaults"><h2 className="text-xl font-semibold">AI study defaults</h2><p className="text-sm text-[var(--aven-muted)]">These are the details saved by Remember in PDF setup. They are separate from your profile. Subject stays specific to each document.</p>
 <form onSubmit={save}><fieldset disabled={loading||busy} className="space-y-3">
 <label className="block text-sm">Study level<select aria-label="Study level" className={fieldClass} value={value.level} onChange={e=>setValue(e.target.value==='school'?{level:'school',authority:'',stage:''}:{level:'university',authority:'',stage:'',program:''})}><option value="school">School</option><option value="university">University / college</option></select></label>
 <label className="block text-sm">{value.level==='school'?'Board / curriculum':'Awarding university'}<input required maxLength={120} className={fieldClass} value={value.authority} onChange={e=>setValue({...value,authority:e.target.value})}/></label>
 <label className="block text-sm">{value.level==='school'?'Class / grade':'Year / semester'}<input required maxLength={120} className={fieldClass} value={value.stage} onChange={e=>setValue({...value,stage:e.target.value})}/></label>
 {value.level==='university'&&<label className="block text-sm">Course / program<input required maxLength={120} className={fieldClass} value={value.program} onChange={e=>setValue({...value,program:e.target.value})}/></label>}
 <div className="flex flex-wrap gap-3"><button className={actionClass}>Save study defaults</button>{hasSaved&&<button type="button" onClick={clear} className="text-sm underline">Forget saved defaults</button>}</div>
 </fieldset></form>{loading&&<p role="status">Loading study defaults…</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="text-sm text-[var(--aven-action)]">{notice}</p>}</section>;
}
