import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { setPoolForTesting } from '../db/connection.js';
import { reserveTokens,settleTokens,reserveEstimate } from '../services/ai/token-budget.js';
const db=await PGlite.create();
setPoolForTesting({query:async(sql:string,args:any[])=>db.query(sql,args)});
try {
 await db.exec(readFileSync(new URL('../db/migrations/018_ai_token_budget.sql',import.meta.url),'utf8'));
 process.env.AI_DAILY_TOKEN_BUDGET='1000';
 const outcomes=await Promise.allSettled([reserveTokens(600),reserveTokens(600)]);
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 const id=(outcomes.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<string>).value;
 await settleTokens(id,200);await settleTokens(id,200);
 assert.equal(Number((await db.query<{tokens: number}>('SELECT tokens FROM ai_token_days')).rows[0].tokens),200);
 const pending=await reserveTokens(800);await settleTokens(pending,undefined);
 await assert.rejects(()=>reserveTokens(1));
 assert(reserveEstimate('你好',10)>reserveEstimate('hi',10));
 process.env.AI_DAILY_TOKEN_BUDGET='invalid';await assert.rejects(()=>reserveTokens(1));
 console.log('PASS: concurrent cap, idempotent reconciliation, unknown usage retained, UTF-8 estimate, invalid config.');
}finally{setPoolForTesting(null);await db.close();}
