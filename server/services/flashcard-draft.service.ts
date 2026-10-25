import { getRequiredPool } from '../db/connection.js';
import { flashcardRepository } from '../repositories/flashcard.repository.js';
import { saveFlashcardDraftSchema, type FlashcardDraft, type DraftCard } from '../../shared/flashcard-draft.js';
import { normalizeEvidence } from './learning-content/flashcards.js';
import { AIGatewayError } from './ai/errors.js';
const map = (row:any):FlashcardDraft => ({id:row.id,title:row.title,subject:row.subject,topic:row.topic,cards:row.cards,rejectedCount:row.rejected_count});
export const flashcardDraftService = {
  async get(studentId:string,materialId:string):Promise<FlashcardDraft|null> {
    const result=await getRequiredPool().query('SELECT * FROM flashcard_generation_drafts WHERE student_id=$1 AND material_id=$2 AND committed_ids IS NULL',[studentId,materialId]);
    return result.rows[0]?map(result.rows[0]):null;
  },
  async create(studentId:string,materialId:string,data:Omit<FlashcardDraft,'id'>):Promise<FlashcardDraft> {
    const result=await getRequiredPool().query(`INSERT INTO flashcard_generation_drafts(student_id,material_id,title,subject,topic,cards,rejected_count)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(student_id,material_id) DO UPDATE SET
      title=EXCLUDED.title,subject=EXCLUDED.subject,topic=EXCLUDED.topic,cards=EXCLUDED.cards,rejected_count=EXCLUDED.rejected_count,
      committed_ids=NULL,created_at=NOW() WHERE flashcard_generation_drafts.committed_ids IS NOT NULL RETURNING *`,
      [studentId,materialId,data.title,data.subject,data.topic,JSON.stringify(data.cards),data.rejectedCount]);
    // The material generation advisory lock serializes preparation; a pending draft is immutable.
    return result.rows[0]?map(result.rows[0]):(await this.get(studentId,materialId))!;
  },
  async commit(studentId:string,draftId:string,input:unknown) {
    const selection=saveFlashcardDraftSchema.parse(input);
    const client=await getRequiredPool().connect();
    try {
      await client.query('BEGIN');
      const result=await client.query('SELECT * FROM flashcard_generation_drafts WHERE id=$1 AND student_id=$2 FOR UPDATE',[draftId,studentId]);
      const draft=result.rows[0];
      if(!draft)throw new AIGatewayError('DRAFT_NOT_FOUND',404,'Draft not found.');
      if(draft.committed_ids!==null){
        const saved=await client.query('SELECT id FROM flashcards WHERE student_id=$1 AND id=ANY($2::uuid[])',[studentId,draft.committed_ids]);
        await client.query('COMMIT');
        return {ids:saved.rows.map(row=>row.id),reused:true};
      }
      const originals:DraftCard[]=draft.cards;
      const seenIds=new Set<string>(),seenQuestions=new Set<string>();
      // Include existing document questions, preserving mathematical case and punctuation.
      const existing=await client.query('SELECT question FROM flashcards WHERE student_id=$1 AND source_material_id=$2',[studentId,draft.material_id]);
      for(const row of existing.rows)seenQuestions.add(normalizeEvidence(row.question));
      const ids:string[]=[];
      for(const edited of selection.cards){
        const original=originals.find(card=>card.id===edited.id);
        if(!original||seenIds.has(edited.id))throw new AIGatewayError('INVALID_DRAFT_SELECTION',422,'Select each draft card at most once.');
        const question=normalizeEvidence(edited.question);
        if(seenQuestions.has(question))throw new AIGatewayError('DUPLICATE_CARD',422,'Two selected cards, or a card already in this document deck, have the same question. Edit or deselect the duplicate.');
        seenIds.add(edited.id);seenQuestions.add(question);
        const userEdited=(['question','answer','keyConcept','formula','difficulty'] as const).some(key=>edited[key]!==original[key]);
        const card=await flashcardRepository.createFlashcard({student_id:studentId,subject:draft.subject,topic:draft.topic,
          question:edited.question,answer:edited.answer,key_concept:edited.keyConcept,formula:edited.formula||null,difficulty:edited.difficulty,
          source_type:'study_material',source_material_id:draft.material_id,tags:[draft.subject,'Study Material',`Source page ${original.page}`]},client);
        await client.query('UPDATE flashcards SET source_evidence=$2, source_page=$3, user_edited=$4 WHERE id=$1',[card.id,original.evidence,original.page,userEdited]);
        ids.push(card.id);
      }
      await client.query('UPDATE flashcard_generation_drafts SET committed_ids=$2 WHERE id=$1',[draftId,ids]);
      await client.query('COMMIT');return {ids,reused:false};
    } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  },
};
