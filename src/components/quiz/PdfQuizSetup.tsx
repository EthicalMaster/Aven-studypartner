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
  async function generate(context: AcademicContext) {
    if (!selected || pending.current) return;
    pending.current = true;
    const material = selected;
    setSelected(null); setGenerating(true); setError('');
    try {
      const result = await quizApi.generateFromMaterial(material.id, context);
      if (alive.current) onCreated(result.quiz, result.warning || (result.reused ? 'Opened your saved paper. No new AI generation was needed.' : null));
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not prepare your quiz.');
    } finally { pending.current = false; if (alive.current) setGenerating(false); }
  }
  return <div className="max-w-3xl mx-auto space-y-6 pb-12">
    <button onClick={onCancel} disabled={generating} className="text-sm underline disabled:opacity-50">Back to quizzes</button>
    <header><h1 className="aven-page-title text-3xl">Practice from your PDF.</h1>
      <p className="mt-3 text-[var(--aven-muted)]">Choose a processed document and confirm your study details. We’ll prepare up to five multiple-choice questions for a ten-minute practice session.</p>
      <p className="mt-2 text-sm text-[var(--aven-muted)]">Questions cover selected passages, not the whole document. No web or past-paper search yet. The same PDF and study details reopen the saved paper.</p>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4">{error}</p>}
    {generating ? <div role="status" className="rounded-3xl bg-[var(--aven-soft)] p-8"><h2 className="text-xl font-semibold">Preparing your practice…</h2><p className="mt-2">Checking the source and saving your questions. Keep this page open.</p></div> : <>
      {loading && <p role="status">Loading your PDFs…</p>}
      {!loading && materials.length === 0 && <p>There are no processed documents yet. Upload a readable PDF in Study Materials, wait for processing, then return here.</p>}
      <div className="space-y-3">{materials.map(material => <article key={material.id} className="rounded-2xl border border-[var(--aven-border)] bg-white p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="min-w-0"><h2 className="font-semibold break-words">{material.title || material.originalFilename}</h2><p className="text-sm text-[var(--aven-muted)]">{material.subject}</p></div>
        <button onClick={() => {setError('');setSelected(material);}} className="shrink-0 rounded-xl bg-[var(--aven-action)] text-white px-4 py-2">Use this PDF</button>
      </article>)}</div>
    </>}
    {selected && <AcademicSetupDialog subject={selected.subject || ''} confirmLabel="Prepare quiz" onCancel={() => setSelected(null)} onConfirm={generate}/>}
  </div>;
}
