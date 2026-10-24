import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { setPoolForTesting } from "../db/connection.js";
import { materialSummary } from "../services/summaries/summary.service.js";
import { buildBatches, validatePart } from "../services/summaries/content.js";
import { aiGatewayService } from "../services/ai/gateway.service.js";
import { reloadAIConfig } from "../services/ai/config.js";
import { GroqAIProvider } from "../services/ai/providers/groq.provider.js";
import { quotaService } from "../services/governance/quota.service.js";
const dir = mkdtempSync(join(tmpdir(), "aven-summary-"));
let db = await PGlite.create(dir);
function attach() {
  setPoolForTesting({
    query: async (sql: string, params?: any[]) => {
      const r = await db.query(sql, params);
      return { rows: r.rows, rowCount: r.affectedRows };
    },
  });
}
const id = "00000000-0000-4000-8000-000000000001";
const student = "00000000-0000-4000-8000-000000000002";
const oldFetch = globalThis.fetch,
  oldExecute = aiGatewayService.execute;
try {
  process.env.AI_PROVIDER = "groq";
  process.env.AI_MODEL = "openai/gpt-oss-20b";
  process.env.GROQ_API_KEY = "fake-test-only";
  reloadAIConfig();
  attach();
  await db.exec(
    "CREATE TABLE study_materials(id uuid PRIMARY KEY,student_id uuid,processing_status text); CREATE TABLE document_pages(material_id uuid REFERENCES study_materials ON DELETE CASCADE,page_number int,text text);",
  );
  const migration = readFileSync(
    new URL("../db/migrations/017_material_summaries.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
  await db.query("INSERT INTO study_materials VALUES($1,$2,$3)", [
    id,
    student,
    "ready",
  ]);
  await db.query("INSERT INTO document_pages VALUES($1,1,$2),($1,2,$3)", [
    id,
    "Physics explains motion. ".repeat(320),
    "Energy is conserved. ".repeat(220),
  ]);
  const all = buildBatches([
    { page_number: 1, text: "a".repeat(14001) },
    { page_number: 2, text: "END" },
  ]);
  assert.equal(
    all.map((b) => b.text.replace(/\n\[Page \d+\]\n/g, "")).join(""),
    "a".repeat(14001) + "END",
  );
  assert.throws(() =>
    buildBatches([{ page_number: 1, text: "x".repeat(84001) }]),
  );
  assert.throws(() => buildBatches([{ page_number: 1, text: "   " }]));
  assert.throws(() =>
    validatePart(
      { title: "Bad", points: [{ text: "Fact", pages: [99] }] },
      all[0],
    ),
  );
  let calls = 0;
  let release: (() => void) | undefined;
  let hold = false;
  aiGatewayService.execute = async (input) => {
    calls++;
    if (hold) await new Promise<void>((r) => (release = r));
    const source = JSON.parse(input.messages![1].content);
    const page = Number(source.documentText.match(/\[Page (\d+)\]/)[1]);
    return {
      requestId: "test",
      provider: "groq",
      model: "test",
      text: "",
      parsedJson: {
        title: "Study notes",
        points: [{ text: "A supported fact.", pages: [page] }],
      },
      finishReason: "stop",
      latencyMs: 1,
    };
  };
  const successfulGeneration = aiGatewayService.execute;
  const initial = await materialSummary(id, student);
  assert.equal(initial.completedParts, 0);
  assert.equal(calls, 0);
  await assert.rejects(
    () => materialSummary(id, "00000000-0000-4000-8000-000000000099", true),
    /not found/,
  );
  assert.equal(calls, 0);
  hold = true;
  const first = materialSummary(id, student, true);
  while (!release) await new Promise((r) => setTimeout(r, 5));
  const concurrent = await materialSummary(id, student, true);
  assert.equal(concurrent.status, "processing");
  assert.equal(calls, 1);
  release();
  await first;
  hold = false;
  // Persisted checkpoint survives closing and reopening the database.
  await db.close();
  db = await PGlite.create(dir);
  attach();
  assert.equal((await materialSummary(id, student)).completedParts, 1);
  let result = await materialSummary(id, student, true);
  while (result.status !== "ready")
    result = await materialSummary(id, student, true);
  const count = calls;
  await materialSummary(id, student, true);
  assert.equal(calls, count);
  await db.query(
    "UPDATE document_pages SET text=$2 WHERE material_id=$1 AND page_number=2",
    [id, "Changed source."],
  );
  assert.equal((await materialSummary(id, student)).completedParts, 0);
  aiGatewayService.execute = async () => {
    throw new Error("secret-internal-message");
  };
  await assert.rejects(
    () => materialSummary(id, student, true),
    /Summary generation failed/,
  );
  assert.equal((await materialSummary(id, student)).status, "failed");
  // An interrupted lease can be recovered after expiry.
  await db.query(
    "UPDATE material_summaries SET status='processing',lease_until=NOW()-INTERVAL '1 second',lease_token=$2 WHERE material_id=$1",
    [id, student],
  );
  aiGatewayService.execute = successfulGeneration;
  assert.equal((await materialSummary(id, student, true)).completedParts, 1);
  aiGatewayService.execute = oldExecute;
  const provider = new GroqAIProvider();
  const req = {
    requestId: "x",
    studentId: student,
    purpose: "test" as const,
    prompt: "JSON summary",
    responseFormat: "json_object" as const,
  };
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options!.body as string);
    assert.equal(body.model, "openai/gpt-oss-20b");
    assert.equal(body.response_format.type, "json_object");
    return new Response(
      JSON.stringify({
        choices: [
          { finish_reason: "stop", message: { content: '{"ok":true}' } },
        ],
        usage: { total_tokens: 10 },
      }),
      { status: 200 },
    );
  };
  assert.deepEqual((await provider.generate(req)).parsedJson, { ok: true });
  for (const [status, code] of [
    [429, "AI_PROVIDER_RATE_LIMITED"],
    [401, "AI_PROVIDER_AUTHENTICATION_ERROR"],
    [500, "AI_PROVIDER_UNAVAILABLE"],
  ] as const) {
    globalThis.fetch = async () => new Response("secret", { status });
    await assert.rejects(
      () => provider.generate(req),
      (e: any) => {
        assert(!e.message.includes("secret"));
        return e.statusCode >= 400;
      },
    );
  }
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [{ finish_reason: "length", message: { content: "{}" } }],
      }),
    );
  await assert.rejects(() => provider.generate(req), /incomplete/);
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [{ finish_reason: "stop", message: { content: "invalid" } }],
      }),
    );
  await assert.rejects(() => provider.generate(req));
  process.env.AI_REQUEST_TIMEOUT_MS = "10";
  reloadAIConfig();
  globalThis.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options!.signal!.addEventListener(
        "abort",
        () => reject(new Error("aborted")),
        { once: true },
      );
    });
  await assert.rejects(
    () => provider.generate(req),
    (e: any) => e.code === "AI_PROVIDER_TIMEOUT",
  );
  process.env.AI_REQUEST_TIMEOUT_MS = "30000";
  reloadAIConfig();
  delete process.env.GROQ_API_KEY;
  await assert.rejects(() => provider.generate(req));
  process.env.GROQ_API_KEY = "fake-test-only";
  // Missing durable quota storage fails closed instead of using a fresh memory budget.
  assert.equal(
    (await quotaService.checkAndIncrementAiQuota(student)).allowed,
    false,
  );
  await db.query("DELETE FROM study_materials WHERE id=$1", [id]);
  assert.equal(
    (await db.query("SELECT * FROM material_summaries")).rows.length,
    0,
  );
  console.log(
    "PASS: full-source coverage, size/empty guards, citations, ownership, deduplication, durable checkpoints, cache invalidation, sanitized errors, provider failures, fail-closed quotas, cascade deletion. No live API calls.",
  );
} finally {
  globalThis.fetch = oldFetch;
  aiGatewayService.execute = oldExecute;
  setPoolForTesting(null);
  await db.close();
  rmSync(dir, { recursive: true, force: true });
}
