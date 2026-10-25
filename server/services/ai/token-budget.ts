import { randomUUID } from 'node:crypto';
import { getRequiredPool } from '../../db/connection.js';
import { AIGatewayError } from './errors.js';

// UTF-8 bytes conservatively bound text tokens; include schema and protocol overhead.
export function reserveEstimate(payload: string, output: number): number {
  return Buffer.byteLength(payload, 'utf8') + output + 512;
}
export async function reserveTokens(amount: number): Promise<string> {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new AIGatewayError('AI_BUDGET_CONFIG',503,'Invalid token reservation.');
  const configured = process.env.AI_DAILY_TOKEN_BUDGET || '100000';
  const limit = Number(configured);
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new AIGatewayError('AI_BUDGET_CONFIG',503,'Invalid server AI budget configuration.');
  const id = randomUUID();
  try {
    const res = await getRequiredPool().query(`WITH charged AS (
      INSERT INTO ai_token_days(day,tokens) SELECT CURRENT_DATE,$1::bigint WHERE $1::bigint <= $2::bigint
      ON CONFLICT(day) DO UPDATE SET tokens=ai_token_days.tokens+EXCLUDED.tokens
      WHERE ai_token_days.tokens+EXCLUDED.tokens <= $2::bigint RETURNING day
    ) INSERT INTO ai_token_reservations(id,day,reserved) SELECT $3,day,$1 FROM charged RETURNING id`,[amount,limit,id]);
    if (!res.rows.length) throw new AIGatewayError('AI_TOKEN_BUDGET',429,'Aven’s daily AI budget is currently full. Try again after midnight UTC. Saved work is safe.');
    return id;
  } catch(error) {
    if(error instanceof AIGatewayError) throw error;
    throw new AIGatewayError('AI_BUDGET_UNAVAILABLE',503,'AI usage tracking is unavailable. Please try again later.');
  }
}
export async function settleTokens(id: string, actual: unknown): Promise<void> {
  // Unknown usage retains the reservation, including provider/network failures.
  if(typeof actual !== 'number' || !Number.isSafeInteger(actual) || actual < 0) return;
  await getRequiredPool().query(`WITH settled AS (
    UPDATE ai_token_reservations SET actual=$2 WHERE id=$1 AND actual IS NULL RETURNING day,reserved
  ) UPDATE ai_token_days d SET tokens=d.tokens+s.delta FROM
    (SELECT day,SUM($2::bigint-reserved) AS delta FROM settled GROUP BY day) s WHERE d.day=s.day`,[id,actual]);
}
