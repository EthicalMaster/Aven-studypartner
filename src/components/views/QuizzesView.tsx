import { PdfQuizSetup } from '../quiz/PdfQuizSetup';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { quizApi } from '../../services/quizApi';
import type {
  Quiz,
  QuizSession,
  DetailedQuizResult,
  QuizHistoryItem,
  ActiveNavTab,
} from '../../types';
import { QuizSetupView } from '../quiz/QuizSetupView';
import { QuizPaperPreview } from '../quiz/QuizPaperPreview';
import { ActiveQuizView } from '../quiz/ActiveQuizView';
import { QuizResultsView } from '../quiz/QuizResultsView';
import { QuizHistoryView } from '../quiz/QuizHistoryView';
import { useStudySession } from '../../hooks/useStudySession';

interface QuizzesViewProps {
  quizQuestions?: any[];
  studyKits?: any[];
  onNavigate?: (tab: ActiveNavTab) => void;
  onRecordQuizCompletion?: () => void;
}

type ViewScreen = 'home' | 'pdf' | 'setup' | 'preview' | 'active' | 'results';

export const QuizzesView: React.FC<QuizzesViewProps> = ({
  onNavigate,
  onRecordQuizCompletion,
}) => {
  useStudySession();
  const [screen, setScreen] = useState<ViewScreen>('home');
  const [activeTab, setActiveTab] = useState<'all' | 'PRACTICE' | 'EXAM' | 'history'>('all');

  // Quizzes list state
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active paper / session / results workflow
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [activeResult, setActiveResult] = useState<DetailedQuizResult | null>(null);

  // Load quizzes and history from real PostgreSQL backend
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [quizList, historyList] = await Promise.all([
        quizApi.getQuizzes(),
        quizApi.getHistory(),
      ]);
      setQuizzes(quizList);
      setHistory(historyList);
    } catch (err: any) {
      console.error('Failed to load quizzes:', err);
      setError(err.message || 'Failed to load quizzes from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler when a paper is built in QuizSetupView
  const handlePaperCreated = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setScreen('preview');
  };

  // Handler when user starts session from QuizPaperPreview
  const handleStartSession = (session: QuizSession) => {
    setActiveSession(session);
    setScreen('active');
  };

  // Handler when user finishes quiz in ActiveQuizView
  const handleQuizFinished = (result: DetailedQuizResult) => {
    setActiveResult(result);
    setScreen('results');
    loadData();
    if (onRecordQuizCompletion) {
      onRecordQuizCompletion();
    }
  };

  // Handler when user clicks "Preview & Start" on a quiz card
  const handleSelectQuizToPreview = (quiz: Quiz) => {
    setGenerationNotice(null);
    setSelectedQuiz(quiz);
    setScreen('preview');
  };

  // Retake paper handler
  const handleRetakePaper = () => {
    if (activeResult?.quiz?.id) {
      const q = quizzes.find((item) => item.id === activeResult.quiz.id);
      if (q) {
        setSelectedQuiz(q);
        setScreen('preview');
        return;
      }
    }
    setScreen('setup');
  };

  // Calculate real performance stats from history
  const totalAttempts = history.length;
  const avgAccuracy =
    totalAttempts > 0
      ? Math.round(
          history.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0) /
            totalAttempts
        )
      : 0;
  const totalQuestionsAnswered = history.reduce(
    (acc, curr) => acc + (Number(curr.attempted_questions) || 0),
    0
  );
  const totalStudySeconds = history.reduce(
    (acc, curr) => acc + (Number(curr.time_taken_seconds) || 0),
    0
  );

  const formatStudyTime = (secs: number) => {
    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  if (screen === 'pdf') return <PdfQuizSetup onCancel={() => setScreen('home')} onCreated={(quiz, notice) => {
    setQuizzes(previous => [quiz, ...previous.filter(q => q.id !== quiz.id)]);
    setGenerationNotice(notice);
    handlePaperCreated(quiz);
  }}/>;

  // 1. SETUP SCREEN
  if (screen === 'setup') {
    return (
      <QuizSetupView
        onPaperCreated={handlePaperCreated}
        onCancel={() => setScreen('home')}
      />
    );
  }

  // 2. PREVIEW SCREEN
  if (screen === 'preview' && selectedQuiz) {
    return (
      <QuizPaperPreview
        quiz={selectedQuiz}
        notice={generationNotice}
        onStartSession={handleStartSession}
        onBack={() => setScreen('home')}
      />
    );
  }

  // 3. ACTIVE QUIZ SCREEN
  if (screen === 'active' && activeSession) {
    return (
      <ActiveQuizView
        session={activeSession}
        onFinished={handleQuizFinished}
        onExit={() => {
          loadData();
          setScreen('home');
        }}
      />
    );
  }

  // 4. RESULTS SCREEN
  if (screen === 'results' && activeResult) {
    return (
      <QuizResultsView
        data={activeResult}
        onRetake={handleRetakePaper}
        onNewPaper={() => setScreen('setup')}
        onHome={() => setScreen('home')}
      />
    );
  }

  // 5. QUIZ HOME SCREEN
  const filteredQuizzes = quizzes.filter((q) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'PRACTICE') return q.mode === 'PRACTICE';
    if (activeTab === 'EXAM') return q.mode === 'EXAM';
    return true;
  });

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-6xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="aven-page-title text-[24px] font-bold text-[var(--aven-ink)] tracking-tight">
            Put your knowledge to work.
          </h1>
          <p className="text-[13px] text-[var(--aven-muted)] mt-0.5">
            Practice from your PDFs or the question bank, then review your answers and progress.
          </p>
        </div>

        <button
          onClick={() => {setGenerationNotice(null);setScreen('setup');}}
          className="px-5 py-2.5 rounded-2xl bg-[var(--aven-action)] hover:bg-[var(--aven-action)] text-white text-[13px] font-bold shadow-md shadow-[var(--aven-action)]/20 flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Build Quiz Paper</span>
        </button>
      </div>

      <section className="rounded-3xl border border-[var(--aven-border)] bg-[var(--aven-soft)] p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div><h2 className="text-xl font-semibold">Turn a PDF into practice.</h2>
          <p className="mt-2 text-sm text-[var(--aven-muted)]">Up to five multiple-choice questions, with explanations and source quotes after you finish. Saved papers are free to repeat.</p></div>
        <button onClick={() => {setGenerationNotice(null);setScreen('pdf');}} className="shrink-0 rounded-xl bg-[var(--aven-action)] text-white px-5 py-3 font-semibold">Quiz from PDF</button>
      </section>
      {/* Real Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[var(--aven-border)]/30 shadow-xs">
          <div className="flex items-center gap-2 text-[var(--aven-muted)] mb-1">
            <span className="material-symbols-outlined text-[18px] text-[var(--aven-action)]">
              description
            </span>
            <span className="text-[11px] uppercase tracking-wider font-bold">
              Papers Built
            </span>
          </div>
          <div className="text-[26px] font-black text-[var(--aven-ink)]">{quizzes.length}</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[var(--aven-border)]/30 shadow-xs">
          <div className="flex items-center gap-2 text-[var(--aven-muted)] mb-1">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">
              task_alt
            </span>
            <span className="text-[11px] uppercase tracking-wider font-bold">
              Completed Attempts
            </span>
          </div>
          <div className="text-[26px] font-black text-[var(--aven-ink)]">{totalAttempts}</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[var(--aven-border)]/30 shadow-xs">
          <div className="flex items-center gap-2 text-[var(--aven-muted)] mb-1">
            <span className="material-symbols-outlined text-[18px] text-amber-500">
              analytics
            </span>
            <span className="text-[11px] uppercase tracking-wider font-bold">
              Average Accuracy
            </span>
          </div>
          <div className="text-[26px] font-black text-[var(--aven-ink)]">{avgAccuracy}%</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[var(--aven-border)]/30 shadow-xs">
          <div className="flex items-center gap-2 text-[var(--aven-muted)] mb-1">
            <span className="material-symbols-outlined text-[18px] text-purple-600">
              schedule
            </span>
            <span className="text-[11px] uppercase tracking-wider font-bold">
              Assessment Time
            </span>
          </div>
          <div className="text-[26px] font-black text-[var(--aven-ink)]">
            {formatStudyTime(totalStudySeconds)}
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-[var(--aven-border)]/20 pb-2 overflow-x-auto">
        {[
          { id: 'all', label: `All Papers (${quizzes.length})` },
          {
            id: 'PRACTICE',
            label: `Practice Mode (${quizzes.filter((q) => q.mode === 'PRACTICE').length})`,
          },
          {
            id: 'EXAM',
            label: `Exam Mode (${quizzes.filter((q) => q.mode === 'EXAM').length})`,
          },
          { id: 'history', label: `Attempt History (${history.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[var(--aven-action)] text-white shadow-xs'
                : 'text-[var(--aven-muted)] hover:bg-[var(--aven-canvas)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <span className="material-symbols-outlined text-rose-600 text-[20px] shrink-0 mt-0.5">
            error
          </span>
          <p className="text-[13px] text-rose-800 font-medium">{error}</p>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="bg-white rounded-3xl p-16 border border-[var(--aven-border)]/30 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--aven-action)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[13px] text-[var(--aven-muted)]">Loading your papers…</p>
        </div>
      )}

      {/* History Tab View */}
      {!loading && activeTab === 'history' && (
        <QuizHistoryView
          onViewResult={(res) => {
            setActiveResult(res);
            setScreen('results');
          }}
          onNewQuiz={() => setScreen('setup')}
        />
      )}

      {/* Papers Grid View */}
      {!loading && activeTab !== 'history' && (
        <>
          {filteredQuizzes.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[var(--aven-border)]/30 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
              <span className="material-symbols-outlined text-[48px] text-[var(--aven-action)]/30 mb-2">
                quiz
              </span>
              <h3 className="text-[18px] font-bold text-[var(--aven-ink)]">
                No Quiz Papers Found
              </h3>
              <p className="text-[13px] text-[var(--aven-muted)] mt-1 mb-5 leading-relaxed">
                Create practice from an uploaded PDF or build a paper from the question bank.
              </p>
              <button
                onClick={() => {setGenerationNotice(null);setScreen('setup');}}
                className="px-6 py-2.5 rounded-xl bg-[var(--aven-action)] text-white text-[13px] font-bold hover:bg-[var(--aven-action)] transition-all"
              >
                Build Quiz Paper
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredQuizzes.map((q) => {
                const isExam = q.mode === 'EXAM';
                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-3xl p-6 border border-[var(--aven-border)]/30 shadow-xs flex flex-col justify-between gap-5 hover:border-[var(--aven-action)]/40 hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Tags & Mode */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--aven-action)] bg-[var(--aven-soft)] px-2.5 py-0.5 rounded-full border border-[var(--aven-action)]/20">
                            {q.subject}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--aven-muted)] bg-slate-100 px-2 py-0.5 rounded-full">
                            {q.difficulty}
                          </span>
                        </div>

                        {isExam ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            Exam
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Practice
                          </span>
                        )}
                      </div>

                      {/* Paper Title */}
                      <h3 className="text-[17px] font-bold text-[var(--aven-ink)] group-hover:text-[var(--aven-action)] transition-colors leading-snug mb-1">
                        {q.title}
                      </h3>
                      <p className="text-[12px] text-[var(--aven-muted)] line-clamp-1 mb-4">
                        {q.topic}
                      </p>

                      {/* Paper Specs Grid */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--aven-border)]/20 text-center">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--aven-muted)] block">
                            Questions
                          </span>
                          <span className="text-[15px] font-black text-[var(--aven-ink)]">
                            {q.question_count}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--aven-muted)] block">
                            Marks
                          </span>
                          <span className="text-[15px] font-black text-[var(--aven-action)]">
                            {q.total_marks}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--aven-muted)] block">
                            Time
                          </span>
                          <span className="text-[15px] font-black text-[var(--aven-ink)]">
                            {q.time_limit_minutes}m
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <button
                      onClick={() => handleSelectQuizToPreview(q)}
                      className="w-full py-2.5 rounded-xl bg-[var(--aven-soft)] hover:bg-[var(--aven-action)] text-[var(--aven-action)] hover:text-white text-[13px] font-bold border border-[var(--aven-action)]/20 hover:border-[var(--aven-action)] transition-all flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">play_circle</span>
                      <span>Preview & Start Paper</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
