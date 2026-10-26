import {PasswordRecovery} from './PasswordRecovery';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const PRACTICAL_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function validateClientEmail(emailStr: string): boolean {
  const trimmed = emailStr.trim();
  if (trimmed.length === 0 || trimmed.length > 255) return false;
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) return false;
  if (trimmed.startsWith("@") || trimmed.endsWith("@")) return false;
  return PRACTICAL_EMAIL_REGEX.test(trimmed);
}

const EDUCATION_LEVEL_OPTIONS = [
  "School",
  "Undergraduate / College",
  "Postgraduate",
  "Diploma / Vocational",
  "Other",
] as const;

type EducationLevelType = (typeof EDUCATION_LEVEL_OPTIONS)[number];

const STAGES_BY_LEVEL: Record<EducationLevelType, string[]> = {
  School: [
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
    "Other",
  ],
  "Undergraduate / College": [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "5th Year",
    "Other",
  ],
  Postgraduate: ["1st Year", "2nd Year", "3rd Year", "Other"],
  "Diploma / Vocational": ["Year 1", "Year 2", "Year 3", "Year 4", "Other"],
  Other: [
    "Self-Paced Learner",
    "Professional / Upskilling",
    "Certification Candidate",
    "Lifelong Learner",
    "Other",
  ],
};

