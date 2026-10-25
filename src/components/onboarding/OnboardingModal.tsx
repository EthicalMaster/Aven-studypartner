/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  EDUCATION_LEVELS,
  VALID_STAGES_BY_LEVEL,
} from '../../../server/utils/validation';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const PROGRAM_PRESETS: Record<string, Array<{ name: string; stream: string }>> = {
  'Undergraduate / College': [
    { name: 'B.Tech / B.E.', stream: 'Computer Science & Engineering' },
    { name: 'B.Tech / B.E.', stream: 'Data Science & AI' },
    { name: 'B.Tech / B.E.', stream: 'Mechanical / Civil / Electrical' },
    { name: 'B.Sc / BCA', stream: 'Computer Applications & IT' },
    { name: 'B.Sc', stream: 'Natural Sciences (Physics / Chemistry / Math)' },
    { name: 'B.Sc / MBBS', stream: 'Biological & Life Sciences' },
    { name: 'B.Com / BBA', stream: 'Commerce & Business Analytics' },
    { name: 'Other Undergraduate', stream: 'General' },
  ],
  'School': [
    { name: 'Middle School', stream: 'Foundation Science & Math' },
    { name: 'Secondary School (Grades 9-10)', stream: 'General Board Curriculum' },
    { name: 'Senior Secondary (Grades 11-12)', stream: 'Science (PCM Track)' },
    { name: 'Senior Secondary (Grades 11-12)', stream: 'Science (PCB Track)' },
    { name: 'Senior Secondary (Grades 11-12)', stream: 'Science (PCMB Track)' },
    { name: 'Senior Secondary (Grades 11-12)', stream: 'Commerce & Humanities' },
  ],
  'Postgraduate': [
    { name: 'M.Tech / M.S.', stream: 'Computer Science & Engineering' },
    { name: 'M.Sc', stream: 'Data Science & Analytics' },
    { name: 'MCA', stream: 'Information Technology' },
    { name: 'MBA', stream: 'Business & Management' },
  ],
  'Diploma / Vocational': [
    { name: 'Diploma in Engineering', stream: 'Computer Engineering' },
    { name: 'Diploma in Engineering', stream: 'Mechanical / Electrical' },
    { name: 'Vocational Training', stream: 'Applied Skills' },
  ],
  'Other': [
    { name: 'Competitive Exam Prep', stream: 'GATE / Technical Placement' },
    { name: 'Self-Paced Learning', stream: 'Software & Data Science' },
    { name: 'Lifelong Learner', stream: 'General Sciences' },
  ],
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State initialized from user profile
  const [educationLevel, setEducationLevel] = useState<string>(
    user?.profile?.education_level || 'Undergraduate / College'
  );
  const [academicStage, setAcademicStage] = useState<string>(
    user?.profile?.academic_stage || '3rd Year'
  );
  const [program, setProgram] = useState<string>(
    user?.profile?.program || 'B.Tech / B.E.'
  );
  const [stream, setStream] = useState<string>(
    user?.profile?.stream || 'Computer Science & Engineering'
  );
  const [institution, setInstitution] = useState<string>(
    user?.profile?.institution || ''
  );

  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if(!isOpen)return;
    const previous=document.activeElement as HTMLElement;
    const scroll=document.body.style.overflow;
    dialog.current?.showModal();document.body.style.overflow='hidden';
    return()=>{dialog.current?.close();document.body.style.overflow=scroll;previous?.focus();};
  },[isOpen]);

  if (!isOpen) return null;

  const availableStages = VALID_STAGES_BY_LEVEL[educationLevel] || [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    'Other',
  ];

  const presetsForLevel = PROGRAM_PRESETS[educationLevel] || PROGRAM_PRESETS['Undergraduate / College'];

  const handleEducationLevelChange = (newLevel: string) => {
    setEducationLevel(newLevel);
    const stages = VALID_STAGES_BY_LEVEL[newLevel] || [];
    if (stages.length > 0) {
      setAcademicStage(stages[0]);
    }
    const presets = PROGRAM_PRESETS[newLevel] || [];
    if (presets.length > 0) {
      setProgram(presets[0].name);
      setStream(presets[0].stream);
    }
  };

  const handleProgramPresetSelect = (pName: string, pStream: string) => {
    setProgram(pName);
    setStream(pStream);
  };

  // Preview estimated subjects
  const getSubjectPreview = () => {
    const text = `${educationLevel} ${academicStage} ${program} ${stream}`.toLowerCase();
    if (text.includes('school') && (text.includes('grade 1') || text.includes('grade 2') || text.includes('grade 3') || text.includes('grade 4') || text.includes('grade 5') || text.includes('grade 6') || text.includes('grade 7') || text.includes('grade 8'))) {
      return ['Mathematics', 'Physics', 'Biology', 'General Aptitude', 'English'];
    }
    if (text.includes('pcb') || (text.includes('life science') || text.includes('medical') || text.includes('mbbs'))) {
      return ['Biology', 'Chemistry', 'Physics', 'General Aptitude', 'English'];
    }
    if (text.includes('commerce')) {
      return ['Mathematics', 'General Aptitude', 'English'];
    }
    if (text.includes('computer') || text.includes('data science') || text.includes('cse') || text.includes('software')) {
      return ['Computer Science', 'Data Science', 'Mathematics', 'General Aptitude', 'English'];
    }
    return ['Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'Data Science', 'General Aptitude', 'English'];
  };

  const eligibleSubjectsPreview = getSubjectPreview();

  const handleComplete = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          education_level: educationLevel,
          academic_stage: academicStage,
          program: program.trim(),
          stream: stream.trim(),
          institution: institution.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to complete onboarding');
      }

      await refreshUser();
      if (onComplete) onComplete();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete onboarding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialog} aria-labelledby="aven-guide-title" onCancel={event=>{event.preventDefault();if(!saving)onClose();}} className="aven-study-guide fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-[var(--aven-border)] bg-[var(--aven-surface)] p-0 text-[var(--aven-ink)] shadow-2xl backdrop:bg-slate-950/40">
      <div className="text-[var(--aven-ink)] flex flex-col">
        {/* Modal Top Bar */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--aven-border)] flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--aven-action)] flex items-center justify-center text-white font-bold shadow-md shadow-none">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">school</span>
            </div>
            <div>
              <h2 id="aven-guide-title" className="text-[17px] font-bold text-[var(--aven-ink)] tracking-tight">
                Your Aven study guide
              </h2>
              <p className="text-[12px] text-[var(--aven-muted)]">Step {step} of 6</p>
            </div>
          </div>

