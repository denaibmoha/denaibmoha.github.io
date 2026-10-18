import type { LabMode } from './types';

export const models: Record<LabMode, { title: string; subtitle: string; model: string; size: string; evidence: string; link: string; limitation: string; action: string }> = {
  embed: { title: 'See how meaning connects.', subtitle: 'TEXT → VECTOR SPACE', model: 'BGE Small EN v1.5 · int8', size: '~34 MB weights', evidence: '62.17 original MTEB average / 384 dimensions. Model-card result for the original model; this int8 build has not been independently benchmarked.', link: 'https://huggingface.co/BAAI/bge-small-en-v1.5#evaluation', limitation: 'English sentences. PCA compresses 384 dimensions to 3, so visual distances are approximate. Similarities use the full vectors and are not probabilities.', action: 'Embed & explore' },
  tts: { title: 'Give an idea a voice.', subtitle: 'TEXT → SPEECH', model: 'Kokoro 82M v1.0 · int8', size: '~93 MB weights + voice', evidence: '82M-parameter model with published human-preference arena evaluations (Feb 2025). The published comparisons do not establish int8 browser latency or quality.', link: 'https://huggingface.co/hexgrad/Kokoro-82M/blob/main/EVAL.md', limitation: 'English, up to 280 characters. Initial synthesis can take several seconds. Quality depends on punctuation, pronunciation, and the selected voice.', action: 'Generate speech' },
  stt: { title: 'Turn a voice into words.', subtitle: 'SPEECH → TEXT', model: 'Whisper Tiny EN · int8', size: '~41 MB weights', evidence: '39M parameters. The Whisper authors report Tiny as their fastest size tier and note benefits of English-specific models. Their A100 speed comparisons are not browser benchmarks.', link: 'https://github.com/openai/whisper#available-models-and-languages', limitation: 'English, up to 20 seconds. Clean speech works best. Silence, background noise, accents, and music can produce incorrect or invented words.', action: 'Transcribe locally' },
  ocr: { title: 'Find the words in an image.', subtitle: 'IMAGE → TEXT', model: 'Tesseract 5 · WASM / English', size: 'English data + WASM runtime', evidence: 'Tesseract.js v6 improves runtime and memory use and includes reproducible browser benchmarks. Recognition quality depends on the source image; there is no universal OCR accuracy claim.', link: 'https://github.com/naptha/tesseract.js', limitation: 'Printed English text in PNG, JPEG, or WebP. Up to 10 MB; resized to 1600 px. Handwriting, skew, low contrast, and complex layouts are harder. PDFs are not supported.', action: 'Read image locally' },
};

export const exampleTexts = [
  'Learning a language through conversation.',
  'Practising French with a patient tutor.',
  'A voice can make technology feel human.',
  'Speech synthesis turns words into sound.',
  'Memory gives a conversation useful context.',
  'Retrieval brings back relevant information.',
  'The cat is sleeping beside the window.',
  'A kitten is resting in the afternoon sun.',
];

export const kittenConfig = { title: 'Give an idea a voice.', subtitle: 'TEXT → SPEECH', model: 'KittenTTS Nano v0.8 · 15M / fp32', size: '~57 MB weights + ~3 MB voices', evidence: 'A 15M-parameter CPU-oriented alternative to 82M Kokoro. The model card documents browser WASM support; it does not publish a directly comparable human-preference score. Compare the voices and measured speed here.', link: 'https://huggingface.co/onnx-community/KittenTTS-Nano-v0.8-ONNX', limitation: 'English, up to 280 characters. Optimized here for short experiments; unusual names and numbers may be mispronounced. Kokoro is also available for a different quality/speed trade-off.', action: 'Generate speech' };
