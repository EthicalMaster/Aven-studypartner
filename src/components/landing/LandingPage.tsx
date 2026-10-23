/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  RotateCcw,
} from "lucide-react";
import "./landing.css";

interface LandingPageProps {
  onEnter: (mode: "login" | "register") => void;
  signedIn: boolean;
}

function SourcePage({ highlighted = false }: { highlighted?: boolean }) {
  return (
    <div className={`aven-paper ${highlighted ? "is-highlighted" : ""}`}>
      <div className="paper-meta">
        <span>PHYSICS / YOUR NOTES</span>
        <span>03</span>
      </div>
      <p className="paper-chapter">2.4 / A change of direction</p>
      <h3>Why does light bend?</h3>
      <p>When light enters a different medium, its speed can change.</p>
      <p className="paper-highlight">
        At an angle to the normal, light bends towards the normal when it enters
        a medium with a higher refractive index.
      </p>
      <svg
        viewBox="0 0 300 155"
        role="img"
        aria-label="Light ray bending towards the normal as it enters a medium with a higher refractive index"
      >
        <rect x="0" y="75" width="300" height="80" fill="#e8eef4" />
        <path d="M0 75H300 M150 0V155" stroke="#8795a7" strokeDasharray="4 5" />
        <path
          d="M65 8L150 75L179 148"
          fill="none"
          stroke="#2861dc"
          strokeWidth="3"
        />
        <text x="197" y="28" fontSize="11" fill="#526378">
          air
        </text>
        <text x="197" y="125" fontSize="11" fill="#526378">
          glass
        </text>
      </svg>
      <div className="paper-foot">Your material. A place to begin.</div>
    </div>
  );
}

