/// <reference lib="webworker" />
import type { LabRequest, LabMessage, LabResult } from './types';
import type { FeatureExtractionPipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import type { KokoroTTS } from 'kokoro-js';

let embedder: FeatureExtractionPipeline | undefined;
let recognizer: AutomaticSpeechRecognitionPipeline | undefined;
let speaker: KokoroTTS | undefined;
let ocr: import('tesseract.js').Worker | undefined;
let busy = false;
const send = (message: LabMessage) => self.postMessage(message);
const progress = (event: { status: string; file?: string; progress?: number }) => {
  if (event.status === 'progress') send({ type: 'progress', message: `Downloading ${event.file?.split('/').pop() ?? 'model'}`, percent: event.progress });
  else if (event.status === 'initiate') send({ type: 'progress', message: 'Fetching model assets…' });
};

self.onmessage = async ({ data }: MessageEvent<LabRequest>) => {
  if (busy) return;
  busy = true;
  const start = performance.now();
  try {
    send({ type: 'progress', message: 'Preparing local runtime…' });
    const tf = data.mode !== 'ocr' ? await import('@huggingface/transformers') : null;
    if (tf) {
      tf.env.allowLocalModels = false;
      tf.env.useBrowserCache = true;
      tf.env.backends.onnx.wasm!.numThreads = 1; // GitHub Pages does not set cross-origin isolation headers.
      tf.env.backends.onnx.wasm!.proxy = false;
      tf.env.backends.onnx.wasm!.wasmPaths = `${data.base}ort/`;
    }
    let result: LabResult;
    if (data.mode === 'embed' && tf) {
      const texts = data.texts ?? [];
      if (texts.length < 4 || texts.length > 16 || new Set(texts).size < 4 || texts.some(t => !t.trim() || t.length > 180)) throw new Error('Use 4–16 short sentences, up to 180 characters each.');
      const createEmbeddingPipeline = tf.pipeline as (task: 'feature-extraction', model: string, options: Record<string, unknown>) => Promise<FeatureExtractionPipeline>;
      embedder ??= await createEmbeddingPipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', { device: 'wasm', dtype: 'q8', progress_callback: progress });
      send({ type: 'progress', message: 'Encoding sentences into 384 dimensions…' });
      const inferenceStart = performance.now();
      const embeddings = await embedder(texts, { pooling: 'cls', normalize: true });
      const inferenceMs = performance.now() - inferenceStart;
      const vectors = embeddings.tolist() as number[][];
      const { PCA } = await import('ml-pca');
      const pca = new PCA(vectors, { center: true });
      const points = pca.predict(vectors, { nComponents: 3 }).to2DArray();
      const variance = pca.getExplainedVariance().slice(0, 3).reduce((a, b) => a + b, 0);
      if (!Number.isFinite(variance) || points.flat().some(v => !Number.isFinite(v))) throw new Error('These sentences are too similar for a meaningful 3D map. Try several different topics.');
      const scale = Math.max(...points.flat().map(Math.abs), 0.001);
      const similarities = vectors.map(a => vectors.map(b => a.reduce((sum, v, j) => sum + v * b[j], 0)));
      result = { mode: 'embed', inferenceMs, totalMs: performance.now() - start, embedding: { texts, vectors, points: points.map(p => p.map(v => v / scale * 2)), variance, similarities } };
    } else if (data.mode === 'tts' && data.ttsEngine === 'kitten') {
      if (!data.text?.trim() || data.text.length > 280) throw new Error('Enter 1–280 characters.');
      const { generateKitten } = await import('./kitten');
      const output = await generateKitten(data.text, data.voice ?? 'af_heart', progress, message => send({ type: 'progress', message }));
      result = { mode: 'tts', ...output, totalMs: performance.now() - start };
    } else if (data.mode === 'tts') {
      if (!data.text?.trim() || data.text.length > 280) throw new Error('Enter 1–280 characters of English text.');
      const { KokoroTTS } = await import('kokoro-js');
      speaker ??= await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'wasm', progress_callback: progress });
      send({ type: 'progress', message: 'Synthesizing speech locally…' });
      const inferenceStart = performance.now();
      const audio = await speaker.generate(data.text, { voice: data.voice ?? 'af_heart' });
      result = { mode: 'tts', inferenceMs: performance.now() - inferenceStart, totalMs: performance.now() - start, audio: new Float32Array(audio.audio), sampleRate: audio.sampling_rate };
    } else if (data.mode === 'stt' && tf) {
      if (!data.audio || data.audio.length < 1600 || data.audio.length > 16000 * 20) throw new Error('Use a speech clip between 0.1 and 20 seconds.');
      const createASRPipeline = tf.pipeline as (task: 'automatic-speech-recognition', model: string, options: Record<string, unknown>) => Promise<AutomaticSpeechRecognitionPipeline>;
      recognizer ??= await createASRPipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', { device: 'wasm', dtype: 'q8', progress_callback: progress });
      send({ type: 'progress', message: 'Transcribing English speech locally…' });
      const inferenceStart = performance.now();
      const output = await recognizer(data.audio, { max_new_tokens: 100, chunk_length_s: 20, return_timestamps: false });
      result = { mode: 'stt', inferenceMs: performance.now() - inferenceStart, totalMs: performance.now() - start, text: (Array.isArray(output) ? output[0] : output).text.trim() };
    } else if (data.mode === 'ocr') {
      if (!data.image) throw new Error('Choose an image first.');
      const { createWorker, OEM, PSM } = await import('tesseract.js');
      ocr ??= await createWorker('eng', OEM.LSTM_ONLY, {
        workerPath: `${data.base}ocr/worker.min.js`, corePath: `${data.base}ocr/`, workerBlobURL: false,
        langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int',
        logger: event => send({ type: 'progress', message: event.status, percent: event.progress * 100 }),
      });
      await ocr.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      const inferenceStart = performance.now();
      const { data: output } = await ocr.recognize(data.image);
      result = { mode: 'ocr', inferenceMs: performance.now() - inferenceStart, totalMs: performance.now() - start, text: output.text.trim(), confidence: output.confidence };
    } else throw new Error('Unknown experiment.');
    send({ type: 'result', result });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'The local model could not run. Try a desktop browser or another experiment.' });
  } finally { busy = false; }
};
