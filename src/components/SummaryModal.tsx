import React, { useEffect, useRef, useState } from "react";
import { materialApi } from "../services/materialApi";
import type { StudyMaterial } from "../types";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onStartQuiz?: () => void;
  onPracticeFlashcards?: () => void;
}
interface Summary {
  status: string;
  parts: { title: string; points: { text: string; pages: number[] }[] }[];
  totalParts: number;
  completedParts: number;
  model: string;
  error: string | null;
}
export const SummaryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selected, setSelected] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    let active = true;
    setLoading(true);
    setError("");
    materialApi
      .getMaterials()
      .then((res) => {
        if (!active) return;
        const ready = res.materials.filter(
          (m) => m.processingStatus === "ready",
        );
        setMaterials(ready);
        setSelected(ready[0]?.id || "");
      })
      .catch(() => {
        if (active)
          setError(
            "Could not load your library. Reopen this window to try again.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.current?.abort();
      dialog.current?.close();
      previous?.focus();
    };
  }, [isOpen]);
  useEffect(() => {
    setSummary(null);
    setRunning(false);
    if (!isOpen || !selected) return;
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    setError("");
    request(selected, "GET", abort.signal)
      .then(setSummary)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [selected, isOpen]);
  async function request(
    id: string,
    method: string,
    signal: AbortSignal,
  ): Promise<Summary> {
    const res = await fetch(
      `/api/materials/${encodeURIComponent(id)}/summary`,
      { method, credentials: "include", signal },
    );
    const body = await res.json();
    if (!res.ok)
      throw new Error(
        body.message || "Unable to load summary. Try again later.",
      );
    return body;
  }
  async function generate() {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    setError("");
    try {
      while (!abort.signal.aborted) {
        const next = await request(selected, "POST", abort.signal);
        if (abort.signal.aborted) break;
        setSummary(next);
        if (next.status === "ready") break;
        await new Promise<void>((resolve) => {
          const finish = () => {
            clearTimeout(timer);
            abort.signal.removeEventListener("abort", finish);
            resolve();
          };
          const timer = setTimeout(finish, 2000);
          abort.signal.addEventListener("abort", finish, { once: true });
        });
      }
    } catch (e) {
      if (!abort.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Unable to generate summary.",
        );
    } finally {
      if (!abort.signal.aborted) setRunning(false);
    }
  }
  function pause() {
    controller.current?.abort();
    setRunning(false);
  }
  if (!isOpen) return null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="summary-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-3xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-[var(--aven-border)] bg-[var(--aven-surface)] p-6 text-[var(--aven-ink)] shadow-xl backdrop:bg-slate-950/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="summary-title" className="text-3xl font-semibold">
            Your document, understood.
          </h2>
          <p className="mt-2 text-sm text-[var(--aven-muted)]">
            AI summaries grounded in your uploaded material.
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close summary"
          className="p-2 rounded-lg border"
        >
          ✕
        </button>
      </div>
      <label
        className="block mt-6 text-sm font-semibold"
        htmlFor="summary-material"
      >
        Choose your document
      </label>
      <select
        id="summary-material"
        className="mt-2 w-full rounded-xl border p-3 bg-[var(--aven-canvas)]"
        value={selected}
        disabled={running || loading}
        onChange={(e) => setSelected(e.target.value)}
      >
        {!materials.length && (
          <option value="">No processed documents yet</option>
        )}
        {materials.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <p className="mt-3 text-xs text-[var(--aven-muted)]">
        Generate sends extracted document text to Groq. Completed parts are
        saved. Closing pauses further parts; an in-progress part may finish.
        Page references use PDF page order.
      </p>
      <div className="my-5 flex flex-wrap items-center gap-3">
        {running ? (
          <button className="rounded-xl border px-4 py-2" onClick={pause}>
            Pause
          </button>
        ) : (
          <button
            disabled={!selected || loading || summary?.status === "ready"}
            onClick={generate}
            className="rounded-xl bg-[var(--aven-action)] text-white px-4 py-2 disabled:opacity-50"
          >
            {summary?.status === "ready"
              ? "Summary saved"
              : summary?.completedParts
                ? "Resume summary"
                : "Generate summary"}
          </button>
        )}
        <span role="status" className="text-sm">
          {loading
            ? "Loading…"
            : summary
              ? `${summary.completedParts} of ${summary.totalParts} parts saved${running ? " · Working…" : ""}`
              : ""}
        </span>
      </div>
      {(error || summary?.error) && (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 text-amber-950 p-3 mb-4"
        >
          {error || summary?.error}
        </p>
      )}
      {!selected && !loading && (
        <p>Upload a PDF or text document and wait for processing to finish.</p>
      )}
      {summary?.parts.map((part, i) => (
        <section key={i} className="border-t border-[var(--aven-border)] py-5">
          <h3 className="text-xl font-semibold">{part.title}</h3>
          <ul className="mt-3 space-y-4">
            {part.points.map((point, j) => (
              <li key={j}>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {point.text}
                </p>
                <span className="text-xs text-[var(--aven-muted)]">
                  Source pages: {point.pages.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!!summary?.parts.length && (
        <p className="text-xs text-[var(--aven-muted)] border-t pt-4">
          AI-generated study aid. Check important facts and formulas against the
          source.{" "}
          {summary.status !== "ready" ? "This summary is incomplete." : ""}
        </p>
      )}
    </dialog>
  );
};
