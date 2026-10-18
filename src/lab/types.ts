export type LabMode = 'embed' | 'tts' | 'stt' | 'ocr';
export type EmbeddingResult = { texts: string[]; vectors: number[][]; points: number[][]; variance: number; similarities: number[][] };
export type LabResult = { mode: LabMode; inferenceMs: number; totalMs: number; text?: string; confidence?: number; audio?: Float32Array; sampleRate?: number; embedding?: EmbeddingResult };
export type LabRequest = { mode: LabMode; base: string; text?: string; texts?: string[]; audio?: Float32Array; image?: Blob; ttsEngine?: 'kitten' | 'kokoro'; voice?: 'af_heart' | 'bm_george' };
export type LabMessage = { type: 'progress'; message: string; percent?: number } | { type: 'result'; result: LabResult } | { type: 'error'; message: string };
