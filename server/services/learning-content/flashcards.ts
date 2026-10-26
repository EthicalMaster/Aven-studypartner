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
    for(const sentence of sentences){
      // PDF extraction often yields long unpunctuated blocks. Preserve these
      // in bounded whitespace-delimited windows instead of discarding them.
      let remaining=sentence.trim();
      while(remaining.length>1200){
        push();
        let boundary=remaining.lastIndexOf(' ',1200);
        if(boundary<600)boundary=1200;
        group=remaining.slice(0,boundary);push();
        remaining=remaining.slice(boundary).trim();
      }
      if(group.length+remaining.length+1>1200)push();
      group+=(group?' ':'')+remaining;
    }push();
  }
  // Spread selection across document positions rather than only the introduction.
  const result:Passage[]=[];let used=0;const slots=Math.min(6,candidates.length);
  for(let i=0;i<slots;i++){const index=slots===1?0:Math.round(i*(candidates.length-1)/(slots-1));const p=candidates[index];if(used+p.text.length<=budget){result.push(p);used+=p.text.length;}}
  return result;
}
// Keep mathematical case, signs, exponents and punctuation intact.
export function normalizeEvidence(text:string):string {
 return text.normalize('NFC').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
}
export function evidenceMatches(source:string,quote:string):boolean {
 const text=normalizeEvidence(source), evidence=normalizeEvidence(quote);
 if(!evidence)return false;
 let index=text.indexOf(evidence);
 const word=(c:string)=>/[\p{L}\p{N}_]/u.test(c);
 while(index>=0){
  const before=index>0?Array.from(text.slice(0,index)).at(-1)!:'';
  const after=Array.from(text.slice(index+evidence.length))[0]||'';
  if(!(word(evidence[0])&&word(before))&&!(word(evidence.at(-1)!)&&word(after)))return true;
  index=text.indexOf(evidence,index+1);
 }
 return false;
}
export const groundedCardSchema=z.object({
 question:z.string().trim().min(3).max(500),answer:z.string().trim().min(1).max(1200),keyConcept:z.string().trim().min(1).max(160),
 formula:z.string().max(300),difficulty:z.enum(['easy','medium','hard']),sourceId:z.string().trim().min(1),evidence:z.string().trim().min(1).max(800),
}).strict();
// Validate envelope first; each card is independently validated below.
export const groundedCardsSchema=z.object({flashcards:z.array(z.unknown()).min(1).max(6)}).strict();
export function validateCardBatch(value:unknown,passages:Passage[]){
 const parsed=groundedCardsSchema.parse(value);const questions=new Set<string>();
 const cards:z.infer<typeof groundedCardSchema>[]=[];
 const rejected:{index:number;reason:'invalid_fields'|'unmatched_evidence'|'duplicate_or_vague'}[]=[];
 parsed.flashcards.forEach((value,index)=>{
  const result=groundedCardSchema.safeParse(value);
  if(!result.success){rejected.push({index,reason:'invalid_fields'});return;}
  const card=result.data,source=passages.find(p=>p.id===card.sourceId);
  if(!source||!evidenceMatches(source.text,card.evidence)){rejected.push({index,reason:'unmatched_evidence'});return;}
  const q=normalizeEvidence(card.question);
  // Numeric answers and repeated answers to different questions can both be valid.
  if(questions.has(q)||/core principle described in part|what is (?:unit|chapter|module)\s+\d|what does (?:this|the) (?:paragraph|passage|section) (?:say|describe)/i.test(card.question)||/^(?:unit|chapter|module)\s+[\divxlc]+$/i.test(card.answer)){
   rejected.push({index,reason:'duplicate_or_vague'});return;
  }
  questions.add(q);cards.push(card);
 });
 if(!cards.length)throw new Error('None of the generated cards passed content and source checks. No cards were saved. The model may have changed a source quote or returned invalid fields.');
 return {cards,rejectedCount:rejected.length,rejected};
}
// Compatibility helper for consumers that only need the accepted cards.
export function validateCards(value:unknown,passages:Passage[]){return validateCardBatch(value,passages).cards;}
