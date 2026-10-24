import { z } from "zod";
import {
  AIRequestInvalidError,
  AIStructuredOutputError,
} from "../ai/errors.js";
export interface Page {
  page_number: number;
  text: string;
}
export interface Batch {
  text: string;
  pages: number[];
}
export const summarySchema = z
  .object({
    title: z.string().min(1).max(160),
    points: z
      .array(
        z
          .object({
            text: z.string().min(1).max(1200),
            pages: z.array(z.number().int().positive()).min(1).max(30),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();
export type SummaryPart = z.infer<typeof summarySchema>;
export const summaryJsonSchema = {
  name: "document_summary",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "points"],
    properties: {
      title: { type: "string" },
      points: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["text", "pages"],
          properties: {
            text: { type: "string" },
            pages: { type: "array", items: { type: "integer" } },
          },
        },
      },
    },
  },
};
/** Partition every extracted character in source order, never top-K retrieval. */
export function buildBatches(pages: Page[], budget = 7000): Batch[] {
  if (budget < 1000)
    throw new AIRequestInvalidError(
      "AI input limit is too small for summaries.",
    );
  const useful = pages.filter((p) => p.text.trim());
  if (!useful.length)
    throw new AIRequestInvalidError(
      "No readable text found. Scanned PDFs need text extraction/OCR first.",
    );
  if (useful.reduce((n, p) => n + p.text.length, 0) > 84000)
    throw new AIRequestInvalidError(
      "This preview supports up to 84,000 extracted characters. Upload a chapter or shorter PDF.",
    );
  const batches: Batch[] = [];
  let current: Batch = { text: "", pages: [] };
  for (const page of useful) {
    for (let offset = 0; offset < page.text.length;) {
      const marker = `\n[Page ${page.page_number}]\n`;
      if (budget - current.text.length < marker.length + 100) {
        batches.push(current);
        current = { text: "", pages: [] };
      }
      const size = Math.min(
        page.text.length - offset,
        budget - current.text.length - marker.length,
      );
      current.text += marker + page.text.slice(offset, offset + size);
      offset += size;
      if (!current.pages.includes(page.page_number))
        current.pages.push(page.page_number);
    }
  }
  if (current.text) batches.push(current);
  if (batches.length > 16)
    throw new AIRequestInvalidError(
      "Too many summary parts for the configured input limit. Use a shorter document.",
    );
  return batches;
}
export function validatePart(value: unknown, batch: Batch): SummaryPart {
  const parsed = summarySchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.points.some((p) =>
      p.pages.some((n) => !batch.pages.includes(n)),
    )
  ) {
    throw new AIStructuredOutputError(
      "The summary contained invalid content or page references. Resume to retry this part.",
    );
  }
  return parsed.data;
}