<button type="button" disabled={saving} onClick={onClose} aria-label="Close study guide" className="ml-auto rounded-full border border-[var(--aven-border)] px-3 py-1.5 text-sm disabled:opacity-50">Close</button>
          {/* Step Progress Pill */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  s === step
                    ? 'w-6 bg-[var(--aven-action)]'
                    : s < step
                    ? 'w-2 bg-[var(--aven-soft)]'
                    : 'w-2 bg-[var(--aven-canvas)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[13px] flex items-center gap-2.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Welcome */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--aven-soft)] text-[var(--aven-action)] text-[12px] font-medium border border-[var(--aven-action)]">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified</span>
                <span>Personalized Learning Environment</span>
              </div>
              <h3 className="aven-page-title text-[28px] font-semibold text-[var(--aven-ink)] tracking-tight">
                Welcome to AVEN, {user?.profile?.full_name || 'Learner'}!
              </h3>
              <p className="text-[14px] text-[var(--aven-muted)] leading-relaxed">
                AVEN is an intelligent, curriculum-grounded learning companion designed to help you master concepts faster, retain knowledge longer, and perform at your highest potential.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 rounded-2xl bg-[var(--aven-canvas)] border border-[var(--aven-border)] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--aven-soft)] text-[var(--aven-action)] flex items-center justify-center">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">menu_book</span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[var(--aven-ink)]">Curriculum Grounded</h4>
                  <p className="text-[12px] text-[var(--aven-muted)] leading-normal">
                    Confirm your study level and subject to guide the difficulty and wording of generated practice.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--aven-canvas)] border border-[var(--aven-border)] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--aven-soft)] text-[var(--aven-action)] flex items-center justify-center">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">quiz</span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[var(--aven-ink)]">Adaptive Paper Builder</h4>
                  <p className="text-[12px] text-[var(--aven-muted)] leading-normal">
                    Build practice from your PDFs or the question bank, then review your answers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--aven-canvas)] border border-[var(--aven-border)] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--aven-soft)] text-[var(--aven-action)] flex items-center justify-center">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">folder_special</span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[var(--aven-ink)]">Private Study Vault</h4>
                  <p className="text-[12px] text-[var(--aven-muted)] leading-normal">
                    Upload readable PDFs, search your notes and create study material from their content.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--aven-canvas)] border border-[var(--aven-border)] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--aven-soft)] text-[var(--aven-action)] flex items-center justify-center">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">trending_up</span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[var(--aven-ink)]">Spaced Retention Analytics</h4>
                  <p className="text-[12px] text-[var(--aven-muted)] leading-normal">
                    Real-time stability tracking, streak metrics, and automated weak topic remediation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Academic Profile Setup */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[19px] font-bold text-[var(--aven-ink)] tracking-tight">
                  Configure Your Academic Hierarchy
                </h3>
                <p className="text-[13px] text-[var(--aven-muted)] mt-1">
                  AVEN configures your available subjects, question bank papers, and AI assistance based on your exact academic program.
                </p>
              </div>

              {/* Education Level & Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
                    Education Level
                  </label>
                  <select
                    aria-label="Education level" value={educationLevel}
                    onChange={(e) => handleEducationLevelChange(e.target.value)}
                    className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--aven-ink)] font-medium focus:outline-none focus:border-[var(--aven-action)]"
                  >
                    {EDUCATION_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
                    Academic Stage / Year
                  </label>
                  <select
                    aria-label="Academic stage" value={academicStage}
                    onChange={(e) => setAcademicStage(e.target.value)}
                    className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--aven-ink)] font-medium focus:outline-none focus:border-[var(--aven-action)]"
                  >
                    {availableStages.map((stg) => (
                      <option key={stg} value={stg}>
                        {stg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Program & Stream Presets */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[var(--aven-muted)] block">
                  Quick Select Program & Stream
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {presetsForLevel.map((p, idx) => {
                    const isSelected = program === p.name && stream === p.stream;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleProgramPresetSelect(p.name, p.stream)}
                        className={`text-left p-2.5 rounded-xl border text-[12px] transition-all ${
                          isSelected
                            ? 'bg-[var(--aven-soft)] border-[var(--aven-action)] text-[var(--aven-ink)] font-semibold'
                            : 'bg-[var(--aven-canvas)] border-[var(--aven-border)] text-[var(--aven-muted)] hover:border-[var(--aven-border)]'
                        }`}
                      >
                        <div className="font-bold text-[var(--aven-ink)]">{p.name}</div>
                        <div className="text-[11px] text-[var(--aven-muted)] mt-0.5">{p.stream}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Program & Stream Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
                    Course / Degree Program
                  </label>
                  <input
                    type="text"
                    aria-label="Course / degree program" value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="e.g. B.Tech / B.E."
                    className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--aven-ink)] focus:outline-none focus:border-[var(--aven-action)]"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
                    Branch / Stream / Specialization
                  </label>
                  <input
                    type="text"
                    aria-label="Branch / stream" value={stream}
                    onChange={(e) => setStream(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--aven-ink)] focus:outline-none focus:border-[var(--aven-action)]"
                  />
                </div>
              </div>

              {/* Dynamic Curriculum Preview Banner */}
              <div className="p-3.5 bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-2xl space-y-1.5">
                <div className="text-[12px] font-bold text-[var(--aven-action)] flex items-center gap-1.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">checklist</span>
                  <span>Suggested subjects</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {eligibleSubjectsPreview.map((sub) => (
                    <span
                      key={sub}
                      className="px-2.5 py-1 rounded-md bg-[var(--aven-soft)] text-[var(--aven-action)] text-[11px] font-semibold border border-[var(--aven-action)]"
                    >
                      ✓ {sub}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--aven-muted)] mt-1">
                  These suggestions reflect your profile. PDF practice lets you confirm the subject for each document.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Private Study Vault */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--aven-soft)] text-[var(--aven-action)] text-[12px] font-medium border border-[var(--aven-action)]">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">security</span>
                <span>Tenant Isolation & Privacy</span>
              </div>
              <h3 className="text-[19px] font-bold text-[var(--aven-ink)] tracking-tight">
                Your Private Document Intelligence Vault
              </h3>
              <p className="text-[13px] text-[var(--aven-muted)] leading-relaxed">
                Upload a readable PDF and wait for processing. Then search its content, generate a summary, or build a practice quiz and flashcards.
              </p>

              <div className="p-4 rounded-2xl bg-[var(--aven-canvas)] border border-[var(--aven-border)] space-y-3">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-[var(--aven-action)] text-[24px]">lock</span>
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--aven-ink)]">Strict Student Isolation</h4>
                    <p className="text-[12px] text-[var(--aven-muted)]">
                      Your materials and search queries are strictly isolated to your account. No other student can view or search your uploaded documents.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-[var(--aven-action)] text-[24px]">dataset</span>
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--aven-ink)]">BGE Embeddings & Deterministic Chunking</h4>
                    <p className="text-[12px] text-[var(--aven-muted)]">
                      Clear, text-based PDFs work best. Check extracted formulas and source passages if an answer looks unusual.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-[var(--aven-action)] text-[24px]">auto_stories</span>
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--aven-ink)]">AI Study Kits & Flashcards</h4>
                    <p className="text-[12px] text-[var(--aven-muted)]">
                      Preview generated flashcards, compare their source quotes, edit the wording and save only the cards you want to review.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Paper Builder & Quizzes */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--aven-soft)] text-[var(--aven-action)] text-[12px] font-medium border border-[var(--aven-action)]">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">school</span>
                <span>Rigorous Academic Testing</span>
              </div>
              <h3 className="text-[19px] font-bold text-[var(--aven-ink)] tracking-tight">
                Curriculum Question Bank & Paper Builder
              </h3>
              <p className="text-[13px] text-[var(--aven-muted)] leading-relaxed">
                Create a short multiple-choice quiz from your PDF, or choose available question-bank formats. Review explanations after you submit.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {[
                  { label: 'MCQ', desc: 'Single Choice' },
                  { label: 'Multiple choice', desc: 'Multiple Choice' },
                  { label: 'True / false', desc: 'Binary Logic' },
                  { label: 'Fill blank', desc: 'Exact Text' },
                  { label: 'Very short', desc: '1-2 Sentences' },
                  { label: 'SHORT', desc: '3-4 Sentences' },
                  { label: 'LONG', desc: 'Detailed Proofs' },
                  { label: 'EXAM MODE', desc: 'Strict Timing' },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[var(--aven-canvas)] border border-[var(--aven-border)] text-center">
                    <div className="text-[12px] font-extrabold text-[var(--aven-action)]">{item.label}</div>
                    <div className="text-[10px] text-[var(--aven-muted)]">{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-2xl flex items-center gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-[var(--aven-action)] text-[26px]">gavel</span>
                <p className="text-[12px] text-[var(--aven-muted)]">
                  <strong className="text-[var(--aven-ink)]">Review your results:</strong> Check your answers and explanations after submitting. Generated practice is not a verified past paper or an exam prediction.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Real-Time Analytics & Retention */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--aven-soft)] text-[var(--aven-action)] text-[12px] font-medium border border-[var(--aven-action)]">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">insights</span>
                <span>Continuous Mastery</span>
              </div>
              <h3 className="text-[19px] font-bold text-[var(--aven-ink)] tracking-tight">
                Retention Stability & Targeted Remediation
              </h3>
              <p className="text-[13px] text-[var(--aven-muted)] leading-relaxed">
                AVEN automatically diagnoses weak topics from quiz performance and recommends high-impact review drills before you forget.
              </p>

              <div className="p-4 rounded-2xl bg-[var(--aven-canvas)] border border-[var(--aven-border)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--aven-border)] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[var(--aven-action)]">local_fire_department</span>
                    <div>
                      <div className="text-[13px] font-bold text-[var(--aven-ink)]">Study Streak Governance</div>
                      <div className="text-[11px] text-[var(--aven-muted)]">Maintained through consecutive active study days</div>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--aven-action)] bg-[var(--aven-soft)] px-2.5 py-1 rounded-full border border-[var(--aven-action)]">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[var(--aven-border)] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[var(--aven-action)]">warning</span>
                    <div>
                      <div className="text-[13px] font-bold text-[var(--aven-ink)]">Automatic Weak Topic Alert</div>
                      <div className="text-[11px] text-[var(--aven-muted)]">Topics with &lt;70% accuracy flagged for remedial focus</div>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--aven-action)] bg-[var(--aven-soft)] px-2.5 py-1 rounded-full border border-[var(--aven-action)]">
                    Automated
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[var(--aven-action)]">timer</span>
                    <div>
                      <div className="text-[13px] font-bold text-[var(--aven-ink)]">Time-Clamped Study Sessions</div>
                      <div className="text-[11px] text-[var(--aven-muted)]">Accurate study hour logging with active duration protection</div>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--aven-action)] bg-[var(--aven-soft)] px-2.5 py-1 rounded-full border border-[var(--aven-action)]">
                    4h Max
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Ready to Excel */}
          {step === 6 && (
            <div className="space-y-5 text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-[var(--aven-soft)] border border-[var(--aven-action)] text-[var(--aven-action)] mx-auto flex items-center justify-center">
                <span aria-hidden="true" className="material-symbols-outlined text-[36px]">rocket_launch</span>
              </div>

              <div>
                <h3 className="aven-page-title text-[28px] font-semibold text-[var(--aven-ink)] tracking-tight">
                  You are all set, {user?.profile?.full_name || 'Scholar'}!
                </h3>
                <p className="text-[13px] text-[var(--aven-muted)] max-w-md mx-auto mt-1 leading-relaxed">
                  Your academic curriculum has been personalized for <strong>{program} ({stream})</strong>. You can adjust your profile at any time in Settings.
                </p>
              </div>

              {/* Summary of Configuration */}
              <div className="p-4 bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-2xl text-left space-y-2 max-w-md mx-auto">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--aven-muted)]">Learner ID:</span>
                  <span className="text-[var(--aven-action)] font-mono font-bold">
                    {user?.profile?.student_identifier || 'EDU-ASSIGNED'}
                  </span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--aven-muted)]">Education Level:</span>
                  <span className="text-[var(--aven-ink)] font-semibold">{educationLevel}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--aven-muted)]">Academic Stage:</span>
                  <span className="text-[var(--aven-ink)] font-semibold">{academicStage}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--aven-muted)]">Eligible Subjects:</span>
                  <span className="text-[var(--aven-action)] font-semibold">{eligibleSubjectsPreview.length} Subjects Active</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-[var(--aven-border)] flex items-center justify-between gap-3 flex-wrap bg-[var(--aven-canvas)] rounded-b-3xl">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => prev - 1)}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[var(--aven-muted)] hover:text-[var(--aven-ink)] bg-[var(--aven-canvas)] hover:bg-[var(--aven-canvas)] transition"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => prev + 1)}
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[var(--aven-action)] hover:bg-[var(--aven-action)] shadow-md shadow-none transition motion-reduce:transition-none flex items-center gap-1.5"
              >
                <span>Continue</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleComplete}
                className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[var(--aven-action)] hover:bg-[var(--aven-action)] shadow-md shadow-none transition motion-reduce:transition-none flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Save & start learning</span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">check_circle</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
};
