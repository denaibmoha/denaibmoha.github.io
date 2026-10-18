import { Component, lazy, Suspense, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDown, ArrowUp, Plus, Minus, Pause, Play, CodeXml, MapPin, Command, Download } from 'lucide-react';
import { profile, project, journey, modes, expertise } from './content';

const AILab = lazy(() => import('./lab/AILab'));
const ParticleScene = lazy(() => import('./components/ParticleScene'));

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-fallback"><span>✳</span><p>A little imagination goes a long way.<br/>3D preview unavailable on this device.</p></div> : this.props.children; }
}

function SectionHeading({ index, title, note }: { index: string; title: string; note: string }) {
  return <div className="section-heading"><p className="eyebrow">{index} / {title}</p><span className="small-note">{note}</span></div>;
}

function Hero() {
  const [mode, setMode] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const visualRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [tabActive, setTabActive] = useState(!document.hidden);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '100px' });
    if (visualRef.current) observer.observe(visualRef.current);
    const updateVisibility = () => setTabActive(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', updateVisibility); };
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPaused(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return <>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <a className="hero-identity" href="#about"><img src={profile.portrait} alt="" width="54" height="54"/><span><strong>Mahmoud Denaib</strong><span>APPLIED AI · NLP · COMPUTER SCIENCE</span></span><ArrowUpRight size={16}/></a>
        <h1 id="hero-title">Making AI<br/>feel <em>human.</em></h1>
        <p className="intro">I'm Mahmoud, a Computer Science student and part-time AI/ML Engineer in Kraków. I explore language, conversational memory, and AI that helps people learn.</p>
        <div className="hero-actions"><a className="button" href="#work">Explore my work <ArrowUpRight size={19}/></a><a className="resume-link" href={profile.resume} download>Download CV <Download size={15}/></a></div>
        <div className="hero-foot"><span><MapPin size={12}/> BASED IN KRAKÓW, PL</span><a href="#work">SCROLL TO EXPLORE <ArrowDown size={12}/></a></div>
      </div>
      <div className="visual" ref={visualRef}>
        <div className="scene-grid" aria-hidden="true"/>
        <div className="scene-top"><span>FIG. 001 — SIGNAL / NOISE</span><span className="live-label"><span className="status-dot"/> LIVE STUDY</span></div>
        <div className="scene" role="img" aria-label={`Interactive 3D particle sculpture: ${modes[mode].name}. Drag to rotate. Use buttons below to change shape.`}><SceneBoundary><Suspense fallback={<div className="scene-loading">RESOLVING SIGNAL…</div>}><ParticleScene mode={mode} paused={paused || !visible || !tabActive}/></Suspense></SceneBoundary></div>
        <div className="scene-coordinate" aria-hidden="true">x 0.42<br/>y 0.86<br/>z 0.19</div>
        <div className="scene-caption"><Plus size={18}/><p aria-live="polite">{modes[mode].caption[0]}<br/>{modes[mode].caption[1]}</p></div>
        <div className="scene-controls"><div className="mode-group" role="group" aria-label="Particle sculpture mode">{modes.map((m, i) => <button key={m.name} className={mode === i ? 'active' : ''} onClick={() => setMode(i)} aria-pressed={mode === i}>{m.name}</button>)}</div><button className="motion" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play animation' : 'Pause animation'} aria-pressed={paused}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button></div>
        <p className="scene-hint">DRAG TO ROTATE <span>·</span> SELECT A SIGNAL TO TRANSFORM</p>
      </div>
    </section>
    <div className="ticker" aria-label="Areas of interest">{['LANGUAGE & INTELLIGENCE', 'CONTEXT & MEMORY', 'VOICE & INTERACTION', 'HUMAN-CENTRED AI'].map(t => <span key={t}>{t}<i aria-hidden="true">✳</i></span>)}</div>
  </>;
}

function ConversationConcept() {
  return <div className="project-art" aria-label="Illustrative concept of a language learning conversation interface">
    <div className="concept-top"><span>CONVERSATION LAB</span><span>DESIGN CONCEPT <ArrowUpRight size={12}/></span></div>
    <div className="avatar-orbit" aria-hidden="true"><div className="avatar-core"><span>✳</span></div><i/><i/><span className="orbit-dot"/></div>
    <div className="conversation"><div className="bubble learner"><small>YOU</small><span lang="fr">Je voudrais pratiquer mon français.</span></div><div className="bubble tutor"><small>AI COMPANION</small><span lang="fr">Bien sûr. De quoi aimerais-tu parler ?</span><div className="wave" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ height: `${5 + ((i * 17 + 13) % 22)}px` }}/>)}</div></div></div>
    <p className="concept-note">ILLUSTRATIVE INTERFACE / NOT A PRODUCT SCREENSHOT</p>
  </div>;
}

