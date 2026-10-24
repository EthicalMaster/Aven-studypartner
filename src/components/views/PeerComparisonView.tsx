/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { ActiveNavTab, LeaderboardResponse } from '../../types';
import { quizApi } from '../../services/quizApi';

interface PeerComparisonViewProps {
  onNavigate?: (tab: ActiveNavTab) => void;
}

export const PeerComparisonView: React.FC<PeerComparisonViewProps> = ({ onNavigate }) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quizApi.getLeaderboard();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load leaderboard:', err);
      setError(err.message || 'Unable to connect to leaderboard service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const currentUser = data?.currentUser;
  const isUserInTop10 = data?.top10?.some((e) => e.isCurrentUser);

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="aven-page-title text-[24px] font-bold text-[var(--aven-ink)] tracking-tight">
            Cohort Leaderboard
          </h2>
          <p className="text-[13px] text-[var(--aven-muted)] mt-0.5">
            Authoritative academic standings derived strictly from finalized quiz assessments.
          </p>
        </div>

        <button
          onClick={loadLeaderboard}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-[var(--aven-muted)] bg-white border border-[var(--aven-border)]/60 rounded-xl hover:bg-slate-50 transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-3xl p-12 border border-[var(--aven-border)]/30 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-3 border-[var(--aven-action)]/20 border-t-[var(--aven-action)] rounded-full animate-spin mb-4" />
          <p className="text-[14px] font-medium text-[var(--aven-muted)]">
            Calculating cohort standings from verified quiz results...
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white rounded-3xl p-8 border border-red-200 shadow-xs flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[24px]">error</span>
          </div>
          <h3 className="text-[16px] font-bold text-[var(--aven-ink)] mb-1">
            Failed to Load Leaderboard
          </h3>
          <p className="text-[13px] text-[var(--aven-muted)] max-w-md mb-4">{error}</p>
          <button
            onClick={loadLeaderboard}
            className="px-4 py-2 bg-[var(--aven-action)] text-white text-[13px] font-semibold rounded-xl hover:bg-[var(--aven-action)] transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Empty State: No Finalized Quizzes */}
      {!loading && !error && (!data || data.totalParticipants === 0) && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[var(--aven-border)]/30 shadow-xs flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[var(--aven-soft)] border border-[var(--aven-action)]/20 flex items-center justify-center text-[var(--aven-action)] mb-5">
            <span className="material-symbols-outlined text-[32px]">military_tech</span>
          </div>

          <h3 className="text-[20px] font-bold text-[var(--aven-ink)] mb-2">
            No Finalized Quiz Results Yet
          </h3>

          <p className="text-[14px] text-[var(--aven-muted)] leading-relaxed mb-6">
            The cohort leaderboard is strictly derived from completed, authoritative quiz evaluations.
            Complete your first test in Practice or Exam mode to establish your position on the leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {onNavigate && (
              <button
                onClick={() => onNavigate('quizzes')}
                className="px-6 py-3 bg-[var(--aven-action)] hover:bg-[var(--aven-action)] text-white text-[14px] font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">quiz</span>
                Take a Quiz Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Populated Leaderboard State */}
      {!loading && !error && data && data.totalParticipants > 0 && (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[var(--aven-border)]/30 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--aven-soft)] text-[var(--aven-action)] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">groups</span>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--aven-muted)]">
                  Active Competitors
                </p>
                <p className="text-[22px] font-bold text-[var(--aven-ink)]">
                  {data.totalParticipants} {data.totalParticipants === 1 ? 'Student' : 'Students'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[var(--aven-border)]/30 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--aven-muted)]">
                  Top Score
                </p>
                <p className="text-[22px] font-bold text-[var(--aven-ink)]">
                  {data.top10[0]?.totalScore ?? 0} pts
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[var(--aven-border)]/30 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">person</span>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--aven-muted)]">
                  Your Standing
                </p>
                <p className="text-[22px] font-bold text-[var(--aven-ink)]">
                  {currentUser ? `#${currentUser.rank}` : 'Unranked'}
                </p>
              </div>
            </div>
          </div>

          {/* User Outside Top 10 Pinned Card */}
          {currentUser && !isUserInTop10 && (
            <div className="bg-gradient-to-r from-[var(--aven-soft)] to-white border-2 border-[var(--aven-action)]/40 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--aven-action)] text-white flex items-center justify-center font-bold text-[18px]">
                  #{currentUser.rank}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold text-[var(--aven-ink)]">
                      {currentUser.displayName}
                    </span>
                    <span className="px-2 py-0.5 bg-[var(--aven-action)] text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
                      You
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--aven-muted)] mt-0.5">
                    Completed {currentUser.quizzesCompleted} {currentUser.quizzesCompleted === 1 ? 'assessment' : 'assessments'} • {currentUser.totalCorrect} total correct answers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 sm:border-l sm:border-[var(--aven-border)]/40 sm:pl-6">
                <div>
                  <span className="text-[11px] text-[var(--aven-muted)] font-semibold block uppercase">Total Score</span>
                  <span className="text-[18px] font-extrabold text-[var(--aven-action)]">
                    {currentUser.totalScore} pts
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--aven-muted)] font-semibold block uppercase">Accuracy</span>
                  <span className="text-[18px] font-extrabold text-[var(--aven-ink)]">
                    {currentUser.averagePercentage}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Top 10 Leaderboard Table */}
          <div className="bg-white rounded-3xl border border-[var(--aven-border)]/40 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--aven-border)]/30 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[var(--aven-action)]">
                  emoji_events
                </span>
                <h3 className="text-[15px] font-bold text-[var(--aven-ink)]">
                  Top 10 Students
                </h3>
              </div>
              <span className="text-[12px] font-medium text-[var(--aven-muted)]">
                Ranked by Total Score & Accuracy
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--aven-border)]/30 text-[12px] font-bold uppercase tracking-wider text-[var(--aven-muted)] bg-[var(--aven-canvas)]/60">
                    <th className="py-3.5 px-4 text-center w-16">Rank</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4 text-center">Quizzes</th>
                    <th className="py-3.5 px-4 text-center">Correct</th>
                    <th className="py-3.5 px-4 text-right">Total Score</th>
                    <th className="py-3.5 px-6 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--aven-border)]/20 text-[13px]">
                  {data.top10.map((entry) => {
                    const isSelf = entry.isCurrentUser;
                    const rank = entry.rank;

                    return (
                      <tr
                        key={rank}
                        className={`transition-colors ${
                          isSelf
                            ? 'bg-[var(--aven-soft)]/80 font-medium'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {rank === 1 && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-[13px] border border-amber-300">
                              🥇
                            </span>
                          )}
                          {rank === 2 && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-[13px] border border-slate-300">
                              🥈
                            </span>
                          )}
                          {rank === 3 && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-800 font-bold text-[13px] border border-orange-300">
                              🥉
                            </span>
                          )}
                          {rank > 3 && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-[var(--aven-muted)] font-bold text-[12px]">
                              #{rank}
                            </span>
                          )}
                        </td>

                        {/* Student Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isSelf ? 'text-[var(--aven-action)]' : 'text-[var(--aven-ink)]'}`}>
                              {entry.displayName}
                            </span>
                            {isSelf && (
                              <span className="px-2 py-0.5 bg-[var(--aven-action)] text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quizzes Completed */}
                        <td className="py-3.5 px-4 text-center text-[var(--aven-muted)]">
                          {entry.quizzesCompleted}
                        </td>

                        {/* Total Correct */}
                        <td className="py-3.5 px-4 text-center text-[var(--aven-muted)]">
                          {entry.totalCorrect}
                        </td>

                        {/* Total Score */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-[var(--aven-ink)]">
                            {entry.totalScore}
                          </span>
                          <span className="text-[11px] text-[var(--aven-muted)] ml-1">pts</span>
                        </td>

                        {/* Accuracy Percentage */}
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                              <div
                                className="bg-[var(--aven-action)] h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, entry.averagePercentage))}%` }}
                              />
                            </div>
                            <span className="font-semibold text-[var(--aven-ink)] w-12 text-right">
                              {entry.averagePercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ranking Methodology Transparency Footer */}
          <div className="p-5 bg-white border border-[var(--aven-border)]/30 rounded-2xl text-[12px] text-[var(--aven-muted)] space-y-2">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--aven-action)]">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Transparent Academic Ranking Methodology
            </div>
            <p className="leading-relaxed">
              Standings are calculated server-side directly from completed quiz evaluations in PostgreSQL.
              The primary sorting criterion is <strong>Total Score Obtained</strong> across finalized tests.
              Ties are resolved deterministically in order:
              (1) <strong>Higher Average Accuracy Percentage</strong>,
              (2) <strong>Total Correct Questions</strong>,
              (3) <strong>Earliest Assessment Submission Timestamp</strong>,
              and (4) <strong>Stable Profile Identifier</strong>.
              Completion speed does not affect rankings, ensuring academic depth is prioritized without rushing students.
            </p>
            <p className="text-[11px] text-[#a0a2a8]">
              Privacy Notice: Student identifiers, emails, passwords, and internal database keys are strictly excluded from leaderboard transmissions.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
