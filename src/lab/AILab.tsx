import { lazy, Suspense, useState, useEffect, useRef, Component } from 'react';
import type { ReactNode } from 'react';
import { AudioLines, ScanText, Network, Mic, ArrowUpRight, Download, Play, Square, Pause, RotateCcw } from 'lucide-react';
import type { LabMode, LabResult, LabMessage, LabRequest, EmbeddingResult } from './types';
import { models, exampleTexts, kittenConfig } from './models';
import { decodeAudio, prepareImage, wavBlob } from './audio';
import exampleEmbeddingData from './example-embedding.json';
import './lab.css';
const exampleEmbedding = exampleEmbeddingData as EmbeddingResult;

const VectorScene = lazy(() => import('./VectorScene'));
const base = new URL(import.meta.env.BASE_URL, document.baseURI).href;
const tabs = [{ id: 'embed', label: 'Vector space', icon: Network }, { id: 'tts', label: 'Speak', icon: AudioLines }, { id: 'stt', label: 'Listen', icon: Mic }, { id: 'ocr', label: 'Read', icon: ScanText }] as const;
class VisualBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="lab-visual-fallback">3D is unavailable. The models and text results still work.</div> : this.props.children; }
}

export default function AILab() {
  const [mode, setMode] = useState<LabMode>('embed');
  const [sentences, setSentences] = useState(exampleTexts.join('\n'));
  const [text, setText] = useState('Good AI starts with understanding people. Stay curious, and build something useful.');
  const [ttsEngine, setTTSEngine] = useState<'kitten' | 'kokoro'>('kitten');
  const [voice, setVoice] = useState<'af_heart' | 'bm_george'>('af_heart');
  const [result, setResult] = useState<LabResult | null>(null), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Precomputed example shown. Run to embed your own text locally.');
  const [percent, setPercent] = useState<number | undefined>(), [error, setError] = useState('');
  const [selected, setSelected] = useState(0), [audioURL, setAudioURL] = useState('');
  const [image, setImage] = useState<Blob | null>(null), [imageURL, setImageURL] = useState(`${base}ocr-sample.png`);
  const [clip, setClip] = useState<Blob | null>(null), [clipName, setClipName] = useState('JFK sample · 11 seconds');
  const [waveform, setWaveform] = useState<Float32Array | undefined>();
  const [micPending, setMicPending] = useState(false);
  const [recording, setRecording] = useState(false), [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const worker = useRef<Worker | null>(null), recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null), recordingChunks = useRef<Blob[]>([]), generation = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null), ocrRef = useRef<HTMLInputElement>(null);
  const cleanupRecording = () => { if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); if (timer.current) clearInterval(timer.current); };
  useEffect(() => () => { generation.current++; worker.current?.terminate(); cleanupRecording(); }, []);
  useEffect(() => () => { if (audioURL) URL.revokeObjectURL(audioURL); }, [audioURL]);
  useEffect(() => () => { if (imageURL.startsWith('blob:')) URL.revokeObjectURL(imageURL); }, [imageURL]);
  const cancel = () => { generation.current++; worker.current?.terminate(); worker.current = null; setBusy(false); setPercent(undefined); setStatus('Stopped. Model memory released; browser caches may retain downloaded weights.'); };
  const changeMode = (next: LabMode) => { if (next === mode) return; cancel(); cleanupRecording(); setRecording(false); setMicPending(false); setMode(next); setError(''); setResult(null); setAudioURL(''); setWaveform(undefined); setSelected(0); setStatus('No model loaded. Choose an input, then run locally.'); };

  async function run() {
    setBusy(true); setError(''); setPercent(undefined); setStatus('Preparing input…');
    const job = ++generation.current;
    try {
      const request: LabRequest = { mode, base };
      if (mode === 'embed') { request.texts = sentences.split('\n').map(t => t.trim()).filter(Boolean); if (request.texts.length < 4 || request.texts.length > 16 || new Set(request.texts).size < 4 || request.texts.some(t => t.length > 180)) throw new Error('Use 4–16 sentences with at least four distinct entries, one per line, up to 180 characters each.'); }
      if (mode === 'tts') { request.text = text; request.voice = voice; request.ttsEngine = ttsEngine; if (!text.trim()) throw new Error('Write something to say first.'); }
      if (mode === 'stt') { const blob: Blob = clip ? clip : await fetch(`${base}jfk.wav`).then(r => { if (!r.ok) throw new Error('Could not load the sample.'); return r.blob(); }); request.audio = await decodeAudio(blob); if (generation.current === job) setWaveform(request.audio); }
      if (mode === 'ocr') { const blob: Blob = image ? image : await fetch(`${base}ocr-sample.png`).then(r => { if (!r.ok) throw new Error('Could not load the sample.'); return r.blob(); }); request.image = await prepareImage(blob); }
      if (generation.current !== job) return;
      worker.current ??= new Worker(new URL('./inference.worker.ts', import.meta.url), { type: 'module' });
      worker.current.onmessage = ({ data }: MessageEvent<LabMessage>) => {
        if (generation.current !== job) return;
        if (data.type === 'progress') { setStatus(data.message); setPercent(data.percent); }
        else if (data.type === 'error') { setBusy(false); setError(data.message); setStatus('Experiment stopped. You can retry or switch tools.'); setPercent(undefined); worker.current?.terminate(); worker.current = null; }
        else { setResult(data.result); setSelected(0); setBusy(false); setPercent(undefined); setStatus('Complete. Inference ran on this device.'); if (data.result.audio) { setWaveform(data.result.audio); setAudioURL(URL.createObjectURL(wavBlob(data.result.audio, data.result.sampleRate!))); } }
      };
      worker.current.onerror = event => { if (generation.current !== job) return; setError(event.message || 'Could not start the local runtime. Try a recent desktop browser.'); setBusy(false); worker.current?.terminate(); worker.current = null; };
      worker.current.postMessage(request);
    } catch (e) { if (generation.current === job) { setBusy(false); setError(e instanceof Error ? e.message : 'Could not process this input.'); setStatus('Check the input and try again.'); } }
  }

  async function toggleRecording() {
    if (micPending) return;
    if (recording) { cleanupRecording(); setRecording(false); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Recording is unavailable. Upload a short audio file instead.'); return; }
    const attempt = generation.current; setMicPending(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation.current !== attempt) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media; recordingChunks.current = [];
      const rec = new MediaRecorder(media); recorder.current = rec;
      rec.ondataavailable = e => { if (e.data.size) recordingChunks.current.push(e.data); };
      rec.onstop = () => { if (generation.current === attempt) { setClip(new Blob(recordingChunks.current, { type: rec.mimeType })); setClipName('Your microphone recording'); setRecording(false); } };
      rec.start(); setRecording(true); setElapsed(0); setError('');
      let seconds = 0; timer.current = setInterval(() => { setElapsed(++seconds); if (seconds >= 19) { cleanupRecording(); setRecording(false); } }, 1000);
    } catch { setError('Microphone access was unavailable. Try an audio file or the built-in sample.'); } finally { if (generation.current === attempt) setMicPending(false); }
  }

  function exportVectors() {
    if (!embedding) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ model: 'Xenova/bge-small-en-v1.5', dtype: 'q8', ...embedding }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'sentence-vectors.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const config = mode === 'tts' && ttsEngine === 'kitten' ? kittenConfig : models[mode], embedding = result?.embedding ?? (mode === 'embed' ? exampleEmbedding : undefined);
  const neighbors = embedding ? embedding.similarities[selected].map((score, i) => ({ score, i })).filter(x => x.i !== selected).sort((a, b) => b.score - a.score) : [];
  return <section className="ai-lab section" id="lab" aria-labelledby="lab-title">
    <div className="section-heading"><p className="eyebrow">02 / THE INTERACTIVE LAB</p><span className="small-note">SMALL MODELS. REAL POSSIBILITIES.</span></div>
    <div className="lab-heading"><h2 id="lab-title">Don't just read.<br/><em>Try a little intelligence.</em></h2><p>A small playground for the ideas behind my work. Real models, running right here in your browser.</p></div>
    <div className="lab-shell"><div className="lab-tabs" role="group" aria-label="Choose AI experiment">{tabs.map(tab => <button key={tab.id} className={mode === tab.id ? 'active' : ''} aria-pressed={mode === tab.id} onClick={() => changeMode(tab.id)}><tab.icon size={16}/>{tab.label}<span>{tab.id === 'embed' ? '01' : tab.id === 'tts' ? '02' : tab.id === 'stt' ? '03' : '04'}</span></button>)}</div>
    <div className="lab-layout"><div className="lab-visual"><div className="lab-figure"><span>{config.subtitle}</span><span>{embedding ? `${embedding.vectors[0].length}D → 3D / PCA` : result ? 'LOCAL MODEL OUTPUT' : 'PARTICLE STUDY / PREVIEW'}</span></div>
      {mode === 'ocr' ? <div className={`ocr-preview ${busy ? 'scanning' : ''}`}><img src={imageURL} alt={image ? 'Your selected image for local text recognition' : 'Printed English sample for OCR'}/>{busy && <span className="scan-line"/>}</div> : <VisualBoundary><Suspense fallback={<div className="lab-visual-fallback">Opening the visual explorer…</div>}><VectorScene embedding={embedding} selected={selected} onSelect={setSelected} paused={paused || busy} waveform={waveform}/></Suspense></VisualBoundary>}
      <div className="lab-visual-bottom"><span>{mode === 'ocr' ? 'YOUR IMAGE STAYS ON THIS DEVICE' : embedding ? `${(embedding.variance * 100).toFixed(1)}% VARIANCE SHOWN · DRAG / ZOOM` : waveform ? 'PARTICLES SAMPLED FROM AUDIO' : 'DECORATIVE PREVIEW · RUN TO SEE REAL OUTPUT'}</span>{mode !== 'ocr' && <button onClick={() => setPaused(!paused)} aria-label={paused ? 'Play lab visual' : 'Pause lab visual'}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button>}</div>
    </div><div className="lab-input"><span className="lab-kicker">{config.model}</span><h3>{config.title}</h3>
      {mode === 'embed' && <><label htmlFor="sentences">Your sentences <span>4–16 lines · English</span></label><textarea id="sentences" rows={8} maxLength={3000} value={sentences} onChange={e => setSentences(e.target.value)} disabled={busy}/><p className="input-tip">Try paraphrases, opposites, and completely different topics.</p></>}
      {mode === 'tts' && <><label htmlFor="speech-text">What should it say? <span>{text.length}/280</span></label><textarea id="speech-text" rows={5} maxLength={280} value={text} onChange={e => setText(e.target.value)} disabled={busy}/><label htmlFor="tts-engine">Model</label><select id="tts-engine" value={ttsEngine} onChange={e => { cancel(); setTTSEngine(e.target.value as typeof ttsEngine); setResult(null); setAudioURL(''); setWaveform(undefined); }} disabled={busy}><option value="kitten">Kitten Nano · smaller / faster</option><option value="kokoro">Kokoro · expressive / slower</option></select><label htmlFor="voice">Voice</label><select id="voice" value={voice} onChange={e => setVoice(e.target.value as typeof voice)} disabled={busy}><option value="af_heart">{ttsEngine === 'kitten' ? 'Bella · English' : 'Heart · American English'}</option><option value="bm_george">{ttsEngine === 'kitten' ? 'Jasper · English' : 'George · British English'}</option></select></>}
      {mode === 'stt' && <><p className="lab-description">Upload a short clip, record a thought, or try the built-in JFK speech sample.</p><div className="lab-file-row"><button onClick={() => inputRef.current?.click()} disabled={busy || recording || micPending}>Choose audio <ArrowUpRight size={15}/></button><button onClick={toggleRecording} disabled={busy || micPending}>{recording ? <Square size={14}/> : <Mic size={14}/>} {recording ? `Stop · ${elapsed}s` : 'Record'}</button></div><input ref={inputRef} type="file" accept="audio/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 10 * 1024 * 1024) setError('Use an audio file under 10 MB.'); else { setClip(f); setClipName(f.name); setError(''); } } }}/><div className="selected-file"><AudioLines size={20}/><span>{clipName}</span></div><button className="sample-reset" disabled={busy || recording || micPending} onClick={() => { setClip(null); setClipName('JFK sample · 11 seconds'); }}><RotateCcw size={12}/> Use built-in sample</button>{!clip && <audio controls preload="none" src={`${base}jfk.wav`} aria-label="JFK speech sample"/>}</>}
      {mode === 'ocr' && <><p className="lab-description">Give a printed page a digital voice. Choose an image or run the clean sample shown here.</p><button className="lab-upload" onClick={() => ocrRef.current?.click()} disabled={busy}><ScanText size={24}/><span>Choose an image<small>PNG, JPEG, WebP · up to 10 MB</small></span><ArrowUpRight size={16}/></button><input ref={ocrRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { const prepared = await prepareImage(f); setImage(prepared); setImageURL(URL.createObjectURL(prepared)); setError(''); setResult(null); } catch (error) { setError(error instanceof Error ? error.message : 'Could not read this image.'); } }}/><button className="sample-reset" disabled={busy} onClick={() => { setImage(null); setImageURL(`${base}ocr-sample.png`); setResult(null); }}><RotateCcw size={12}/> Use built-in sample</button></>}
      <div className="download-note"><Download size={13}/><span>{config.size}{mode !== 'ocr' && ' + ~22 MB runtime'} on first use. Downloads are cached when your browser allows it.</span></div>
      <div className="lab-run-row"><button className="lab-run" onClick={run} disabled={busy || recording || micPending}>{busy ? 'Working locally…' : config.action}<ArrowUpRight size={17}/></button>{busy && <button className="lab-cancel" onClick={cancel}>Cancel</button>}</div>
      <div className="lab-status" role="status"><span className={busy ? 'busy' : ''}/><p>{status}{percent !== undefined && ` · ${Math.round(percent)}% of this file`}</p></div>
      {error && <p className="lab-error" role="alert">{error}</p>}
    </div></div>
    {(result || embedding) && <div className="lab-results"><div className="result-heading"><span>{result ? `YOUR RESULT / ${mode.toUpperCase()}` : 'PRECOMPUTED EXAMPLE / BGE SMALL'}</span><span>{result ? `${(result.inferenceMs / 1000).toFixed(2)}s inference · ${(result.totalMs / 1000).toFixed(2)}s including setup` : 'Run the model above to map your own sentences.'}</span></div>
      {embedding && <><div className="vector-results"><div className="sentence-list" role="group" aria-label="Select a sentence to compare">{embedding.texts.map((sentence, i) => <button key={i} onClick={() => setSelected(i)} className={selected === i ? 'active' : ''} aria-pressed={selected === i}><span>{String(i + 1).padStart(2, '0')}</span>{sentence}</button>)}</div><div className="similarities"><h4>Closest in meaning to sentence {selected + 1}</h4><p>Cosine similarity in the original 384D space</p>{neighbors.slice(0, 4).map(n => <div key={n.i}><span>{n.i + 1}. {embedding.texts[n.i]}</span><strong>{n.score.toFixed(3)}</strong></div>)}<button className="export-vectors" onClick={exportVectors}>Export actual vectors <Download size={13}/></button></div></div><p className="projection-note">PCA preserves {(embedding.variance * 100).toFixed(1)}% of this set's variance. The map changes when the sentence set changes. Node colours and glow are decorative; similarity rankings come from the full model output.</p></>}
      {audioURL && result && <div className="generated-audio"><audio controls src={audioURL} aria-label="Generated local speech"/><a href={audioURL} download="generated-speech.wav">Download WAV <Download size={14}/></a><span>{((result.audio?.length ?? 0) / result.sampleRate!).toFixed(1)}s audio · {((result.inferenceMs / 1000) / ((result.audio?.length ?? 1) / result.sampleRate!)).toFixed(2)}× real-time factor (lower is faster)</span></div>}
      {result?.text !== undefined && <div className="recognized-text"><h4>{mode === 'ocr' ? 'Recognized text' : 'Transcript'}</h4><pre>{result.text || 'No text detected. Try a clearer input.'}</pre>{result.confidence !== undefined && <p>Engine confidence: {result.confidence.toFixed(1)}/100 · not a calibrated accuracy score.</p>}</div>}
    </div>}
    <div className="lab-model-note"><div><span>WHY THIS MODEL?</span><p>{config.evidence} <a href={config.link} target="_blank" rel="noopener noreferrer">Read the evidence <ArrowUpRight size={11}/></a></p></div><div><span>GOOD TO KNOW</span><p>{config.limitation}</p></div></div></div>
    <p className="lab-privacy">Inputs are processed on your device and are not uploaded by this lab. Model files come from Hugging Face; OCR language data comes from jsDelivr. Those hosts receive download requests. No API key required. A recent desktop browser is recommended; speed and memory use vary by device.</p>
  </section>;
}
