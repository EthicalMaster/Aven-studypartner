import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { academicContextSchema, type AcademicContext } from '../../../shared/academic-context.js';
import type { ExamSourceCandidate } from '../../../shared/exam-research.js';
export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function researchKey(context: AcademicContext): string { return digest({ version: 1, context: academicContextSchema.parse(context) }); }
export function searchQuery(context: AcademicContext): string {
  // Only explicit academic labels, never a document title, passage or user identity.
  return [context.authority, context.level === 'university' ? context.program : 'school board', context.stage, context.subject,
    'official syllabus previous year question paper'].join(' ').slice(0, 650);
}
export function safeSourceUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    const host = url.hostname.toLowerCase();
    if (isIP(host) || host.includes(':') || !host.includes('.') || /\.(?:local|localhost|internal|test|invalid)$/.test(host)) return null;
    url.hash = '';
    return url;
  } catch { return null; }
}
export function parseSearchResults(value: unknown): ExamSourceCandidate[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as any).results)) throw new Error('Invalid search response');
  const sources: ExamSourceCandidate[] = [];
  const seen = new Set<string>();
  for (const row of (value as any).results.slice(0, 5)) {
    const url = safeSourceUrl(row?.url);
    if (!url || seen.has(url.href) || typeof row.title !== 'string' || typeof row.content !== 'string') continue;
    const title = row.title.trim().slice(0, 180), snippet = row.content.trim().slice(0, 800);
    if (!title || !snippet) continue;
    seen.add(url.href);
    sources.push({ id: digest(url.href), title, url: url.href, host: url.hostname, snippet });
  }
  return sources;
}
export async function searchPublicSources(context: AcademicContext): Promise<ExamSourceCandidate[]> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST', signal: abort.signal, redirect: 'error',
      headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery(context), search_depth: 'basic', auto_parameters: false,
        max_results: 5, topic: 'general', include_answer: false, include_raw_content: false, include_images: false }),
    });
    if (!response.ok || !response.body) throw new Error('Search unavailable');
    const reader = response.body.getReader();const decoder = new TextDecoder();let text = '', bytes = 0;
    try {
      while (true) {
        const next = await reader.read();if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 65536) { await reader.cancel();throw new Error('Search response too large'); }
        text += decoder.decode(next.value, { stream: true });
      }
    } finally { reader.releaseLock(); }
    text += decoder.decode();
    return parseSearchResults(JSON.parse(text));
  } finally { clearTimeout(timer); }
}
