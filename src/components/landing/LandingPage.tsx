/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, ArrowRight, BookOpen, Check, FileText, RotateCcw } from 'lucide-react';
import './landing.css';

interface LandingPageProps { onEnter: (mode: 'login' | 'register') => void; signedIn: boolean }

function SourcePage({ highlighted = false }: { highlighted?: boolean }) {
  return <div className={`aven-paper ${highlighted ? 'is-highlighted' : ''}`}>
    <div className="paper-meta"><span>PHYSICS / YOUR NOTES</span><span>03</span></div>
    <p className="paper-chapter">2.4 / A change of direction</p>
    <h3>Why does light bend?</h3>
    <p>When light enters a different medium, its speed can change.</p>
    <p className="paper-highlight">At an angle to the normal, light bends towards the normal when it enters a medium with a higher refractive index.</p>
    <svg viewBox="0 0 300 155" role="img" aria-label="Light ray bending towards the normal as it enters a medium with a higher refractive index">
      <rect x="0" y="75" width="300" height="80" fill="#e8eef4" />
      <path d="M0 75H300 M150 0V155" stroke="#8795a7" strokeDasharray="4 5" />
      <path d="M65 8L150 75L179 148" fill="none" stroke="#2861dc" strokeWidth="3" />
      <text x="197" y="28" fontSize="11" fill="#526378">air</text><text x="197" y="125" fontSize="11" fill="#526378">glass</text>
    </svg>
    <div className="paper-foot">Your material. A place to begin.</div>
  </div>;
}

