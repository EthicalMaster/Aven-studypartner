import {similarCardPairs} from '../../../shared/card-overlap';
import React,{useRef,useState} from 'react';
import { flashcardApi,type FlashcardItem } from '../../services/flashcardApi';
import { saveFlashcardDraftSchema,type FlashcardDraft } from '../../../shared/flashcard-draft';
export function FlashcardDraftReview({draft,onSaved,onBack}:{draft:FlashcardDraft;onSaved:(cards:FlashcardItem[])=>void;onBack:()=>void}) {
  const [cards,setCards]=useState(()=>draft.cards.map(card=>({...card,selected:true})));
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const pending=useRef(false);
  const similar=similarCardPairs(cards);
  const count=cards.filter(card=>card.selected).length;
  function update(index:number,field:string,value:string|boolean){setCards(previous=>previous.map((card,i)=>i===index?{...card,[field]:value}:card));}
  async function save(event:React.FormEvent){
    event.preventDefault();if(pending.current)return;setError('');
    const parsed=saveFlashcardDraftSchema.safeParse({cards:cards.filter(card=>card.selected).map(({evidence,page,selected,...card})=>card)});
    if(!parsed.success){setError('Select at least one card and complete its question, answer and concept within the field limits.');return;}
    pending.current=true;setBusy(true);
    try{const result=await flashcardApi.saveDraft(draft.id,parsed.data.cards);if(!result.cards.length)throw new Error('This draft was already saved, but its cards were removed. Return to your decks.');onSaved(result.cards);}
    catch(e){setError(e instanceof Error?e.message:'Could not save the draft.');}
    finally{pending.current=false;setBusy(false);}
  }
  const input='mt-1 w-full rounded-xl border border-[var(--aven-border)] bg-[var(--aven-canvas)] p-3 text-sm';
  return <div className="max-w-3xl mx-auto pb-12 space-y-5">
    <button disabled={busy} onClick={onBack} className="text-sm underline disabled:opacity-50">Back to decks</button>
    <header><h1 className="aven-page-title text-3xl">Make these cards yours.</h1><p className="mt-2 text-[var(--aven-muted)] break-words">{draft.title} · {draft.subject}</p>
      <p className="mt-3 text-sm">Check each card against its source, edit where needed, and choose what to keep. Your generated draft is saved; edits are saved only when you add cards to the deck.</p></header>
    {draft.rejectedCount>0&&<p role="status" className="rounded-xl bg-amber-50 text-amber-900 p-3 text-sm">{draft.rejectedCount} generated {draft.rejectedCount===1?'card failed validation and was':'cards failed validation and were'} omitted. No extra AI request was made.</p>}
    {similar.length>0&&<p role="status" className="rounded-xl bg-amber-50 text-amber-900 p-3 text-sm">Some cards use very similar wording: {similar.map(([a,b])=>`${a+1} & ${b+1}`).join(', ')}. Compare their meaning before keeping both. This is a wording check, not a factual check.</p>}
    <form onSubmit={save} className="space-y-5"><fieldset disabled={busy} className="space-y-5">
      {cards.map((card,index)=><article key={card.id} className="rounded-3xl border border-[var(--aven-border)] bg-white p-5 space-y-4">
        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={card.selected} onChange={e=>update(index,'selected',e.target.checked)}/>Keep card {index+1}</label>
        <fieldset disabled={!card.selected} className="space-y-3 disabled:opacity-50">
          <label className="block text-sm">Question {index+1}<textarea aria-label={`Question ${index+1}`} required minLength={3} maxLength={500} rows={2} value={card.question} onChange={e=>update(index,'question',e.target.value)} className={input}/></label>
          <label className="block text-sm">Answer {index+1}<textarea aria-label={`Answer ${index+1}`} required maxLength={1200} rows={3} value={card.answer} onChange={e=>update(index,'answer',e.target.value)} className={input}/></label>
          <div className="grid sm:grid-cols-2 gap-3"><label className="block text-sm">Key concept {index+1}<input required maxLength={160} value={card.keyConcept} onChange={e=>update(index,'keyConcept',e.target.value)} className={input}/></label>
          <label className="block text-sm">Difficulty {index+1}<select value={card.difficulty} onChange={e=>update(index,'difficulty',e.target.value)} className={input}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label></div>
          <label className="block text-sm">Formula {index+1} (optional)<input maxLength={300} value={card.formula} onChange={e=>update(index,'formula',e.target.value)} className={input}/></label>
        </fieldset>
        <details className="rounded-xl bg-[var(--aven-soft)] p-3 text-sm"><summary className="cursor-pointer font-semibold">Original evidence · PDF page {card.page}</summary><blockquote className="mt-3 whitespace-pre-wrap break-words">{card.evidence}</blockquote><p className="mt-2 text-xs text-[var(--aven-muted)]">The quote is preserved from generation. Your edits are not automatically verified against it.</p></details>
      </article>)}
      {error&&<p role="alert" className="rounded-xl bg-red-50 text-red-800 p-3">{error}</p>}
      <button type="submit" disabled={!count||busy} className="rounded-xl bg-[var(--aven-action)] text-white px-5 py-3 disabled:opacity-50">{busy?'Saving selected cards…':`Save ${count} ${count===1?'card':'cards'} & start review`}</button>
    </fieldset></form>
  </div>;
}
