import {QuizCurriculumLabel} from './QuizCurriculumLabel';
import { QuizSourceLinks } from './QuizSourceLinks';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { quizApi } from '../../services/quizApi';
import type { Quiz, QuizSession } from '../../types';

interface QuizPaperPreviewProps {
  quiz: Quiz;
  notice?: string | null;
  onStartSession: (session: QuizSession) => void;
  onBack: () => void;
}

export const QuizPaperPreview: React.FC<QuizPaperPreviewProps> = ({
  quiz,
  notice,
  onStartSession,
  onBack,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    try {
      setIsStarting(true);
      setError(null);
      const session = await quizApi.startSession(quiz.id);
      onStartSession(session);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize session on the server.');
      setIsStarting(false);
    }
  };

  const isExam = quiz.mode === 'EXAM';

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={isStarting}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--aven-action)] hover:underline mb-4"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to quizzes
      </button>

      {/* Error alert */}
      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <span className="material-symbols-outlined text-rose-600 text-[20px] shrink-0 mt-0.5">
            error
          </span>
          <p className="text-[13px] text-rose-800 font-medium">{error}</p>
        </div>
      )}

      {notice && <p role="status" className="mb-4 p-4 rounded-xl bg-amber-50 text-amber-900">{notice}</p>}
      {/* Official Paper Sheet */}
      <div className="bg-white rounded-3xl border border-[var(--aven-border)]/30 shadow-xs overflow-hidden">
        {/* Paper Header Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-[var(--aven-canvas)] to-white border-b border-[var(--aven-border)]/20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--aven-action)] bg-[var(--aven-soft)] px-2.5 py-1 rounded-full border border-[var(--aven-action)]/20">
                {quiz.subject}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--aven-muted)] bg-slate-100 px-2.5 py-1 rounded-full">
                {quiz.topic}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isExam ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                  Strict Exam Mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Practice Mode
                </span>
              )}
            </div>
          </div>

          <h1 className="text-[24px] sm:text-[28px] font-bold text-[var(--aven-ink)] tracking-tight mb-2">
            {quiz.title}
          </h1>
          <p className="text-[13px] text-[var(--aven-muted)]">
            {quiz.source === 'uploaded_material'
              ? 'AI practice from selected PDF passages. Explanations and source quotes appear after submission. This is not a verified past paper.'
              : 'Practice paper compiled from the question bank.'}
          </p>
        </div>

        {quiz.source !== 'uploaded_material' && <QuizCurriculumLabel quizId={quiz.id}/>}
        {quiz.source === 'uploaded_material' && <QuizSourceLinks quizId={quiz.id}/>}
        {/* Paper Specifications Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-[var(--aven-border)]/20 bg-[#fafbff]/50">
          <div className="p-3.5 bg-white rounded-2xl border border-[var(--aven-border)]/20">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--aven-muted)] block mb-1">
              Questions
            </span>
            <span className="text-[20px] font-bold text-[var(--aven-ink)]">
              {quiz.question_count}
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-[var(--aven-border)]/20">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--aven-muted)] block mb-1">
              Maximum Marks
            </span>
            <span className="text-[20px] font-bold text-[var(--aven-action)]">
              {quiz.total_marks}
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-[var(--aven-border)]/20">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--aven-muted)] block mb-1">
              Allocated Time
            </span>
            <span className="text-[20px] font-bold text-[var(--aven-ink)]">
              {quiz.time_limit_minutes}m
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-[var(--aven-border)]/20">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--aven-muted)] block mb-1">
              Marking Scheme
            </span>
            <span className="text-[14px] font-bold text-[var(--aven-ink)] mt-1 block">
              {quiz.negative_marking
                ? `-${quiz.negative_mark_value} for incorrect`
                : 'No negative marks'}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 sm:p-8 flex flex-col gap-4">
          <h3 className="text-[14px] font-bold text-[var(--aven-ink)] uppercase tracking-wider">
            Before you begin
          </h3>

          <ul className="space-y-3 text-[13px] text-[var(--aven-muted)] leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[var(--aven-action)] shrink-0 mt-0.5">
                timer
              </span>
              <span>
                <strong>Timed practice:</strong> The timer starts when you begin. When time runs out, your saved answers are submitted for scoring.
              </span>
            </li>

            <li className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[var(--aven-action)] shrink-0 mt-0.5">
                save
              </span>
              <span>
                <strong>Stay connected:</strong> Answers are saved as you work. Keep an internet connection and check for any saving errors before submitting.
              </span>
            </li>

            {isExam ? (
              <li className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900">
                <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0 mt-0.5">
                  warning
                </span>
                <span>
                  <strong>Exam mode:</strong> Switching tabs or minimizing the window automatically submits your paper. Stay on this page until you finish.
                </span>
              </li>
            ) : (
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0 mt-0.5">
                  school
                </span>
                <span>
                  <strong>Review and learn:</strong> After submitting, review the correct answers and explanations. PDF quizzes also include supporting source quotes; compare them with your notes.
                </span>
              </li>
            )}
          </ul>

          {/* Action Row */}
          <div className="mt-6 pt-6 border-t border-[var(--aven-border)]/20 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              disabled={isStarting}
              className="px-5 py-2.5 rounded-xl border border-[var(--aven-border)]/40 text-[13px] font-semibold text-[var(--aven-muted)] hover:bg-[var(--aven-canvas)] transition-all"
            >
              Back to quizzes
            </button>

            <button
              type="button"
              onClick={handleStart}
              disabled={isStarting}
              className={`px-8 py-3 rounded-2xl text-[14px] font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                isExam
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-[var(--aven-action)] hover:bg-[var(--aven-action)] shadow-[var(--aven-action)]/20'
              }`}
            >
              {isStarting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Starting Assessment...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  <span>Start Assessment Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
