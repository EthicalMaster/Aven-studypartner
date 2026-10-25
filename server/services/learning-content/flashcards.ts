import { z } from 'zod';
export interface Passage { id: string; page: number; text: string }
const normalized = (s: string) => s.toLowerCase().replace(/\s+/g,' ').trim();
const furniture = (s: string) => /^(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(s) || /^(?:unit|chapter|module)\s+[\divxlc]+\s*[:.\-–]?\s*[^.!?]{0,70}$/i.test(s) || /\.{4,}\s*\d+$/.test(s);

/** Only repeated short edge lines are removed as furniture; body repetition is preserved. */
export function selectPassages(pages: {page_number:number;text:string}[], budget=6000): Passage[] {
  const edges=new Map<string,Set<number>>();
  for(const page of pages){const lines=page.text.split(/\n/).map(s=>s.trim()).filter(Boolean);for(const line of [...lines.slice(0,2),...lines.slice(-2)]){
    if(line.length>100 || /[.!?=]/.test(line))continue;
    const key=normalized(line);const seen=edges.get(key)||new Set<number>();seen.add(page.page_number);edges.set(key,seen);
  }}
  const candidates:Passage[]=[];const seen=new Set<string>();
  for(const page of pages){
    const lines=page.text.split(/\n/).map(s=>s.trim()).filter(Boolean);
    const clean=lines.filter((line,index)=>!furniture(line)&&!((index<2||index>=lines.length-2)&&(edges.get(normalized(line))?.size||0)>=3)).join('\n');
    // Sentence boundaries preserve short definitions/formulas alongside surrounding context.
    const sentences=clean.split(/(?<=[.!?])\s+|\n\s*\n/);let group='';
    function push(){const text=group.trim();group='';const key=normalized(text);if(text.length<70||seen.has(key)||!/[a-zA-Z]{3}/.test(text))return;seen.add(key);candidates.push({id:`p${candidates.length+1}`,page:page.page_number,text});}
    for(const sentence of sentences){if(sentence.length>1500){push();continue;}if(group.length+sentence.length>1200)push();group+=(group?' ':'')+sentence;}push();
  }
  // Spread selection across document positions rather than only the introduction.
  const result:Passage[]=[];let used=0;const slots=Math.min(6,candidates.length);
  for(let i=0;i<slots;i++){const index=slots===1?0:Math.round(i*(candidates.length-1)/(slots-1));const p=candidates[index];if(used+p.text.length<=budget){result.push(p);used+=p.text.length;}}
  return result;
}
export const groundedCardsSchema=z.object({flashcards:z.array(z.object({
  question:z.string().min(12).max(500),answer:z.string().min(12).max(1200),keyConcept:z.string().min(2).max(160),
  formula:z.string().max(300),difficulty:z.enum(['easy','medium','hard']),sourceId:z.string(),evidence:z.string().trim().min(1).max(800),
}).strict()).min(1).max(6)}).strict();
export function validateCards(value:unknown,passages:Passage[]){
 const parsed=groundedCardsSchema.parse(value);const questions=new Set<string>();const answers=new Set<string>();
 for(const card of parsed.flashcards){
  const source=passages.find(p=>p.id===card.sourceId);const q=normalized(card.question).replace(/[^\p{L}\p{N} ]/gu,'');const a=normalized(card.answer);
  if(!source||!normalized(source.text).includes(normalized(card.evidence)))throw new Error('Generated flashcard evidence does not match its source. No cards were saved.');
  if(questions.has(q)||answers.has(a)||/core principle described in part|what is (?:unit|chapter|module)\s+\d|what does (?:this|the) (?:paragraph|passage|section) (?:say|describe)/i.test(card.question)||furniture(card.answer))throw new Error('Generated flashcards were repetitive or lacked context. No cards were saved.');
  questions.add(q);answers.add(a);
 }
 return parsed.flashcards;
}