export function LandingPage({ onEnter, signedIn }: LandingPageProps) {
  const story = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: story, offset: ['start start', 'end end'] });
  const rotation = useTransform(scrollYProgress, [0, .4, .75, 1], [9, -3, 0, -5]);
  const lift = useTransform(scrollYProgress, [0, .5, 1], [35, -15, 10]);
  const answerOpacity = useTransform(scrollYProgress, [0, .2, .35], [0, 0, 1]);
  const highlightOpacity = useTransform(scrollYProgress, [0, .15, .35], [0, 0, 1]);
  const [showSource, setShowSource] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const start = () => onEnter('register');

  return <div className="aven-landing">
    <a className="aven-skip" href="#aven-intro">Skip to content</a>
    <header className="aven-nav">
      <a href="#" className="aven-wordmark" aria-label="Aven home">AVEN<span>study, a little differently.</span></a>
      <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#try-it">Try the demo</a><button className="aven-login" onClick={() => onEnter('login')}>{signedIn ? 'My workspace' : 'Log in'}</button><button className="aven-button" onClick={start}>{signedIn ? 'Open Aven' : 'Get started'}<ArrowRight size={15} /></button></nav>
    </header>

    <main>
      <section ref={story} className="aven-story" id="how-it-works">
        <div className="aven-story-art" aria-hidden="true">
          <div className="aven-art-stage">
            <div className="aven-orbit orbit-one" /><div className="aven-orbit orbit-two" />
            <div className="aven-sphere" /><div className="aven-pebble" />
            <svg className="aven-ribbon" viewBox="0 0 600 600"><motion.path d="M40 490C510 560 5 170 340 130S610 420 270 525" fill="none" stroke="#3262cf" strokeWidth="2" style={{ pathLength: reduced ? 1 : scrollYProgress }} /></svg>
            <motion.div className="aven-floating-paper" style={reduced ? {} : { rotate: rotation, y: lift }}><SourcePage /><motion.div className="aven-paper-glow" style={{ opacity: reduced ? .6 : highlightOpacity }} /></motion.div>
            <motion.div className="aven-answer-float" style={{ opacity: reduced ? 1 : answerOpacity }}><span className="aven-eyebrow">A LITTLE CLEARER</span><h3>Same light.<br />A different speed.</h3><p>A change in speed explains the change in direction.</p><span className="aven-citation"><BookOpen size={14} />Source · Page 3</span></motion.div>
          </div>
        </div>
        <div className="aven-story-copy">
          <section className="aven-scene" id="aven-intro"><span className="aven-eyebrow">A SPACE FOR YOUR NEXT LIGHTBULB MOMENT</span><h1>Your notes.<br />A clearer <em>mind.</em></h1><p>Bring your material. Find what matters.<br />Build understanding, one question at a time.</p><div className="aven-actions"><button className="aven-button" onClick={start}>Start learning<ArrowRight size={17} /></button><a className="aven-button aven-secondary" href="#try-it">Explore the demo</a></div><a className="aven-scroll" href="#understand">SCROLL TO EXPLORE<ArrowDown size={18} /></a></section>
          <section className="aven-scene" id="understand"><span className="aven-eyebrow">01 / CONNECT THE DOTS</span><h2>Less searching.<br />More <em>understanding.</em></h2><p>Your notes hold the starting point. Aven’s document search helps you find relevant passages, so you can return to the material behind an idea.</p><span className="aven-margin-note">A question. A passage. A connection.</span></section>
          <section className="aven-scene"><span className="aven-eyebrow">02 / FOLLOW YOUR CURIOSITY</span><h2>An answer<br />you can <em>trace.</em></h2><p>Explore our vision for a tutor that explains an idea and connects it to your source. Try the sample below to see how that experience could feel.</p><a className="aven-text-link" href="#try-it">Follow the connection<ArrowRight size={18} /></a><span className="aven-preview-label">Tutor concept preview · not a live AI response</span></section>
        </div>
      </section>

      <section className="aven-demo aven-section" id="try-it">
        <div className="aven-section-heading"><div><span className="aven-eyebrow">03 / A SMALL MOMENT OF CLARITY</span><h2>Don’t just read it.<br /><em>Explore it.</em></h2></div><p>A sample from a physics lesson. Open the source, follow the explanation, then check your understanding. No account needed.</p></div>
        <div className="aven-demo-shell">
          <div className="aven-demo-toolbar"><span><FileText size={16} />Light & refraction.pdf</span><span className="aven-demo-badge">Illustrative demo</span></div>
          <div className="aven-demo-columns">
            <div className="aven-source-panel" id="aven-demo-source"><SourcePage highlighted={showSource} /></div>
            <div className="aven-demo-chat"><span className="aven-eyebrow">LET’S UNDERSTAND THIS</span><div className="aven-question">Why does light bend when it enters glass?</div><div className="aven-explanation"><h3>A different medium.<br />A different speed.</h3><p>Light travels more slowly in glass than in air. When it enters at an angle to the normal, this change in speed changes its direction, bending the ray towards the normal.</p><p>At normal incidence, its speed changes but its direction does not.</p><button className="aven-source-button" aria-pressed={showSource} aria-controls="aven-demo-source" onClick={() => setShowSource(v => !v)}><BookOpen size={16} />{showSource ? 'Hide source highlight' : 'Show the source · Page 3'}<ArrowRight size={16} /></button><p className="aven-source-feedback" role="status">{showSource ? 'The supporting passage is highlighted in blue in the document.' : 'Every connection starts with something you can check.'}</p></div></div>
          </div>
        </div>
      </section>

      <section className="aven-practice aven-section" id="practice"><div className="aven-section-heading"><div><span className="aven-eyebrow">04 / MAKE IT STICK</span><h2>A small question.<br />A real step <em>forward.</em></h2></div><p>Try a quick check on the example you just explored. Getting something wrong is a useful place to start.</p></div>
        <div className="aven-quiz"><div className="aven-water" aria-hidden="true"><div /><span>Pause.<br />Let it click.</span></div><div className="aven-quiz-body"><fieldset><legend>Light enters glass from air at an angle to the normal. What happens?</legend>{['It speeds up and bends away from the normal.', 'It slows down and bends towards the normal.', 'Its speed and direction stay the same.'].map((option, i) => <label key={option} className={`aven-option ${choice === i ? 'chosen' : ''}`}><input type="radio" name="refraction" checked={choice === i} onChange={() => setChoice(i)} /><span>{option}</span>{choice === i && i === 1 && <Check size={18} />}</label>)}</fieldset><div className="aven-quiz-feedback" role="status">{choice === null ? 'Choose an answer. You can change your mind.' : choice === 1 ? 'Exactly. Glass has a higher refractive index: light slows down and bends towards the normal.' : 'Not quite. Think about the change in speed: light slows down in glass. Try another answer, or revisit the source.'}</div>{choice !== null && <button className="aven-reset" onClick={() => setChoice(null)}><RotateCcw size={14} />Try again</button>}</div></div>
      </section>
      <section className="aven-closing aven-section"><span className="aven-eyebrow">MAKE SPACE FOR UNDERSTANDING</span><h2>Your next chapter<br /><em>starts here.</em></h2><p>Start with your documents, explore relevant passages,<br />and practise with Aven’s curriculum tools.</p><button className="aven-button" onClick={start}>Bring your first idea<ArrowRight size={18} /></button><span className="aven-preview-label">The guided tutor above is a concept demo. Document search and curriculum practice are available in the workspace.</span></section>
    </main>
    <footer className="aven-footer"><a className="aven-wordmark" href="#">AVEN</a><span>A little more understood, every day.</span><a href="#aven-intro">Back to top ↑</a></footer>
  </div>;
}