export function LandingPage({ onEnter, signedIn }: LandingPageProps) {
  const story = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: story,
    offset: ["start 84px", "end end"],
  });
  const [chapter, setChapter] = useState(0);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px), (max-height: 650px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const staticStory = reduced || compact;
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setChapter(value < 0.32 ? 0 : value < 0.7 ? 1 : 2);
  });
  // Each transition has a short travel interval followed by a reading hold.
  // Direct progress mapping reverses immediately; no delayed spring or scroll interception.
  const paperX = useTransform(
    scrollYProgress,
    [0, 0.2, 0.36, 1],
    [0, 0, -100, -100],
  );
  const paperScale = useTransform(
    scrollYProgress,
    [0, 0.2, 0.36, 1],
    [1, 1, 0.79, 0.79],
  );
  const paperRotate = useTransform(
    scrollYProgress,
    [0, 0.2, 0.36, 1],
    [-5, -5, 0, 0],
  );
  const stackOpacity = useTransform(scrollYProgress, [0, 0.18, 0.3], [1, 1, 0]);
  const answerOpacity = useTransform(
    scrollYProgress,
    [0.25, 0.38, 0.62, 0.69],
    [0, 1, 1, 0],
  );
  const answerY = useTransform(
    scrollYProgress,
    [0.25, 0.38, 0.62, 0.69],
    [25, 0, 0, -25],
  );
  const quizOpacity = useTransform(scrollYProgress, [0.71, 0.82, 1], [0, 1, 1]);
  const quizY = useTransform(scrollYProgress, [0.71, 0.82], [25, 0]);
  const highlightOpacity = useTransform(
    scrollYProgress,
    [0.2, 0.36, 1],
    [0, 1, 1],
  );
  const connection = useTransform(scrollYProgress, [0.27, 0.4, 1], [0, 1, 1]);
  const [showSource, setShowSource] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const start = () => onEnter("register");

  return (
    <div className="aven-landing">
      <a className="aven-skip" href="#aven-intro">
        Skip to content
      </a>
      <header className="aven-nav">
        <a href="#" className="aven-wordmark" aria-label="Aven home">
          AVEN<span>study, a little differently.</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#try-it">Try the demo</a>
          <button className="aven-login" onClick={() => onEnter("login")}>
            {signedIn ? "My workspace" : "Log in"}
          </button>
          <button className="aven-button" onClick={start}>
            {signedIn ? "Open Aven" : "Get started"}
            <ArrowRight size={15} />
          </button>
        </nav>
      </header>

      <main>
        <section
          ref={story}
          className={`aven-story ${staticStory ? "is-static" : ""}`}
          id="how-it-works"
        >
          <div className="aven-story-sticky">
            <div className="aven-story-topline">
              <span>YOUR MATERIAL → YOUR UNDERSTANDING</span>
              <span>SCROLL THROUGH A SAMPLE LESSON</span>
            </div>
            <div className="aven-story-grid">
              <div className="aven-story-copy" id="aven-intro">
                <section
                  className={`aven-scene ${chapter === 0 ? "is-active" : ""}`}
                  aria-hidden={!staticStory && chapter !== 0}
                  inert={!staticStory && chapter !== 0}
                >
                  <span className="aven-eyebrow">
                    <span className="aven-small-line" /> A LITTLE MORE
                    UNDERSTOOD
                  </span>
                  <h1>
                    Your notes.
                    <br />A clearer <em>mind.</em>
                  </h1>
                  <p>
                    From a page of information to a moment of understanding.
                    Your next lightbulb moment starts here.
                  </p>
                  <div className="aven-actions">
                    <button className="aven-button" onClick={start}>
                      Start learning
                      <ArrowRight size={16} />
                    </button>
                    <a className="aven-text-link" href="#try-it">
                      Try a sample <ArrowRight size={16} />
                    </a>
                  </div>
                  <div className="aven-scroll">
                    <ArrowDown size={15} />
                    <span>SCROLL TO FOLLOW THE IDEA</span>
                  </div>
                  <div className="aven-mobile-figure" aria-hidden="true">
                    <SourcePage />
                  </div>
                </section>
                <section
                  className={`aven-scene ${chapter === 1 ? "is-active" : ""}`}
                  aria-hidden={!staticStory && chapter !== 1}
                  inert={!staticStory && chapter !== 1}
                >
                  <span className="aven-eyebrow">01 / FIND THE CONNECTION</span>
                  <h2>
                    Go beyond
                    <br />
                    “I think I <em>get it.”</em>
                  </h2>
                  <p>
                    A question leads back to the passage behind it. See the
                    explanation and its source together, so the idea has
                    somewhere to land.
                  </p>
                  <span className="aven-margin-note">
                    From “why?” to “oh, that’s why.”
                  </span>
                  <span className="aven-preview-label">
                    Guided tutor concept · sample content
                  </span>
                </section>
                <section
                  className={`aven-scene ${chapter === 2 ? "is-active" : ""}`}
                  aria-hidden={!staticStory && chapter !== 2}
                  inert={!staticStory && chapter !== 2}
                >
                  <span className="aven-eyebrow">02 / MAKE THE IDEA YOURS</span>
                  <h2>
                    A little practice.
                    <br />A lot more <em>clarity.</em>
                  </h2>
                  <p>
                    Turn the same idea into a question. Try an answer,
                    understand the feedback, and return to the source whenever
                    you need it.
                  </p>
                  <a className="aven-text-link" href="#try-it">
                    Now try it yourself
                    <ArrowRight size={17} />
                  </a>
                  <span className="aven-preview-label">
                    Illustrative study flow · no account needed
                  </span>
                </section>
              </div>
              <div className="aven-art-stage" aria-hidden="true">
                <div className="aven-stage-caption">
                  <span>LIGHT & REFRACTION</span>
                  <span>A SAMPLE STUDY JOURNEY</span>
                </div>
                <motion.div
                  className="aven-paper-stack"
                  style={{ opacity: staticStory ? 1 : stackOpacity }}
                />
                <motion.div
                  className="aven-floating-paper"
                  style={
                    staticStory
                      ? {}
                      : { x: paperX, scale: paperScale, rotate: paperRotate }
                  }
                >
                  <SourcePage highlighted={!staticStory && chapter > 0} />
                  <motion.div
                    className="aven-source-tab"
                    style={{ opacity: staticStory ? 0 : highlightOpacity }}
                  >
                    <BookOpen size={12} /> SOURCE / 03
                  </motion.div>
                </motion.div>
                <svg className="aven-connection" viewBox="0 0 600 500">
                  <motion.path
                    d="M285 250H310Q330 250 330 230V210Q330 190 350 190H370"
                    fill="none"
                    stroke="#3467ce"
                    strokeWidth="1.5"
                    style={{
                      pathLength: staticStory ? 0 : connection,
                      opacity: staticStory ? 0 : connection,
                    }}
                  />
                </svg>
                <motion.div
                  className="aven-flow-card aven-flow-answer"
                  style={{
                    opacity: staticStory ? 0 : answerOpacity,
                    y: staticStory ? 0 : answerY,
                  }}
                >
                  <span className="aven-card-kicker">THE CONNECTION</span>
                  <h3>
                    A different speed.
                    <br />A new direction.
                  </h3>
                  <p>
                    Light slows down in glass. Entering at an angle bends its
                    path towards the normal.
                  </p>
                  <span className="aven-citation">
                    <BookOpen size={13} />
                    From your notes · Page 3
                  </span>
                </motion.div>
                <motion.div
                  className="aven-flow-card aven-flow-quiz"
                  style={{
                    opacity: staticStory ? 0 : quizOpacity,
                    y: staticStory ? 0 : quizY,
                  }}
                >
                  <span className="aven-card-kicker">THE QUICK CHECK</span>
                  <h3>
                    What changes
                    <br />
                    when light enters glass?
                  </h3>
                  <div className="aven-mini-option">
                    Its speed stays the same.
                  </div>
                  <div className="aven-mini-option is-correct">
                    <Check size={14} />
                    It slows down.
                  </div>
                  <span className="aven-citation">
                    Same idea. A stronger connection.
                  </span>
                </motion.div>
              </div>
            </div>
            <div className="aven-story-footer">
              <div className="aven-chapters" aria-label="Study story progress">
                {["Your material", "The connection", "A little practice"].map(
                  (label, i) => (
                    <span
                      key={label}
                      className={chapter === i ? "current" : ""}
                    >
                      <b>0{i + 1}</b>
                      {label}
                    </span>
                  ),
                )}
              </div>
              <span className="aven-story-disclosure">
                AN INTERACTIVE PRODUCT CONCEPT
              </span>
            </div>
            <div className="aven-story-track" aria-hidden="true">
              <motion.div
                style={{ scaleX: staticStory ? 1 : scrollYProgress }}
              />
            </div>
          </div>
        </section>

        <section className="aven-demo aven-section" id="try-it">
          <div className="aven-section-heading">
            <div>
              <span className="aven-eyebrow">
                03 / A SMALL MOMENT OF CLARITY
              </span>
              <h2>
                Don’t just read it.
                <br />
                <em>Explore it.</em>
              </h2>
            </div>
            <p>
              A sample from a physics lesson. Open the source, follow the
              explanation, then check your understanding. No account needed.
            </p>
          </div>
          <motion.div
            className="aven-demo-shell"
            initial={staticStory ? false : { y: 18 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="aven-demo-toolbar">
              <span>
                <FileText size={16} />
                Light & refraction.pdf
              </span>
              <span className="aven-demo-badge">Illustrative demo</span>
            </div>
            <div className="aven-demo-columns">
              <div className="aven-source-panel" id="aven-demo-source">
                <SourcePage highlighted={showSource} />
              </div>
              <div className="aven-demo-chat">
                <span className="aven-eyebrow">LET’S UNDERSTAND THIS</span>
                <div className="aven-question">
                  Why does light bend when it enters glass?
                </div>
                <div className="aven-explanation">
                  <h3>
                    A different medium.
                    <br />A different speed.
                  </h3>
                  <p>
                    Light travels more slowly in glass than in air. When it
                    enters at an angle to the normal, this change in speed
                    changes its direction, bending the ray towards the normal.
                  </p>
                  <p>
                    At normal incidence, its speed changes but its direction
                    does not.
                  </p>
                  <button
                    className="aven-source-button"
                    aria-pressed={showSource}
                    aria-controls="aven-demo-source"
                    onClick={() => setShowSource((v) => !v)}
                  >
                    <BookOpen size={16} />
                    {showSource
                      ? "Hide source highlight"
                      : "Show the source · Page 3"}
                    <ArrowRight size={16} />
                  </button>
                  <p className="aven-source-feedback" role="status">
                    {showSource
                      ? "The supporting passage is highlighted in blue in the document."
                      : "Every connection starts with something you can check."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="aven-practice aven-section" id="practice">
          <div className="aven-section-heading">
            <div>
              <span className="aven-eyebrow">04 / MAKE IT STICK</span>
              <h2>
                A small question.
                <br />A real step <em>forward.</em>
              </h2>
            </div>
            <p>
              Try a quick check on the example you just explored. Getting
              something wrong is a useful place to start.
            </p>
          </div>
          <motion.div
            className="aven-quiz"
            initial={staticStory ? false : { y: 18 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="aven-practice-note">
              <span className="aven-eyebrow">THE IDEA TO REMEMBER</span>
              <div className="aven-ray-figure" aria-hidden="true">
                <svg viewBox="0 0 240 180">
                  <rect x="0" y="90" width="240" height="90" fill="#dce6ee" />
                  <path d="M120 0V180" stroke="#71859d" strokeDasharray="4 5" />
                  <path
                    d="M30 5L120 90L154 175"
                    stroke="#3467ce"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </div>
              <h3>
                Same light.
                <br />
                Different medium.
              </h3>
              <p>Changing speed can change direction.</p>
            </div>
            <div className="aven-quiz-body">
              <fieldset>
                <legend>
                  Light enters glass from air at an angle to the normal. What
                  happens?
                </legend>
                {[
                  "It speeds up and bends away from the normal.",
                  "It slows down and bends towards the normal.",
                  "Its speed and direction stay the same.",
                ].map((option, i) => (
                  <label
                    key={option}
                    className={`aven-option ${choice === i ? "chosen" : ""}`}
                  >
                    <input
                      type="radio"
                      name="refraction"
                      checked={choice === i}
                      onChange={() => setChoice(i)}
                    />
                    <span>{option}</span>
                    {choice === i && i === 1 && <Check size={18} />}
                  </label>
                ))}
              </fieldset>
              <div className="aven-quiz-feedback" role="status">
                {choice === null
                  ? "Choose an answer. You can change your mind."
                  : choice === 1
                    ? "Exactly. Glass has a higher refractive index: light slows down and bends towards the normal."
                    : "Not quite. Think about the change in speed: light slows down in glass. Try another answer, or revisit the source."}
              </div>
              {choice !== null && (
                <button className="aven-reset" onClick={() => setChoice(null)}>
                  <RotateCcw size={14} />
                  Try again
                </button>
              )}
            </div>
          </motion.div>
        </section>
        <section className="aven-closing aven-section">
          <span className="aven-eyebrow">MAKE SPACE FOR UNDERSTANDING</span>
          <h2>
            Your next chapter
            <br />
            <em>starts here.</em>
          </h2>
          <p>
            Start with your documents, explore relevant passages,
            <br />
            and practise with Aven’s curriculum tools.
          </p>
          <button className="aven-button" onClick={start}>
            Bring your first idea
            <ArrowRight size={18} />
          </button>
          <span className="aven-preview-label">
            The guided tutor above is a concept demo. Document search and
            curriculum practice are available in the workspace.
          </span>
        </section>
      </main>
      <footer className="aven-footer">
        <a className="aven-wordmark" href="#">
          AVEN
        </a>
        <span>A little more understood, every day.</span>
        <a href="#aven-intro">Back to top ↑</a>
      </footer>
    </div>
  );
}
