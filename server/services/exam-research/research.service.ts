import { academicContextSchema, type AcademicContext } from '../../../shared/academic-context.js';
import { researchSelectionSchema, type ExamResearchResult, type ExamSourceCandidate } from '../../../shared/exam-research.js';
import { getRequiredPool } from '../../db/connection.js';
import { AIGatewayError } from '../ai/errors.js';
import { researchKey, searchPublicSources } from './search.js';

const empty = (message: string): ExamResearchResult => ({ cacheKey: null, sources: [], fetchedAt: null, cached: false, message });
const integer = (value: string | undefined, fallback: number, max: number) => {
  const parsed = Number(value);return Number.isInteger(parsed) && parsed >= 0 && value?.trim() ? Math.min(parsed, max) : fallback;
};
export const examResearchService = {
  async discover(studentId: string, input: unknown): Promise<ExamResearchResult> {
    const context = academicContextSchema.parse(input);
    if (/^(?:unknown|other|n\/?a)$/i.test(context.authority)) return empty('Enter your awarding university or board to search, or continue with PDF-only practice.');
    const key = researchKey(context);
    const client = await getRequiredPool().connect();let acquired = false;
    try {
      acquired = (await client.query('SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired', [`aven-research:${key}`])).rows[0].acquired;
      if (!acquired) return empty('A search for these study details is already running. Continue with PDF-only practice or try again shortly.');
      const cached = await client.query('SELECT sources, fetched_at FROM exam_source_cache WHERE context_key=$1 AND expires_at > NOW()', [key]);
      if (cached.rows[0]) return { cacheKey: key, sources: cached.rows[0].sources, fetchedAt: new Date(cached.rows[0].fetched_at).toISOString(), cached: true,
        message: 'Saved search candidates. Check the institution, program, subject, semester and paper year before selecting.' };
      if (!process.env.TAVILY_API_KEY?.trim()) return empty('Web search is not configured. You can still create PDF-only practice.');
      const monthlyLimit = integer(process.env.EXAM_SEARCH_MONTHLY_LIMIT, 500, 900);
      const dailyLimit = integer(process.env.EXAM_SEARCH_DAILY_LIMIT, 5, 20);
      // Reserve before calling the provider. Unknown failures retain their reservation.
      await client.query('BEGIN');
      try {
        const global = await client.query(`INSERT INTO exam_search_months(month,requests)
          SELECT date_trunc('month', NOW() AT TIME ZONE 'UTC')::date,1 WHERE $1::int > 0
          ON CONFLICT(month) DO UPDATE SET requests=exam_search_months.requests+1 WHERE exam_search_months.requests < $1 RETURNING requests`, [monthlyLimit]);
        const student = await client.query(`INSERT INTO exam_search_student_days(student_id,day,requests)
          SELECT $1,(NOW() AT TIME ZONE 'UTC')::date,1 WHERE $2::int > 0
          ON CONFLICT(student_id,day) DO UPDATE SET requests=exam_search_student_days.requests+1 WHERE exam_search_student_days.requests < $2 RETURNING requests`, [studentId,dailyLimit]);
        if (!global.rows.length || !student.rows.length) {
          await client.query('ROLLBACK');return empty('The web-search allowance is used up. Saved papers and PDF-only practice are still available.');
        }
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK');throw error; }
      let sources: ExamSourceCandidate[];
      try { sources = await searchPublicSources(context); }
      catch { return empty('Web search could not complete. No automatic retry was made. Continue with PDF-only practice or try later.'); }
      const result = await client.query(`INSERT INTO exam_source_cache(context_key,sources,expires_at) VALUES($1,$2,NOW()+INTERVAL '7 days')
        ON CONFLICT(context_key) DO UPDATE SET sources=EXCLUDED.sources, fetched_at=NOW(), expires_at=EXCLUDED.expires_at RETURNING fetched_at`, [key,JSON.stringify(sources)]);
      return { cacheKey: key, sources, fetchedAt: new Date(result.rows[0].fetched_at).toISOString(), cached: false,
        message: sources.length ? 'Candidate links, not verified papers. Open and check each source before selecting.' : 'No usable source links found. Continue with PDF-only practice.' };
    } finally {
      let discard = false;
      if (acquired) {try {await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [`aven-research:${key}`]);}catch{discard=true;}}
      client.release(discard);
    }
  },
  async resolveSelection(context: AcademicContext, input: unknown): Promise<ExamSourceCandidate[]> {
    const parsed = researchSelectionSchema.safeParse(input);
    if (!parsed.success || parsed.data.cacheKey !== researchKey(context)) throw new AIGatewayError('RESEARCH_SELECTION_INVALID',422,'Study details changed. Review sources again or continue with PDF-only practice.');
    const result = await getRequiredPool().query('SELECT sources FROM exam_source_cache WHERE context_key=$1 AND expires_at > NOW()', [parsed.data.cacheKey]);
    const candidates: ExamSourceCandidate[] = result.rows[0]?.sources || [];
    const ids = [...new Set(parsed.data.sourceIds)];
    const selected = ids.map(id => candidates.find(source => source.id === id));
    if (selected.some(source => !source)) throw new AIGatewayError('RESEARCH_EXPIRED',422,'These source results expired or changed. Review sources again or continue with PDF-only practice.');
    return selected as ExamSourceCandidate[];
  },
};