export const AuthView: React.FC<{ initialMode?: "login" | "register" }> = ({
  initialMode = "login",
}) => {
  const { login, register, error, clearError, dbConnected } = useAuth();

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [recovering,setRecovering]=useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevelType>(
    "Undergraduate / College",
  );
  const [academicStage, setAcademicStage] = useState<string>("1st Year");
  const [customStage, setCustomStage] = useState<string>("");
  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");
  const [localValidationErr, setLocalValidationErr] = useState<string | null>(
    null,
  );

  const handleEducationLevelChange = (level: EducationLevelType) => {
    setEducationLevel(level);
    const defaultStage = STAGES_BY_LEVEL[level][0] || "Other";
    setAcademicStage(defaultStage);
    setCustomStage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalValidationErr(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "login") {
      if (!normalizedEmail || !password) {
        setLocalValidationErr("Please enter both your email and password.");
        return;
      }
      if (!validateClientEmail(normalizedEmail)) {
        setLocalValidationErr(
          "Please enter a valid email address (e.g. student@university.edu).",
        );
        return;
      }
      setSubmitting(true);
      await login({ email: normalizedEmail, password });
      setSubmitting(false);
    } else {
      if (!fullName.trim()) {
        setLocalValidationErr("Full name is required.");
        return;
      }
      if (!normalizedEmail) {
        setLocalValidationErr("Email address is required.");
        return;
      }
      if (!validateClientEmail(normalizedEmail)) {
        setLocalValidationErr(
          "Please provide a valid practical email address (e.g. student@university.edu).",
        );
        return;
      }
      if (password.length < 8) {
        setLocalValidationErr("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalValidationErr("Passwords do not match.");
        return;
      }

      const finalStage =
        academicStage === "Other" && customStage.trim()
          ? customStage.trim()
          : academicStage;
      if (!educationLevel) {
        setLocalValidationErr("Education level is required.");
        return;
      }
      if (!finalStage) {
        setLocalValidationErr("Academic stage / grade is required.");
        return;
      }

      setSubmitting(true);
      await register({
        full_name: fullName.trim(),
        email: normalizedEmail,
        password,
        confirm_password: confirmPassword,
        education_level: educationLevel,
        academic_stage: finalStage,
        institution: institution.trim() || undefined,
        department: department.trim() || undefined,
      });
      setSubmitting(false);
    }
  };

  const displayError = localValidationErr || error;

  return (
    <div className="aven-auth">
      <aside className="aven-auth-intro">
        <a href="#" className="aven-auth-wordmark">
          AVEN
        </a>
        <span className="aven-auth-eyebrow">YOUR NEXT CHAPTER</span>
        <h2>
          A little curiosity.
          <br />A clearer <em>mind.</em>
        </h2>
        <p>
          Your notes, your practice, your pace. Make room for the ideas you’re
          ready to understand.
        </p>
        <div className="aven-auth-note">
          <span>ONE SMALL STEP</span>
          <blockquote>
            Start with a question.
            <br />
            Stay for the understanding.
          </blockquote>
          <p>Your study space is waiting.</p>
        </div>
        <a href="#" className="aven-auth-back">
          ← Back to Aven
        </a>
      </aside>
      {/* Main Auth Container */}
      <div className="aven-auth-form">
        <div className="aven-auth-heading">
          <a href="#" className="aven-auth-mobile-brand">
            AVEN
          </a>
          <p className="aven-auth-eyebrow">YOUR PERSONAL STUDY SPACE</p>
          <h1>
            {recovering?"Find your way back.":mode === "login" ? "Welcome back." : "Begin your next chapter."}
          </h1>
          <p>
            {recovering?"Recover access to your study space.":mode === "login"
              ? "Pick up where your curiosity left off."
              : "A place for your material, practice, and progress."}
          </p>
        </div>
        <div className="aven-auth-card">
          {recovering?<PasswordRecovery onBack={()=>setRecovering(false)}/>:<>
          {/* Mode Switcher Tabs */}
          <div className="flex bg-[var(--aven-canvas)] p-1 rounded-xl border border-[var(--aven-border)] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                clearError();
                setLocalValidationErr(null);
              }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-[var(--aven-action)] text-white shadow-md"
                  : "text-[var(--aven-muted)] hover:text-[var(--aven-ink)]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                clearError();
                setLocalValidationErr(null);
              }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                mode === "register"
                  ? "bg-[var(--aven-action)] text-white shadow-md"
                  : "text-[var(--aven-muted)] hover:text-[var(--aven-ink)]"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Database Notice (if PostgreSQL is offline in cloud preview) */}
          {!dbConnected && (
            <div role="status" className="aven-auth-warning">
              We couldn’t reach the sign-in service. Please try again in a
              moment.
            </div>
          )}

          {/* Error Alert */}
          {displayError && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-[12px] flex items-start gap-2.5"
            >
              <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0 mt-0.5">
                error
              </span>
              <p className="leading-snug">{displayError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-[12px] font-medium text-[var(--aven-muted)] mb-1.5">
                  Full Name <span className="text-[var(--aven-action)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Chen"
                  aria-label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--aven-ink)] placeholder:text-[var(--aven-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-[var(--aven-muted)] mb-1.5">
                Email Address{" "}
                <span className="text-[var(--aven-action)]">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="student@university.edu"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--aven-ink)] placeholder:text-[var(--aven-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--aven-muted)] mb-1.5">
                Password <span className="text-[var(--aven-action)]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={
                    mode === "register"
                      ? "Minimum 8 characters"
                      : "Enter your password"
                  }
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3.5 py-2.5 pr-10 text-[14px] text-[var(--aven-ink)] placeholder:text-[var(--aven-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[var(--aven-muted)] hover:text-[var(--aven-ink)] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--aven-muted)] mb-1.5">
                    Confirm Password{" "}
                    <span className="text-[var(--aven-action)]">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter your password"
                    aria-label="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--aven-ink)] placeholder:text-[var(--aven-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--aven-muted)] mb-1.5">
                      Education Level{" "}
                      <span className="text-[var(--aven-action)]">*</span>
                    </label>
                    <select
                      aria-label="Education level"
                      value={educationLevel}
                      onChange={(e) =>
                        handleEducationLevelChange(
                          e.target.value as EducationLevelType,
                        )
                      }
                      className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--aven-ink)] focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                    >
                      {EDUCATION_LEVEL_OPTIONS.map((lvl) => (
                        <option
                          key={lvl}
                          value={lvl}
                          className="bg-[var(--aven-canvas)] text-[var(--aven-ink)]"
                        >
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--aven-muted)] mb-1.5">
                      Academic Stage / Grade{" "}
                      <span className="text-[var(--aven-action)]">*</span>
                    </label>
                    <select
                      aria-label="Academic stage"
                      value={academicStage}
                      onChange={(e) => setAcademicStage(e.target.value)}
                      className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--aven-ink)] focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                    >
                      {STAGES_BY_LEVEL[educationLevel].map((stage) => (
                        <option
                          key={stage}
                          value={stage}
                          className="bg-[var(--aven-canvas)] text-[var(--aven-ink)]"
                        >
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {academicStage === "Other" && (
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--aven-muted)] mb-1.5">
                      Specify Stage / Program (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PhD Candidate, High School Senior, Specialization..."
                      value={customStage}
                      onChange={(e) => setCustomStage(e.target.value)}
                      className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--aven-ink)] placeholder:text-[var(--aven-muted)] focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--aven-muted)] mb-1.5">
                      Institution (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. School, University, Institute"
                      aria-label="Institution"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--aven-ink)] placeholder:text-[var(--aven-muted)] focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--aven-muted)] mb-1.5">
                      Department (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Science, Engineering, Arts"
                      aria-label="Department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-[var(--aven-canvas)] border border-[var(--aven-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--aven-ink)] placeholder:text-[var(--aven-muted)] focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-[var(--aven-action)] hover:bg-[var(--aven-action-hover)] disabled:opacity-50 text-white text-[14px] font-semibold py-2.5 rounded-xl transition-all  flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>
                    {mode === "login"
                      ? "Authenticating..."
                      : "Registering Account..."}
                  </span>
                </>
              ) : (
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
              )}
            </button>
          </form>

          {mode==='login'&&<button type="button" className="mt-4 text-sm underline" onClick={()=>{clearError();setLocalValidationErr(null);setRecovering(true);}}>Forgot password?</button>}
          </>}
          {/* Security details footnote */}
          <div className="mt-6 pt-4 border-t border-[var(--aven-border)] flex items-center justify-center gap-2 text-[11px] text-[var(--aven-muted)]">
            <span className="material-symbols-outlined text-[14px] text-emerald-700">
              lock
            </span>
            <span>Your account keeps your study space personal.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
