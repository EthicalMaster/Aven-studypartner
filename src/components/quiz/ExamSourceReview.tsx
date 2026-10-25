import React, { useState } from 'react';
import type { ExamResearchResult, ResearchSelection } from '../../../shared/exam-research';
interface Props { result: ExamResearchResult; onContinue: (selection?: ResearchSelection) => void; onBack: () => void }
export function ExamSourceReview({result,onContinue,onBack}:Props) {
  const [selected,setSelected]=useState<string[]>([]);
  const [reviewed,setReviewed]=useState(false);
  return <section className="space-y-4 rounded-3xl border border-[var(--aven-border)] bg-white p-6">
    <h2 className="text-2xl font-semibold">Check your exam sources.</h2>
    <p role="status" className="text-sm text-[var(--aven-muted)]">{result.message}</p>
    <p className="text-sm">Open each link and check the awarding university or board, program, subject, semester and paper year. Search summaries can be incomplete or outdated. Select up to two relevant sources.</p>
    {result.fetchedAt && <p className="text-xs text-[var(--aven-muted)]">{result.cached?'Cached search':'Searched'}: {new Date(result.fetchedAt).toLocaleDateString()}</p>}
    {result.sources.map(source=><article key={source.id} className="rounded-xl border border-[var(--aven-border)] p-4 space-y-2">
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--aven-action)] underline break-words">{source.title} ↗</a>
      <p className="text-xs text-[var(--aven-muted)]"><span className="break-all">{source.host}</span><span className="block mt-1">Candidate, not independently verified</span></p>
      <p className="text-sm leading-relaxed break-words">{source.snippet}</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selected.includes(source.id)} disabled={!selected.includes(source.id)&&selected.length>=2}
        onChange={event=>{setReviewed(false);setSelected(previous=>event.target.checked?[...previous,source.id]:previous.filter(id=>id!==source.id));}}/>Use this source for style and emphasis</label>
    </article>)}
    {selected.length>0&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I opened the selected links and checked that they fit my study details and curriculum year.</label>}
    <p className="text-xs text-[var(--aven-muted)]">Answers will still come from your PDF. Generated questions are practice, not authentic PYQs or guaranteed exam predictions.</p>
    <div className="flex flex-wrap gap-3">
      <button onClick={()=>onContinue()} className="rounded-xl border px-4 py-2">Continue with PDF only</button>
      {result.sources.length>0&&<button disabled={!reviewed||!selected.length||!result.cacheKey} onClick={()=>onContinue({cacheKey:result.cacheKey!,sourceIds:selected,reviewed:true})} className="rounded-xl bg-[var(--aven-action)] text-white px-4 py-2 disabled:opacity-40">Use reviewed sources</button>}
      <button onClick={onBack} className="px-3 py-2 underline text-sm">Back to documents</button>
    </div>
  </section>;
}
