/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  FileText,
  Layers,
  RefreshCw,
  Target,
  Upload,
} from "lucide-react";
import { ActiveNavTab, StudyMaterial } from "../../types";
import { useAuth } from "../../context/AuthContext";
import {
  analyticsApi,
  type DashboardResponse,
} from "../../services/analyticsApi";
import { materialApi } from "../../services/materialApi";
import { useStudySession } from "../../hooks/useStudySession";
import { DocumentInspectModal } from "../DocumentInspectModal";

interface HomeViewProps {
  onNavigate: (tab: ActiveNavTab) => void;
  onOpenUpload: () => void;
  onOpenSummary: () => void;
  materialsRefreshTrigger?: number;
}

function materialState(material: StudyMaterial) {
  if (
    material.processingStatus === "failed" ||
    material.embeddingStatus === "failed"
  )
    return "Needs attention";
  if (
    material.processingStatus === "ready" &&
    material.embeddingStatus === "completed"
  )
    return "Ready to search";
  if (material.processingStatus === "ready") return "Preparing search";
  return material.processingStatus === "uploaded"
    ? "Waiting to process"
    : "Reading document";
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenUpload,
  materialsRefreshTrigger = 0,
}) => {
  const { user } = useAuth();
  useStudySession();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [materials, setMaterials] = useState<StudyMaterial[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<StudyMaterial | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load(initial = false) {
      if (initial) setLoading(true);
      const [stats, files] = await Promise.allSettled([
        analyticsApi.getDashboard(),
        materialApi.getMaterials(),
      ]);
      if (cancelled) return;
      const failures: string[] = [];
      if (stats.status === "fulfilled") setDashboard(stats.value);
      else failures.push("Your progress could not be refreshed.");
      if (files.status === "fulfilled") setMaterials(files.value.materials);
      else failures.push("Your materials could not be refreshed.");
      setErrors(failures);
      setLoading(false);
      // Refresh only while a document is waiting or actively processing.
      if (
        files.status === "fulfilled" &&
        files.value.materials.some(
          (m) =>
            m.processingStatus !== "failed" &&
            m.embeddingStatus !== "failed" &&
            (m.processingStatus !== "ready" ||
              m.embeddingStatus === "pending" ||
              m.embeddingStatus === "processing"),
        )
      )
        timer = setTimeout(() => {
          void load();
        }, 8000);
    }
    void load(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [materialsRefreshTrigger, revision]);

  const name =
    dashboard?.greeting.name || user?.profile?.full_name || "Student";
  const hasMaterials = materials !== null && materials.length > 0;
  const recent = [...(materials || [])]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 3);
  const metrics = [
    {
      label: "Study time this week",
      value: dashboard?.studyTimeThisWeek.formatted,
      icon: Clock3,
      tab: "my-progress",
    },
    {
      label: "Quizzes completed",
      value: dashboard?.quizzesCompleted.total,
      icon: Check,
      tab: "quizzes",
    },
    {
      label: "Average quiz score",
      value:
        dashboard && dashboard.quizzesCompleted.total > 0
          ? `${dashboard.averageQuizPercentage}%`
          : "—",
      icon: Target,
      tab: "my-progress",
    },
  ] as const;

  return (
    <div className="study-home space-y-7 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aven-action)] mb-2">
            Your study space
          </p>
          <h1 className="aven-page-title text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--aven-ink)]">
            Welcome back, {name}.
          </h1>
          <p className="mt-2 text-sm text-[var(--aven-muted)]">
            One small step today. A little more understood tomorrow.
          </p>
        </div>
        <button
          onClick={() => setRevision((v) => v + 1)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[var(--aven-muted)] disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {errors.join(" ")} Use Refresh to try again. Previously loaded
          information may be out of date.
        </div>
      )}

      <section className="aven-home-hero grid lg:grid-cols-[1.35fr_1fr] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-9 bg-[var(--aven-sage)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-900">
            <BookOpen size={14} />
            Start with what you’re learning
          </span>
          <h2 className="mt-5 max-w-lg text-3xl sm:text-[40px] leading-[1.15] font-semibold tracking-tight text-[var(--aven-ink)]">
            Your notes.
            <br />
            Your next breakthrough.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--aven-muted)]">
            Bring your study material together, find relevant passages, then
            build understanding through practice.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--aven-action)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--aven-action-hover)]"
            >
              <Upload size={17} />
              Upload material
            </button>
            <button
              onClick={() => onNavigate("study-kits")}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white/60"
            >
              Open library
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
        <div className="p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            A simple way to study
          </p>
          <ol className="mt-5 space-y-5">
            {[
              {
                title: "Bring your material",
                detail: "Upload a PDF or text document to your library.",
                action: onOpenUpload,
              },
              {
                title: "Explore your notes",
                detail: "Read extracted sections and search relevant passages.",
                action: () => onNavigate("study-kits"),
              },
              {
                title: "Put knowledge into practice",
                detail: "Use curriculum quizzes and review your results.",
                action: () => onNavigate("quizzes"),
              },
            ].map((step, i) => (
              <li key={step.title}>
                <button
                  onClick={step.action}
                  className="group flex w-full items-start gap-3 rounded-xl p-2 -m-2 text-left hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-[var(--aven-muted)]">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--aven-ink)] group-hover:text-[var(--aven-action)]">
                      {step.title}
                    </span>
                    <span className="block mt-1 text-xs leading-5 text-slate-500">
                      {step.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="grid sm:grid-cols-3 gap-3" aria-busy={loading}>
        {metrics.map(({ label, value, icon: Icon, tab }) => (
          <button
            key={label}
            onClick={() => onNavigate(tab)}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 text-sm text-slate-500">
              {label}
              <Icon size={18} />
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--aven-ink)]">
              {dashboard ? value : loading ? "…" : "Unavailable"}
            </div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--aven-ink)]">
              Your recent materials
            </h2>
            <button
              onClick={() => onNavigate("study-kits")}
              className="text-sm font-medium text-[var(--aven-action)] hover:underline"
            >
              View all
            </button>
          </div>
          {materials === null ? (
            <p role="status" className="py-10 text-sm text-slate-500">
              {loading
                ? "Loading your materials…"
                : "Materials are unavailable. Try Refresh."}
            </p>
          ) : !hasMaterials ? (
            <div className="my-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
              <FileText size={28} className="mx-auto text-slate-400" />
              <h3 className="mt-3 font-semibold text-[var(--aven-ink)]">
                Make room for your first idea
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Add some notes to start exploring your material.
              </p>
              <button
                onClick={onOpenUpload}
                className="mt-4 rounded-xl bg-[var(--aven-action)] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {recent.map((material) => (
                <button
                  key={material.id}
                  onClick={() => setSelected(material)}
                  className="flex w-full items-center gap-3 rounded-xl py-4 px-2 text-left hover:bg-slate-50"
                >
                  <span className="rounded-xl bg-blue-50 p-3 text-[var(--aven-action)]">
                    <FileText size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--aven-ink)]">
                      {material.title}
                    </span>
                    <span className="block mt-1 text-xs text-slate-500">
                      {material.subject || "Study material"}
                    </span>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-[11px] font-medium ${materialState(material) === "Needs attention" ? "bg-amber-50 text-amber-800" : materialState(material) === "Ready to search" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-[var(--aven-muted)]"}`}
                    >
                      {materialState(material)}
                    </span>
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-[var(--aven-soft)] p-5 sm:p-6">
          <span className="inline-flex rounded-xl bg-white p-3 text-[var(--aven-action)]">
            <Layers size={21} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-[var(--aven-ink)]">
            A little practice goes a long way
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--aven-muted)]">
            {dashboard?.weakTopics.length
              ? `Your results suggest reviewing ${dashboard.weakTopics[0].topic}. Revisit your weak topics to decide what to practise next.`
              : "Try a curriculum quiz, then use your results to choose what to review next."}
          </p>
          <button
            onClick={() =>
              onNavigate(
                dashboard?.weakTopics.length ? "weak-topics" : "quizzes",
              )
            }
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[var(--aven-action)] hover:bg-[var(--aven-soft)]"
          >
            {dashboard?.weakTopics.length
              ? "Review weak topics"
              : "Explore quizzes"}
            <ArrowRight size={16} />
          </button>
          <div className="mt-6 border-t border-[var(--aven-border)] pt-4">
            <button
              onClick={() => onNavigate("flashcards")}
              className="text-sm font-medium text-slate-700 hover:underline"
            >
              Prefer flashcards? Open your cards →
            </button>
          </div>
        </section>
      </div>
      <DocumentInspectModal
        isOpen={selected !== null}
        material={selected}
        initialTab="sections"
        onClose={() => setSelected(null)}
        onReprocessSuccess={() => setRevision((v) => v + 1)}
      />
    </div>
  );
};
