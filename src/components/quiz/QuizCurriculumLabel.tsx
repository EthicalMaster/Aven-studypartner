import React,{useEffect,useState} from 'react';
import {settingsRequest} from '../settings/settingsApi';
import type {CurriculumContext} from '../../../shared/curriculum-catalog';
export function QuizCurriculumLabel({quizId}:{quizId:string}){
 const [context,setContext]=useState<CurriculumContext|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let alive=true;settingsRequest<{context:CurriculumContext|null}>(`/api/quizzes/${quizId}/curriculum`).then(r=>{if(alive)setContext(r.context);}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[quizId]);
 if(error)return <p className="text-sm">Curriculum source could not be loaded. This paper is not verified as a past exam.</p>;
 return context?<aside className="rounded-xl border border-[var(--aven-border)] p-4 text-sm"><strong>{context.authority} · {context.program} · {context.stage}</strong><p>Curriculum version: {context.curriculum_version}. Placement reviewed; not certified as an authentic past paper.</p><a className="underline" href={context.source_url} target="_blank" rel="noopener noreferrer">Curriculum source</a></aside>:null;
}
