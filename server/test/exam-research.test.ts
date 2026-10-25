import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { setPoolForTesting } from '../db/connection.js';
import { examResearchService } from '../services/exam-research/research.service.js';
import { parseSearchResults, researchKey, safeSourceUrl, searchQuery, searchPublicSources } from '../services/exam-research/search.js';
import { researchSelectionSchema } from '../../shared/exam-research.js';
const context={level:'university' as const,authority:'RGPV',program:'B.Tech',stage:'Semester 1',subject:'Physics'};
assert(searchQuery(context).includes('official syllabus'));
for(const url of ['http://example.edu/a','javascript:alert(1)','https://127.0.0.1/a','https://[::1]/','https://user:pass@example.edu','https://localhost/a','https://host.local/a'])assert.equal(safeSourceUrl(url),null);
const raw={results:[{url:'https://example.edu/physics.pdf',title:'Physics syllabus',content:'Semester 1 physics syllabus and examination scheme.'},{url:'javascript:x',title:'bad',content:'bad'},{url:'https://example.edu/physics.pdf#p1',title:'duplicate',content:'duplicate'}]};
const parsed=parseSearchResults(raw);assert.equal(parsed.length,1);assert.equal(parsed[0].host,'example.edu');
assert.equal(parseSearchResults({results:[{url:'https://example.edu/a',title:'a',content:'x'.repeat(2000)}]})[0].snippet.length,800);
assert(!researchSelectionSchema.safeParse({cacheKey:researchKey(context),sourceIds:[parsed[0].id],reviewed:false}).success);
const db=await PGlite.create();const student='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const originalFetch=globalThis.fetch;const env={TAVILY_API_KEY:process.env.TAVILY_API_KEY,EXAM_SEARCH_MONTHLY_LIMIT:process.env.EXAM_SEARCH_MONTHLY_LIMIT,EXAM_SEARCH_DAILY_LIMIT:process.env.EXAM_SEARCH_DAILY_LIMIT};
let calls=0, busy=false, providerFailure=false, oversized=false;
const query=async(sql:string,args?:any[])=>sql.includes('pg_try_advisory_lock')?{rows:[{acquired:!busy}]}:sql.includes('pg_advisory_unlock')?{rows:[{}]}:db.query(sql,args);
try{
  await db.exec('CREATE TABLE student_profiles(id uuid PRIMARY KEY)');
  await db.exec(readFileSync(new URL('../db/migrations/021_exam_source_research.sql',import.meta.url),'utf8'));
  await db.query('INSERT INTO student_profiles VALUES($1),($2)',[student,other]);
  setPoolForTesting({query,connect:async()=>({query,release(){}})});
  globalThis.fetch=async(url,options)=>{
    calls++;assert.equal(url,'https://api.tavily.com/search');assert.equal(options?.redirect,'error');
    const body=JSON.parse(String(options?.body));assert.equal(body.search_depth,'basic');assert.equal(body.auto_parameters,false);assert.equal(body.include_raw_content,false);assert.equal(body.include_answer,false);assert.equal(body.max_results,5);
    assert.equal('materialId' in body,false);assert.equal('passages' in body,false);assert.equal('studentId' in body,false);
    return new Response(oversized?'x'.repeat(66000):JSON.stringify(raw),{status:providerFailure?429:200});
  };
  delete process.env.TAVILY_API_KEY;
  const off=await examResearchService.discover(student,context);assert.equal(off.cacheKey,null);assert.match(off.message,/not configured/);assert.equal(calls,0);
  process.env.TAVILY_API_KEY='test-key';process.env.EXAM_SEARCH_MONTHLY_LIMIT='2';process.env.EXAM_SEARCH_DAILY_LIMIT='1';
  busy=true;assert.match((await examResearchService.discover(student,context)).message,/already running/);assert.equal(calls,0);busy=false;
  const result=await examResearchService.discover(student,context);assert.equal(result.sources.length,1);assert.equal(calls,1);
  const cached=await examResearchService.discover(other,context);assert(cached.cached);assert.equal(calls,1);
  const selection={cacheKey:result.cacheKey,sourceIds:[result.sources[0].id],reviewed:true};
  assert.equal((await examResearchService.resolveSelection(context,selection)).length,1);
  await assert.rejects(()=>examResearchService.resolveSelection({...context,stage:'Semester 2'},selection),/details changed/);
  await assert.rejects(()=>examResearchService.resolveSelection(context,{...selection,sourceIds:['0'.repeat(64)]}),/expired or changed/);
  const limited=await examResearchService.discover(student,{...context,subject:'Mathematics'});assert.match(limited.message,/allowance/);assert.equal(calls,1);
  assert.equal((await db.query<{requests:number}>('SELECT requests FROM exam_search_months')).rows[0].requests,1); // student denial rolls back global reservation
  providerFailure=true;
  const failed=await examResearchService.discover(other,{...context,subject:'Mathematics'});assert.match(failed.message,/could not complete/);assert.equal(calls,2);
  assert.equal((await db.query<{requests:number}>('SELECT requests FROM exam_search_months')).rows[0].requests,2); // uncertain failures retain charge
  assert.match((await examResearchService.discover(other,{...context,subject:'Chemistry'})).message,/allowance/);assert.equal(calls,2);
  assert.equal((await examResearchService.discover(student,context)).sources.length,1);assert.equal(calls,2); // cached works over quota
  await db.exec("UPDATE exam_source_cache SET expires_at=NOW()-INTERVAL '1 day'");
  await assert.rejects(()=>examResearchService.resolveSelection(context,selection),/expired or changed/);
  providerFailure=false;oversized=true;await assert.rejects(()=>searchPublicSources(context),/too large/);assert.equal(calls,3);
  assert.equal((await examResearchService.discover(student,{...context,authority:'Unknown'})).sources.length,0);assert.equal(calls,3);
  console.log('PASS: safe links, bounded candidates and response, academic-label-only search, basic fixed-cost flags, absent key, busy guard, cross-user public cache, context-bound selection, fabricated ID rejection, expiry, atomic quotas and rollback, charged failures, no automatic retry, cache over quota. Real PGlite SQL, mocked provider and locks.');
}finally{globalThis.fetch=originalFetch;for(const [key,value] of Object.entries(env)){if(value===undefined)delete process.env[key];else process.env[key]=value;}setPoolForTesting(null);await db.close();}
