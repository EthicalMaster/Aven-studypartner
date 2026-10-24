/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  EDUCATION_LEVELS,
  VALID_STAGES_BY_LEVEL,
} from '../../../server/utils/validation';

interface SettingsViewProps {
  onOpenOnboarding?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenOnboarding }) => {
  const { user, refreshUser } = useAuth();
  const [dailyGoalTopics, setDailyGoalTopics] = useState(2);
  const [dailyGoalQuizzes, setDailyGoalQuizzes] = useState(1);
  const [algorithm, setAlgorithm] = useState('SM-2');
  const [savedNotice, setSavedNotice] = useState(false);

  // Academic Profile State
  const [educationLevel, setEducationLevel] = useState(
    user?.profile?.education_level || 'Undergraduate / College'
  );
  const [academicStage, setAcademicStage] = useState(
    user?.profile?.academic_stage || '3rd Year'
  );
  const [program, setProgram] = useState(
    user?.profile?.program || 'B.Tech / B.E.'
  );
  const [stream, setStream] = useState(
    user?.profile?.stream || 'Computer Science & Engineering'
  );
  const [institution, setInstitution] = useState(
    user?.profile?.institution || ''
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.profile) {
      if (user.profile.education_level) setEducationLevel(user.profile.education_level);
      if (user.profile.academic_stage) setAcademicStage(user.profile.academic_stage);
      if (user.profile.program) setProgram(user.profile.program);
      if (user.profile.stream) setStream(user.profile.stream);
      if (user.profile.institution) setInstitution(user.profile.institution);
    }
  }, [user]);

  const availableStages = VALID_STAGES_BY_LEVEL[educationLevel] || [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    'Other',
  ];

  const handleEducationLevelChange = (newLevel: string) => {
    setEducationLevel(newLevel);
    const stages = VALID_STAGES_BY_LEVEL[newLevel] || [];
    if (stages.length > 0) {
      setAcademicStage(stages[0]);
    }
  };

  const handleSavePreferences = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleSaveAcademicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
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
        throw new Error(data.message || 'Failed to update academic profile');
      }

      await refreshUser();
      setProfileMessage('✓ Academic curriculum profile successfully updated!');
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileMessage(err.message || 'Update failed');
    } finally {
      setProfileSaving(false);
    }
  };

  const displayName = user?.profile?.full_name || 'AVEN Learner';
  const stage = user?.profile?.academic_stage || (user?.profile?.current_year ? `Year ${user.profile.current_year}` : 'Active Learner');
  const levelOrDept = user?.profile?.program || user?.profile?.department || user?.profile?.education_level || 'General';
  const studentId = user?.profile?.student_identifier;
  const userEmail = user?.email || 'user@aven.internal';

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="aven-page-title text-[22px] font-bold text-[var(--aven-ink)] tracking-tight ">
            Make it your space.
          </h2>
          <p className="text-[13px] text-[var(--aven-muted)] mt-0.5">
            Configure your academic curriculum context, spaced repetition rhythm, and orientation settings.
          </p>
        </div>

        {savedNotice && (
          <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full animate-in fade-in">
            ✓ Preferences saved!
          </span>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-[var(--aven-border)]/30 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-white text-[24px]">
            <span className="material-symbols-outlined text-[32px]">person</span>
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[var(--aven-ink)]">{displayName}</h3>
            <p className="text-[13px] text-[var(--aven-muted)]">{levelOrDept} • {stage}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {studentId && (
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-[var(--aven-action)] border border-blue-200">
                  Learner ID: {studentId}
                </span>
              )}
              <span className="text-[11px] text-[var(--aven-muted)]">{userEmail}</span>
            </div>
          </div>
        </div>

        {onOpenOnboarding && (
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="text-[12px] font-bold bg-[var(--aven-soft)] text-[var(--aven-action)] hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5 cursor-pointer transition"
          >
            <span className="material-symbols-outlined text-[16px]">school</span>
            <span>Launch Guide</span>
          </button>
        )}
      </div>

      {/* Academic Curriculum Personalization Card */}
      <form onSubmit={handleSaveAcademicProfile} className="bg-white rounded-3xl p-6 border border-[var(--aven-border)]/30 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--aven-border)]/20 pb-3">
          <div>
            <h3 className="text-[16px] font-bold text-[var(--aven-ink)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--aven-action)] text-[20px]">account_tree</span>
              <span>Academic Curriculum Hierarchy</span>
            </h3>
            <p className="text-[12px] text-[var(--aven-muted)]">
              Controls which subjects, question bank papers, and syllabi are exposed to your account.
            </p>
          </div>
          {profileMessage && (
            <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${
              profileMessage.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {profileMessage}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
              Education Level
            </label>
            <select
              value={educationLevel}
              onChange={(e) => handleEducationLevelChange(e.target.value)}
              className="w-full bg-[var(--aven-soft)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2 text-[13px] text-[var(--aven-ink)] font-semibold outline-none focus:ring-2 focus:ring-[var(--aven-action)]"
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
              Academic Stage / Grade
            </label>
            <select
              value={academicStage}
              onChange={(e) => setAcademicStage(e.target.value)}
              className="w-full bg-[var(--aven-soft)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2 text-[13px] text-[var(--aven-ink)] font-semibold outline-none focus:ring-2 focus:ring-[var(--aven-action)]"
            >
              {availableStages.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
              Program / Degree
            </label>
            <input
              type="text"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g. B.Tech / B.E."
              className="w-full bg-[var(--aven-soft)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2 text-[13px] text-[var(--aven-ink)] font-semibold outline-none focus:ring-2 focus:ring-[var(--aven-action)]"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
              Stream / Specialization
            </label>
            <input
              type="text"
              value={stream}
              onChange={(e) => setStream(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              className="w-full bg-[var(--aven-soft)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2 text-[13px] text-[var(--aven-ink)] font-semibold outline-none focus:ring-2 focus:ring-[var(--aven-action)]"
            />
          </div>
        </div>

        <div>
          <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
            Institution / University
          </label>
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. Stanford University / National Institute of Technology"
            className="w-full bg-[var(--aven-soft)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2 text-[13px] text-[var(--aven-ink)] font-semibold outline-none focus:ring-2 focus:ring-[var(--aven-action)]"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={profileSaving}
            className="px-5 py-2.5 rounded-xl bg-[var(--aven-action)] text-white font-bold text-[13px] hover:bg-[var(--aven-action-hover)] shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {profileSaving ? 'Saving...' : 'Update Academic Profile'}
          </button>
        </div>
      </form>

      {/* Study Rhythm */}
      <div className="bg-white rounded-3xl p-6 border border-[var(--aven-border)]/30 shadow-xs space-y-4">
        <h3 className="text-[16px] font-bold text-[var(--aven-ink)] border-b border-[var(--aven-border)]/20 pb-3">
          Daily Study Target
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
              Target Topics / Day
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={dailyGoalTopics}
              onChange={(e) => setDailyGoalTopics(Number(e.target.value))}
              className="w-full bg-[var(--aven-soft)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2 text-[14px] text-[var(--aven-ink)] font-semibold outline-none focus:ring-2 focus:ring-[var(--aven-action)]"
            />
          </div>
          <div>
            <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
              Target Quizzes / Day
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={dailyGoalQuizzes}
              onChange={(e) => setDailyGoalQuizzes(Number(e.target.value))}
              className="w-full bg-[var(--aven-soft)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2 text-[14px] text-[var(--aven-ink)] font-semibold outline-none focus:ring-2 focus:ring-[var(--aven-action)]"
            />
          </div>
        </div>
      </div>

      {/* AI Synthesis & Retention Settings */}
      <div className="bg-white rounded-3xl p-6 border border-[var(--aven-border)]/30 shadow-xs space-y-4">
        <h3 className="text-[16px] font-bold text-[var(--aven-ink)] border-b border-[var(--aven-border)]/20 pb-3">
          Learning & Retention Engine
        </h3>

        <div className="space-y-3 text-[13px]">
          <div>
            <label className="text-[12px] font-bold text-[var(--aven-muted)] block mb-1">
              Spaced Repetition Algorithm
            </label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full bg-[var(--aven-soft)] border border-[var(--aven-border)]/40 rounded-xl px-3.5 py-2.5 font-semibold text-[var(--aven-ink)] outline-none"
            >
              <option value="SM-2">SuperMemo SM-2 (Deterministic Interval Scaling - Active)</option>
              <option value="FSRS-4">FSRS-4 (Free Spaced Repetition Scheduler)</option>
              <option value="Leitner">Leitner 5-Box System</option>
            </select>
            <p className="text-[11px] text-[var(--aven-muted)] mt-1.5">
              SuperMemo SM-2 dynamically scales repetition intervals (1d → 3d → 8d...) based on recall feedback (Again, Hard, Good, Easy).
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="px-5 py-2.5 rounded-xl bg-[var(--aven-action)] text-white font-bold text-[13px] hover:bg-[var(--aven-action-hover)] shadow-sm transition-all cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
