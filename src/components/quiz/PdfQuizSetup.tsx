import {pdfQuizOptionsSchema,type PdfQuizOptions} from '../../../shared/pdf-quiz-options';
import {fieldClass} from '../settings/settingsApi';
import { ExamSourceReview } from './ExamSourceReview';
import type { ExamResearchResult, ResearchSelection } from '../../../shared/exam-research';
import React, { useEffect, useRef, useState } from 'react';
import { materialApi } from '../../services/materialApi';
import { quizApi } from '../../services/quizApi';
import { AcademicSetupDialog } from '../AcademicSetupDialog';
import type { AcademicContext } from '../../../shared/academic-context';
import type { Quiz, StudyMaterial } from '../../types';

interface Props { onCancel: () => void; onCreated: (quiz: Quiz, notice: string | null) => void }
export function PdfQuizSetup({ onCancel, onCreated }: Props) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<StudyMaterial | null>(null);
  const [count,setCount]=useState<5|10>(5),[difficulty,setDifficulty]=useState<PdfQuizOptions['difficulty']>('mixed'),[firstPage,setFirstPage]=useState(''),[lastPage,setLastPage]=useState('');
  const options=()=>pdfQuizOptionsSchema.safeParse({count,difficulty,...(firstPage?{firstPage:Number(firstPage)}:{}),...(lastPage?{lastPage:Number(lastPage)}:{})});
  const [researchEnabled,setResearchEnabled]=useState(false);
  const [searching,setSearching]=useState(false);
  const [review,setReview]=useState<{material:StudyMaterial;context:AcademicContext;result:ExamResearchResult}|null>(null);
  const [generating, setGenerating] = useState(false);
  const pending = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    materialApi.getMaterials().then(data => {
      if (alive.current) setMaterials(data.materials.filter(m => m.processingStatus === 'ready'));
    }).catch(e => { if (alive.current) setError(e.message); })
      .finally(() => { if (alive.current) setLoading(false); });
    return () => { alive.current = false; };
  }, []);
  async function confirm(context: AcademicContext) {
    if (!selected || pending.current) return;
    if(!options().success){setError('Check the page range: use positive page numbers, with the last page after the first.');setSelected(null);return;}
    const material=selected;
    if(!researchEnabled){await generate(context,material);return;}
    pending.current=true;setSelected(null);setSearching(true);setError('');
    let result:ExamResearchResult;
    try {result=await quizApi.discoverSources(context);}
    catch(e){result={cacheKey:null,sources:[],cached:false,fetchedAt:null,message:e instanceof Error?e.message:'Search unavailable. Continue with PDF-only practice.'};}
    finally {pending.current=false;if(alive.current)setSearching(false);}
    if(alive.current)setReview({material,context,result});
  }
  async function generate(context: AcademicContext, material: StudyMaterial, research?: ResearchSelection) {
    if (pending.current) return;
    const parsed=options();if(!parsed.success){setError('Check your quiz options and page range.');return;}
    pending.current = true;
    setSelected(null); setReview(null); setGenerating(true); setError('');
    try {
      const result = await quizApi.generateFromMaterial(material.id, context, research, parsed.data);
      if (alive.current) onCreated(result.quiz, result.warning || (result.reused ? 'Opened your saved paper. No new AI generation was needed.' : null));
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not prepare your quiz.');
    } finally { pending.current = false; if (alive.current) setGenerating(false); }
  }
  return <div className="max-w-3xl mx-auto space-y-6 pb-12">
    <button onClick={onCancel} disabled={generating||searching} className="text-sm underline disabled:opacity-50">Back to quizzes</button>
    <header><h1 className="aven-page-title text-3xl">Practice from your PDF.</h1>
      <p className="mt-3 text-[var(--aven-muted)]">Choose a processed document and confirm your study details. Choose a short or longer multiple-choice practice session below.</p>
      <p className="mt-2 text-sm text-[var(--aven-muted)]">Questions cover selected passages, not the whole document. Repeating the same PDF, study details, options and selected sources reopens the saved paper.</p>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4">{error}</p>}
    {searching ? <p role="status" className="rounded-xl bg-[var(--aven-soft)] p-6">Finding candidate syllabus and past-paper sources…</p> : review ? <ExamSourceReview result={review.result} onBack={()=>setReview(null)} onContinue={selection=>generate(review.context,review.material,selection)}/> : generating ? <div role="status" className="rounded-3xl bg-[var(--aven-soft)] p-8"><h2 className="text-xl font-semibold">Preparing your practice…</h2><p className="mt-2">Checking the source and saving your questions. Keep this page open.</p></div> : <>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Practice length<select aria-label="Practice length" className={fieldClass} value={count} onChange={e=>setCount(Number(e.target.value) as 5|10)}><option value={5}>Up to 5 questions · 10 minutes</option><option value={10}>Up to 10 questions · 15 minutes</option></select></label><label className="text-sm">Difficulty<select aria-label="Difficulty" className={fieldClass} value={difficulty} onChange={e=>setDifficulty(e.target.value as PdfQuizOptions['difficulty'])}>{['mixed','easy','medium','hard'].map(d=><option key={d} value={d}>{d[0].toUpperCase()+d.slice(1)}</option>)}</select></label></div>
      <details className="rounded-xl border border-[var(--aven-border)] p-4 text-sm"><summary className="cursor-pointer">Limit PDF pages (optional)</summary><p className="mt-2 text-xs text-[var(--aven-muted)]">Use PDF page positions, not printed page labels. Leave blank for the whole PDF. Longer sets use more AI tokens and may contain fewer questions if the source is sparse.</p><div className="grid grid-cols-2 gap-3 mt-3"><label>First page<input aria-label="First page" type="number" min={1} max={100000} className={fieldClass} value={firstPage} onChange={e=>setFirstPage(e.target.value)}/></label><label>Last page<input aria-label="Last page" type="number" min={1} max={100000} className={fieldClass} value={lastPage} onChange={e=>setLastPage(e.target.value)}/></label></div></details>
      <label className="flex items-start gap-3 rounded-xl bg-[var(--aven-soft)] p-4 text-sm"><input type="checkbox" checked={researchEnabled} onChange={e=>setResearchEnabled(e.target.checked)}/><span>Find syllabus / past-paper sources (optional)<span className="block mt-1 text-xs text-[var(--aven-muted)]">Search uses your academic labels only, never PDF text. Review the links before using them. School-board sources may also be available.</span></span></label>
      {loading && <p role="status">Loading your PDFs…</p>}
      {!loading && materials.length === 0 && <p>There are no processed documents yet. Upload a readable PDF in Study Materials, wait for processing, then return here.</p>}
      <div className="space-y-3">{materials.map(material => <article key={material.id} className="rounded-2xl border border-[var(--aven-border)] bg-white p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="min-w-0"><h2 className="font-semibold break-words">{material.title || material.originalFilename}</h2><p className="text-sm text-[var(--aven-muted)]">{material.subject}</p></div>
        <button onClick={() => {setError('');setSelected(material);}} className="shrink-0 rounded-xl bg-[var(--aven-action)] text-white px-4 py-2">Use this PDF</button>
      </article>)}</div>
    </>}
    {selected && <AcademicSetupDialog subject={selected.subject || ''} researchEnabled={researchEnabled} confirmLabel={researchEnabled?"Find sources":"Prepare quiz"} onCancel={() => setSelected(null)} onConfirm={confirm}/>}
  </div>;
}
