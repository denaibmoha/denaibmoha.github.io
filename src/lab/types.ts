export type LabMode = 'embed' | 'tts' | 'stt' | 'ocr' | 'llm';
export type EmbeddingResult = { texts: string[]; vectors: number[][]; points: number[][]; variance: number; similarities: number[][] };
export type LabResult = { mode: LabMode; inferenceMs: number; totalMs: number; text?: string; confidence?: number; audio?: Float32Array; sampleRate?: number; embedding?: EmbeddingResult; tokens?: number; firstTokenMs?: number; reachedLimit?: boolean };
export type LabRequest = { mode: LabMode; base: string; text?: string; texts?: string[]; audio?: Float32Array; image?: Blob; ttsEngine?: 'kitten' | 'kokoro'; voice?: 'af_heart' | 'bm_george'; maxTokens?: 32 | 64 };
export type LabMessage = { type: 'progress'; message: string; percent?: number } | { type: 'token'; text: string; tokens: number } | { type: 'result'; result: LabResult } | { type: 'error'; message: string };
