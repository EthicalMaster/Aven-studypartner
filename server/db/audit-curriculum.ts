import 'dotenv/config';
import {writeFileSync} from 'node:fs';
import {ALL_CURRICULUM_QUESTIONS,validateCurriculumDataset} from './seeds/curriculum/index.js';
import type {CurriculumQuestion} from './seeds/curriculum/types.js';
import {getRequiredPool,closePool} from './connection.js';
function summarize(questions:CurriculumQuestion[]){
 const validation=validateCurriculumDataset(questions);
 const subjects=new Map<string,{questions:number;topics:Set<string>}>();const optionsIssues:{index:number;issue:string}[]=[];
 questions.forEach((q,index)=>{const key=q.subject.trim();const entry=subjects.get(key)||{questions:0,topics:new Set<string>()};entry.questions++;entry.topics.add(q.topic.trim());subjects.set(key,entry);
  const options=q.options||[];if(new Set(options.map(o=>o.id)).size!==options.length)optionsIssues.push({index,issue:'Duplicate option ID'});
  if(new Set(options.map(o=>o.text.trim().toLowerCase())).size!==options.length)optionsIssues.push({index,issue:'Duplicate option text'});
 });
 return {total:questions.length,subjects:[...subjects].map(([subject,value])=>({subject,questions:value.questions,topics:[...value.topics].sort()})).sort((a,b)=>a.subject.localeCompare(b.subject)),structuralIssues:validation.issues,optionIssues:optionsIssues,
  limitations:['Structural validation does not verify factual answers.','Current bank rows have no exam-authority, curriculum-version, source URL or verified-review fields. Do not label them verified PYQs.','No authority or class mapping is inferred from a subject name.']};
}
const result:any={generatedAt:new Date().toISOString(),mode:'repository-seeds-only',seeds:summarize(ALL_CURRICULUM_QUESTIONS),live:null};
try{
 if(process.argv.includes('--live')){
  const client=await getRequiredPool().connect();try{await client.query('BEGIN READ ONLY');await client.query("SET LOCAL statement_timeout='15s'");
   const counts=await client.query('SELECT COUNT(*)::int AS total FROM question_bank');
   const rows=await client.query('SELECT subject,topic,difficulty,question_type,question_text,options,correct_option_ids,correct_answer_text,explanation,formula_hint,default_marks::float,section FROM question_bank ORDER BY id LIMIT 10000');
   const history=await client.query('SELECT (SELECT COUNT(*)::int FROM quiz_results) AS quiz_results,(SELECT COUNT(*)::int FROM flashcard_reviews) AS flashcard_reviews');
   result.live={...summarize(rows.rows),databaseTotal:counts.rows[0].total,truncated:counts.rows[0].total>rows.rows.length,historyCounts:history.rows[0]};result.mode='repository-and-read-only-live';await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 const outputIndex=process.argv.indexOf('--output');if(outputIndex>=0){const output=process.argv[outputIndex+1];if(!output)throw new Error('Missing output filename');writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(`Audit saved: ${output}. No database writes performed.`);}else console.log(JSON.stringify(result,null,2));
}catch{console.error('Curriculum audit failed. Check database connectivity and schema. No database writes were performed.');process.exitCode=1;}finally{await closePool();}
