import type {CurriculumContext} from '../../../shared/curriculum-catalog';
import {settingsRequest,fieldClass} from '../settings/settingsApi';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { quizApi } from '../../services/quizApi';
import { adaptiveApi, type TopicMasteryData } from '../../services/adaptiveApi';
import type { Quiz, QuestionBankMeta, QuizMode, QuizQuestionType } from '../../types';

interface QuizSetupViewProps {
  onPaperCreated: (quiz: Quiz) => void;
  onCancel: () => void;
}

export const QuizSetupView: React.FC<QuizSetupViewProps> = ({ onPaperCreated, onCancel }) => {
  const [bankMode,setBankMode]=useState<'general'|'school'|'university'>('general');
  const [catalog,setCatalog]=useState<CurriculumContext[]>([]),[catalogError,setCatalogError]=useState(''),[contextId,setContextId]=useState('');
  const context=catalog.find(c=>c.id===contextId);
  useEffect(()=>{let active=true;settingsRequest<{contexts:CurriculumContext[]}>('/api/quizzes/bank/catalog').then(data=>{if(active)setCatalog(data.contexts);}).catch(()=>{if(active)setCatalogError('Could not load curriculum mappings. General practice is still available.');});return()=>{active=false;};},[]);
  const [meta, setMeta] = useState<QuestionBankMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configuration state
  const [title, setTitle] = useState<string>('');
  const [mode, setMode] = useState<QuizMode>('PRACTICE');
  const [subject, setSubject] = useState<string>('Physics');
  const [topic, setTopic] = useState<string>('Gauss Law & Spherical Shells');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(15);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [selectedTypes, setSelectedTypes] = useState<QuizQuestionType[]>([
    'MCQ',
    'MULTIPLE_SELECT',
    'TRUE_FALSE',
    'FILL_BLANK',
  ]);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState<number>(0.25);
  const [randomization, setRandomization] = useState<boolean>(true);
  const [availableQuestionsCount, setAvailableQuestionsCount] = useState<number | null>(null);
  const [isCheckingCount, setIsCheckingCount] = useState<boolean>(false);
  const [adaptiveTopics, setAdaptiveTopics] = useState<TopicMasteryData[]>([]);

  // Load question bank metadata and adaptive model on mount
  useEffect(() => {
    let active=true;
    if(bankMode!=='general'&&!contextId){setMeta(null);setSubject('');setLoadingMeta(false);return;}
    async function loadData() {
      try {
        setLoadingMeta(true);
        const [data, adaptiveData] = await Promise.all([
          quizApi.getQuestionBankMeta(contextId||undefined),
          adaptiveApi.getTopics().catch(() => ({ topics: [] })),
        ]);
        if(!active)return;
        setMeta(data);
        setAdaptiveTopics(adaptiveData?.topics || []);
        if(!data.subjects.length){setSubject('');setTopic('');}
        if (data.subjects.length > 0) {
          const firstSub = data.subjects[0];
          setSubject(firstSub.name);
          if (firstSub.topics.length > 0) {
            setTopic(firstSub.topics[0]);
          }
          setTitle(`${firstSub.name} • ${firstSub.topics[0] || 'Paper'} Assessment`);
        }
      } catch (err: any) {
        if(active){setMeta(null);setSubject('');setErrorMessage('Could not load subjects. Try reopening the paper builder.');}
      } finally {
        if(active)setLoadingMeta(false);
      }
    }
    loadData();
    return()=>{active=false;};
  }, [contextId,bankMode]);

  // Update topics when subject changes
  const currentSubjectData = meta?.subjects.find((s) => s.name === subject);
  const currentTopics = currentSubjectData ? currentSubjectData.topics : [];

  const selectedTopicAdaptive = adaptiveTopics.find(
    (t) => t.subject.toLowerCase() === subject.toLowerCase() && t.topic.toLowerCase() === topic.toLowerCase()
  );

  const handleSubjectChange = (newSub: string) => {
    setSubject(newSub);
    const subObj = meta?.subjects.find((s) => s.name === newSub);
    const firstTop = subObj?.topics[0] || 'General';
    setTopic(firstTop);
    setTitle(`${newSub} • ${firstTop} Assessment`);
  };

  const handleTopicChange = (newTop: string) => {
    setTopic(newTop);
    setTitle(`${subject} • ${newTop} Assessment`);
  };

  // Check available count whenever question bank criteria changes
  useEffect(() => {
    let active = true;
    async function checkCount() {
      if (!subject) return;
      setIsCheckingCount(true);
      try {
        const count = await quizApi.countAvailableQuestions({
          subject,
          curriculum_context_id:contextId||undefined,
          topic: topic === 'All Topics' ? undefined : topic,
          difficulty: difficulty.toLowerCase() === 'mixed' ? undefined : difficulty,
          question_types: selectedTypes,
        });
        if (active) {
          setAvailableQuestionsCount(count);
          if (errorMessage && errorMessage.includes('Requested')) {
            setErrorMessage(null);
          }
        }
      } catch {
        if (active) setAvailableQuestionsCount(null);
      } finally {
        if (active) setIsCheckingCount(false);
      }
    }

    const timer = setTimeout(checkCount, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [subject, topic, difficulty, selectedTypes,contextId]);

  const toggleQuestionType = (t: QuizQuestionType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length === 1) return; // Keep at least one
      setSelectedTypes(selectedTypes.filter((type) => type !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if(!subject||loadingMeta||(bankMode!=='general'&&!contextId)){setErrorMessage('Choose an available curriculum and subject first.');return;}

    if (availableQuestionsCount !== null && availableQuestionsCount < questionCount) {
      setErrorMessage(
        `Insufficient questions: You requested ${questionCount} questions, but only ${availableQuestionsCount} match your selected criteria. Please lower the question count or expand the topics/question types.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await quizApi.createQuiz({
        title: title.trim() || `${subject} Assessment`,
        mode,
        source: 'question_bank',
        curriculum_context_id:contextId||undefined,
        subject,
        topic,
        question_count: questionCount,
        time_limit_minutes: timeLimitMinutes,
        difficulty: difficulty.toLowerCase(),
        question_types: selectedTypes,
        negative_marking: negativeMarking,
        negative_mark_value: negativeMarking ? negativeMarkValue : 0,
        randomization,
      });

      onPaperCreated(res.quiz);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate quiz paper.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-[var(--aven-border)]/30 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[var(--aven-action)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[14px] text-[var(--aven-muted)] font-medium">Loading curriculum question bank...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--aven-action)] hover:underline mb-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Quiz Overview
          </button>
          <h2 className="text-[24px] font-bold text-[var(--aven-ink)] tracking-tight">
            Quiz Paper Builder
          </h2>
          <p className="text-[13px] text-[var(--aven-muted)] mt-0.5">
            Build a practice paper from the question bank. Choose a collection, subject and question format.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-[var(--aven-border)]/30 shadow-xs flex flex-col gap-6">
        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <span className="material-symbols-outlined text-rose-600 text-[20px] shrink-0 mt-0.5">
              error
            </span>
            <div className="text-[13px] text-rose-800 leading-relaxed font-medium">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Paper Title */}
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)] mb-1.5">
            Assessment Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Physics • Gauss Law Midterm Drill"
            className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)]/40 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-[var(--aven-ink)] placeholder-[var(--aven-muted)] outline-none focus:border-[var(--aven-action)] transition-all"
          />
        </div>

        {/* Mode Selector */}
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)] mb-2">
            Assessment Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('PRACTICE')}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                mode === 'PRACTICE'
                  ? 'bg-[var(--aven-soft)] border-[var(--aven-action)] ring-1 ring-[var(--aven-action)]'
                  : 'bg-white border-[var(--aven-border)]/30 hover:bg-[var(--aven-canvas)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[var(--aven-ink)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--aven-action)]">menu_book</span>
                  Practice Mode
                </span>
                {mode === 'PRACTICE' && (
                  <span className="w-2 h-2 rounded-full bg-[var(--aven-action)]"></span>
                )}
              </div>
              <p className="text-[12px] text-[var(--aven-muted)] leading-relaxed">
                Standard paced learning session. Explanations and answer breakdown unlocked immediately upon paper submission.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('EXAM')}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                mode === 'EXAM'
                  ? 'bg-rose-50/50 border-rose-600 ring-1 ring-rose-600'
                  : 'bg-white border-[var(--aven-border)]/30 hover:bg-[var(--aven-canvas)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[var(--aven-ink)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-rose-600">verified_user</span>
                  Exam Mode (Proctored)
                </span>
                {mode === 'EXAM' && (
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                )}
              </div>
              <p className="text-[12px] text-[var(--aven-muted)] leading-relaxed">
                Strict exam conditions. Automatic submission on tab switch, window minimization, or app defocus via Page Visibility API.
              </p>
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-[var(--aven-border)] p-4 space-y-3">
          <h2 className="font-semibold">Choose your practice collection</h2>
          <label className="block text-sm">Collection<select aria-label="Practice collection" className={fieldClass} value={bankMode} onChange={e=>{setBankMode(e.target.value as typeof bankMode);setContextId('');setSubject('');setMeta(null);setAvailableQuestionsCount(null);}}><option value="general">General practice</option><option value="school">School curriculum</option><option value="university">University curriculum</option></select></label>
          {bankMode==='general'?<p className="text-sm text-[var(--aven-muted)]">General practice questions, filtered using your profile. They are not verified past papers or a complete board/university syllabus.</p>:<>
          <label className="block text-sm">Reviewed curriculum<select aria-label="Reviewed curriculum" className={fieldClass} value={contextId} onChange={e=>{setContextId(e.target.value);setSubject('');setMeta(null);setAvailableQuestionsCount(null);}}><option value="">Choose a curriculum</option>{catalog.filter(c=>c.level===bankMode).map(c=><option key={c.id} value={c.id}>{c.authority} · {c.program?c.program+' · ':''}{c.stage} · {c.curriculum_version} ({c.question_count} questions)</option>)}</select></label>
          {!catalog.some(c=>c.level===bankMode)&&<p role="status" className="text-sm">No reviewed mappings are published for this collection yet. Use General practice, or return to Quizzes for PDF practice.</p>}
          {context&&<p className="text-sm">Mapped practice for {context.authority}, {context.stage}. <a className="underline" href={context.source_url} target="_blank" rel="noopener noreferrer">Curriculum source</a>. Mapping review does not certify these as authentic PYQs or complete syllabus coverage.</p>}
          </>}{catalogError&&<p role="alert" className="text-sm text-red-700">{catalogError}</p>}
        </section>
        {/* Source Selection */}
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)] mb-2">
            Question Source
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className="p-3.5 rounded-xl border border-[var(--aven-action)]/40 bg-[var(--aven-soft)] ring-1 ring-[var(--aven-action)] text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[var(--aven-action)]">database</span>
                <div>
                  <div className="text-[13px] font-bold text-[var(--aven-ink)]">Curriculum Question Bank</div>
                  <div className="text-[11px] text-[var(--aven-muted)]">General practice bank — check your syllabus</div>
                </div>
              </div>
              <span className="text-[10px] bg-[var(--aven-action)] text-white font-bold px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div
              className="p-3.5 rounded-xl border border-[var(--aven-border)]/30 bg-slate-50/80 opacity-60 cursor-not-allowed text-left flex items-center justify-between"
              title="Return to Quizzes and choose PDF practice to generate from your material."
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-slate-400">upload_file</span>
                <div>
                  <div className="text-[13px] font-bold text-slate-500">Uploaded Lecture PDF / Notes</div>
                  <div className="text-[11px] text-slate-400">Grounded AI generation with source provenance</div>
                </div>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-300">
                Available from Quizzes → PDF practice
              </span>
            </div>
          </div>
        </div>

        {/* Academic Curriculum Context Badge */}
        {meta?.curriculum_context && (
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-blue-600">verified</span>
              <div>
                <span className="text-[12px] font-bold text-blue-950">
                  Practice profile: {meta.curriculum_context.program} • {meta.curriculum_context.stream}
                </span>
                <p className="text-[11px] text-blue-700">
                  {meta.curriculum_context.total_eligible_subjects} subjects suggested by your profile ({meta.curriculum_context.academic_stage}).
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
              Personalized
            </span>
          </div>
        )}

        {/* Subject and Topic for Question Bank */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)] mb-1.5">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-[var(--aven-ink)] outline-none"
            >
              {meta?.subjects.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.total_questions} questions)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)] mb-1.5">
              Topic
            </label>
            <select
              value={topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-[var(--aven-ink)] outline-none"
            >
              <option value="All Topics">All Topics</option>
              {currentTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Question Count & Time Limit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)]">
                Question Count
              </label>
              {isCheckingCount ? (
                <span className="text-[11px] text-[var(--aven-muted)] animate-pulse">Checking DB...</span>
              ) : availableQuestionsCount !== null ? (
                <span
                  className={`text-[11px] font-semibold ${
                    availableQuestionsCount >= questionCount ? 'text-emerald-600' : 'text-rose-600 font-bold'
                  }`}
                >
                  {availableQuestionsCount} available in DB
                </span>
              ) : null}
            </div>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-[var(--aven-ink)] outline-none"
            >
              {[5, 10, 15, 20, 25, 30].map((num) => (
                <option key={num} value={num}>
                  {num} Questions
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)] mb-1.5">
              Time Limit
            </label>
            <select
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
              className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-[var(--aven-ink)] outline-none"
            >
              {[5, 10, 15, 30, 45, 60].map((mins) => (
                <option key={mins} value={mins}>
                  {mins} Minutes
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)]">
              Target Difficulty
            </label>
            {selectedTopicAdaptive && (
              <span className="text-[11px] text-[var(--aven-action)] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">psychology</span>
                Adaptive Readiness: <strong className="capitalize underline">{selectedTopicAdaptive.recommended_difficulty}</strong> ({selectedTopicAdaptive.mastery_score}% Mastery)
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'easy', label: 'Easy' },
              { id: 'medium', label: 'Medium' },
              { id: 'hard', label: 'Hard' },
              { id: 'mixed', label: 'Mixed' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={`py-2 px-3 rounded-xl text-[12px] font-bold border transition-all ${
                  difficulty.toLowerCase() === d.id
                    ? 'bg-[var(--aven-action)] text-white border-[var(--aven-action)] shadow-xs'
                    : 'bg-[var(--aven-canvas)] text-[var(--aven-muted)] border-[var(--aven-border)]/30 hover:bg-slate-100'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question Types Checkboxes */}
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)] mb-2">
            Allowed Question Formats
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { type: 'MCQ', label: 'Single Choice (MCQ)' },
              { type: 'MULTIPLE_SELECT', label: 'Multiple Select' },
              { type: 'TRUE_FALSE', label: 'True / False' },
              { type: 'FILL_BLANK', label: 'Fill in the Blank' },
              { type: 'VERY_SHORT', label: 'Very Short (Subjective)' },
              { type: 'SHORT', label: 'Short Answer' },
              { type: 'LONG', label: 'Long / Derivation' },
            ].map((item) => {
              const isSelected = selectedTypes.includes(item.type as QuizQuestionType);
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => toggleQuestionType(item.type as QuizQuestionType)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-[var(--aven-soft)] border-[var(--aven-action)]/40 text-[var(--aven-action)]'
                      : 'bg-white border-[var(--aven-border)]/30 text-[var(--aven-muted)] hover:bg-[var(--aven-canvas)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isSelected ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span className="text-[12px] font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Negative Marking & Randomization */}
        <div className="border-t border-[var(--aven-border)]/20 pt-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[13px] font-bold text-[var(--aven-ink)]">Negative Marking</span>
              <p className="text-[12px] text-[var(--aven-muted)]">
                Deduct marks for incorrect answers on objective questions.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {negativeMarking && (
                <select
                  value={negativeMarkValue}
                  onChange={(e) => setNegativeMarkValue(Number(e.target.value))}
                  className="bg-[var(--aven-soft)] border border-[var(--aven-action)]/30 rounded-lg px-2.5 py-1 text-[12px] font-bold text-[var(--aven-action)] outline-none"
                >
                  <option value={0.25}>-0.25 Marks</option>
                  <option value={0.5}>-0.50 Marks</option>
                  <option value={1.0}>-1.00 Mark</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => setNegativeMarking(!negativeMarking)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  negativeMarking ? 'bg-rose-600' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    negativeMarking ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[13px] font-bold text-[var(--aven-ink)]">Question Randomization</span>
              <p className="text-[12px] text-[var(--aven-muted)]">
                Shuffle question sequence uniquely for each student session.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRandomization(!randomization)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                randomization ? 'bg-[var(--aven-action)]' : 'bg-slate-200'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  randomization ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-[var(--aven-border)]/20 pt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-[var(--aven-border)]/40 text-[13px] font-semibold text-[var(--aven-muted)] hover:bg-[var(--aven-canvas)] transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (availableQuestionsCount !== null && availableQuestionsCount < questionCount)
            }
            className="px-6 py-2.5 rounded-xl bg-[var(--aven-action)] text-white text-[13px] font-bold shadow-md hover:bg-[var(--aven-action)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Building Paper...</span>
              </>
            ) : (
              <>
                <span>Preview Paper</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
