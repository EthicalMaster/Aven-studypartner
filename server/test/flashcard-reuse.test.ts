import assert from 'node:assert/strict';
import { setPoolForTesting } from '../db/connection.js';
import { materialRepository } from '../repositories/material.repository.js';
import { flashcardRepository } from '../repositories/flashcard.repository.js';
import { flashcardService } from '../services/flashcard.service.js';
const originalMaterial=materialRepository.getMaterialById, originalCards=flashcardRepository.getFlashcards, originalCreate=flashcardRepository.createFlashcard;
let owned=true,available=true,released=0;const sql:string[]=[];
const client={query:async(q:string)=>{sql.push(q);return {rows:[{acquired:available}]};},release:()=>released++};
setPoolForTesting({connect:async()=>client});
try{
 materialRepository.getMaterialById=async()=>owned?({id:'m',title:'Test'} as any):null;
 flashcardRepository.getFlashcards=async()=>({cards:[{id:'saved',repetitions:5} as any],total:1});
 const cards=await flashcardService.generateFromMaterial('m','student');assert.equal(cards[0].id,'saved');assert.equal(cards[0].repetitions,5);assert.equal(released,1);assert(sql.some(s=>s.includes('pg_advisory_unlock')));
 available=false;await assert.rejects(()=>flashcardService.generateFromMaterial('m','student'),/already running/);assert.equal(released,2);
 owned=false;await assert.rejects(()=>flashcardService.generateFromMaterial('m','student'),/unauthorized/);assert.equal(released,2);
 sql.length=0;let count=0;flashcardRepository.createFlashcard=async(_card,connection)=>{assert.equal(connection,client);if(++count===2)throw new Error('insert failure');return {id:'new'} as any;};
 const item={student_id:'s',subject:'science',topic:'energy',question:'Question',answer:'Answer'};
 await assert.rejects(()=>flashcardRepository.createFlashcardsBatch([item,item]),/insert failure/);assert.deepEqual(sql,['BEGIN','ROLLBACK']);
 sql.length=0;flashcardRepository.createFlashcard=async()=>({id:'new'} as any);await flashcardRepository.createFlashcardsBatch([item]);assert.deepEqual(sql,['BEGIN','COMMIT']);
 console.log('PASS: reuse preserves review state, ownership before lock, busy requests release connection, transactional commit/rollback. Mock dependencies; no live AI calls.');
}finally{materialRepository.getMaterialById=originalMaterial;flashcardRepository.getFlashcards=originalCards;flashcardRepository.createFlashcard=originalCreate;setPoolForTesting(null);}
