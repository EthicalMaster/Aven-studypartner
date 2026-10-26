import {ALL_CURRICULUM_QUESTIONS,validateCurriculumDataset} from '../db/seeds/curriculum/index.js';
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const db=await PGlite.create();
try{
 await db.exec('CREATE TABLE question_bank(id UUID PRIMARY KEY,question_text TEXT,options JSONB,correct_option_ids JSONB,correct_answer_text TEXT,explanation TEXT)');
 const items=JSON.parse(readFileSync('server/test/fixtures/content-corrections.json','utf8'));const sql=readFileSync('server/db/migrations/028_reviewed_content_corrections.sql','utf8');
 for(const item of items){const fields=Object.keys(item.before);await db.query(`INSERT INTO question_bank(id,${fields.join(',')}) VALUES($1,${fields.map((_,i)=>'$'+(i+2)).join(',')})`,[item.id,...Object.values(item.before).map(v=>Array.isArray(v)?JSON.stringify(v):v)]);}
 assert.equal(validateCurriculumDataset(ALL_CURRICULUM_QUESTIONS).valid,true);
 for(const item of items)assert.ok(ALL_CURRICULUM_QUESTIONS.some(q=>Object.entries(item.after).every(([k,v])=>JSON.stringify((q as any)[k])===JSON.stringify(v))));
 await db.exec(sql);
 for(const item of items){const row=(await db.query<any>('SELECT * FROM question_bank WHERE id=$1',[item.id])).rows[0];for(const [key,value] of Object.entries(item.after))assert.deepEqual(row[key],value);}
 await db.exec("UPDATE question_bank SET question_text='Operator revision'");await db.exec(sql);assert.equal((await db.query<any>("SELECT COUNT(*)::int AS n FROM question_bank WHERE question_text='Operator revision'")).rows[0].n,items.length);
 console.log(`PASS: ${items.length} reviewed corrections apply and repeat safely. Historical quiz tables are not touched.`);
}finally{await db.close();}