function Work() {
  const [expanded, setExpanded] = useState(false);
  return <section className="work section" id="work" aria-labelledby="work-title">
    <SectionHeading index="01" title="SELECTED WORK" note="EXPLORATIONS, IN PROGRESS."/>
    <div className="work-heading"><h2 id="work-title">Less friction.<br/><em>More conversation.</em></h2><p>A focus on useful experiences, thoughtful evaluation, and the human on the other side of the model.</p></div>
    <article className="project"><ConversationConcept/><div className="project-copy"><div className="project-meta"><span>01 / APPLIED AI</span><span className="pill"><span/> IN DEVELOPMENT</span></div><h3>A conversation.<br/>A little more confidence.</h3><p>{project.description}</p><div className="tags">{project.tags.map(t => <span key={t}>{t}</span>)}</div><div className="project-role"><small>MY ROLE</small><p>{project.role}<br/>{project.organization} · {project.period}</p></div><button className="text-link" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="project-details">Inside the exploration {expanded ? <Minus size={20}/> : <Plus size={20}/>}</button></div></article>
    <div className="project-details" id="project-details" hidden={!expanded}>{project.details.map(d => <div key={d.label}><span>{d.label}</span><h4>{d.title}</h4><p>{d.text}</p></div>)}<p className="detail-note">Ongoing exploration described in my CV. No production results or performance benchmarks are claimed.</p></div>
    <a className="repo-row" href={profile.github} target="_blank" rel="noopener noreferrer"><div><Command className="repo-icon" size={32}/><div><h3>Follow the work as it evolves.</h3><p>Code, experiments, and what's next — on GitHub.</p></div></div><span className="round-arrow"><ArrowUpRight size={24}/></span></a>
  </section>;
}

function About() {
  return <section className="about section" id="about" aria-labelledby="about-title"><SectionHeading index="03" title="THE PERSON BEHIND THE MODELS" note="CURIOUS BY DEFAULT."/>
    <div className="about-grid"><div className="portrait-column"><figure className="portrait"><img src={profile.portrait} alt="Mahmoud Denaib smiling, wearing glasses and a dark jacket" width="400" height="400" loading="lazy"/><span className="portrait-mark" aria-hidden="true">✳</span><figcaption><span>THE HUMAN IN THE LOOP</span><span>01 / MD</span></figcaption></figure><div className="portrait-signoff"><span>Mahmoud Denaib</span><span><MapPin size={12}/> {profile.location}</span></div></div><div className="about-body"><h2 id="about-title">A technical mind.<br/><em>A human perspective.</em></h2><p className="large-copy">Before models, there were people.</p><p>My path into AI started with real conversations: helping customers in French and Arabic, understanding what they needed, and finding a practical way forward.</p><p>Today, I study Computer Science at WSB University and work part-time on a conversational language-learning application. I'm exploring how dialogue, memory, and voice can help people practise speaking with more confidence.</p><p>I bring that same customer-facing perspective to technical questions: Is the feedback useful? Does the reply fit the conversation? Is the experience worth the wait?</p><div className="language-list"><span>Arabic <small>NATIVE</small></span><span>French <small>CUSTOMER-FACING USE</small></span><span>English <small>B2 / HIGH PASS</small></span></div><a className="about-cv" href={profile.resume} download>My experience, on paper <Download size={16}/></a></div></div>
    <div className="expertise-heading"><p className="eyebrow">WHAT I BRING TO THE WORK</p><span className="small-note">PRACTICE, WITH A PURPOSE.</span></div><div className="expertise-grid">{expertise.map(item => <article key={item.number}><span className="expertise-number">{item.number} <ArrowUpRight size={15}/></span><h3>{item.title}</h3><p>{item.text}</p><small>{item.tools}</small></article>)}</div>
    <div className="toolkit"><span className="eyebrow">ON MY WORKBENCH</span><p>{['Python', 'SQL', 'PyTorch', 'LangGraph', 'AutoGen', 'Vector embeddings', 'Speech models'].map((t, i) => <span key={t}>{i > 0 && <i>/</i>}{t}</span>)}</p></div>
    <div className="journey">{journey.map(j => <div key={j.title}><span className="journey-date">{j.period}</span><h3>{j.title}</h3><p>{j.place}<br/>{j.detail}</p></div>)}</div>
  </section>;
}

function Contact() {
  return <section className="contact section" id="contact" aria-labelledby="contact-title"><SectionHeading index="04" title="NEXT CONVERSATION" note="START WITH A HELLO."/><div className="contact-heading"><h2 id="contact-title">Have something<br/><em>in mind?</em></h2><span className="contact-star" aria-hidden="true">✳</span></div><div className="contact-bottom"><a className="email" href={`mailto:${profile.email}`}>{profile.email}<ArrowUpRight/></a><div className="socials"><a href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRight size={16}/></a><a href={profile.github} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={16}/></a></div></div></section>;
}

export default function App() {
  return <><a className="skip" href="#work">Skip to content</a><header className="nav"><a className="wordmark" href="#" aria-label="Mahmoud Denaib home">md<span className="asterisk" aria-hidden="true">✳</span></a><nav aria-label="Main navigation"><a href="#work">Work <span>01</span></a><a href="#lab">Lab <span>02</span></a><a href="#about">About <span>03</span></a><a href="#contact">Contact <ArrowUpRight size={12}/></a></nav><a className="github-link" href={profile.github} target="_blank" rel="noopener noreferrer"><CodeXml size={16}/> GitHub <ArrowUpRight size={14}/></a></header><main><Hero/><Work/><Suspense fallback={<section id="lab" className="section lab-loading">Opening the AI lab…</section>}><AILab/></Suspense><About/><Contact/></main><footer><span>© {new Date().getFullYear()} MAHMOUD DENAIB</span><span>BUILT WITH CURIOSITY & THREE.JS</span><a href="#">BACK TO TOP <ArrowUp size={12}/></a></footer></>;
}
