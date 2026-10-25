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
    pending.current = true;
    setSelected(null); setReview(null); setGenerating(true); setError('');
    try {
      const result = await quizApi.generateFromMaterial(material.id, context, research);
      if (alive.current) onCreated(result.quiz, result.warning || (result.reused ? 'Opened your saved paper. No new AI generation was needed.' : null));
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not prepare your quiz.');
    } finally { pending.current = false; if (alive.current) setGenerating(false); }
  }
  return <div className="max-w-3xl mx-auto space-y-6 pb-12">
    <button onClick={onCancel} disabled={generating||searching} className="text-sm underline disabled:opacity-50">Back to quizzes</button>
    <header><h1 className="aven-page-title text-3xl">Practice from your PDF.</h1>
      <p className="mt-3 text-[var(--aven-muted)]">Choose a processed document and confirm your study details. We’ll prepare up to five multiple-choice questions for a ten-minute practice session.</p>
      <p className="mt-2 text-sm text-[var(--aven-muted)]">Questions cover selected passages, not the whole document. Repeating the same PDF, study details and selected sources reopens the saved paper.</p>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4">{error}</p>}
    {searching ? <p role="status" className="rounded-xl bg-[var(--aven-soft)] p-6">Finding candidate syllabus and past-paper sources…</p> : review ? <ExamSourceReview result={review.result} onBack={()=>setReview(null)} onContinue={selection=>generate(review.context,review.material,selection)}/> : generating ? <div role="status" className="rounded-3xl bg-[var(--aven-soft)] p-8"><h2 className="text-xl font-semibold">Preparing your practice…</h2><p className="mt-2">Checking the source and saving your questions. Keep this page open.</p></div> : <>
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
