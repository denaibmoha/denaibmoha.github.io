import { StyleTextToSpeech2Model, Tensor } from '@huggingface/transformers';
import { phonemize } from 'phonemizer';
import { unzipSync } from 'fflate';

// Kitten's published IPA vocabulary and boundary IDs are part of its model interface.
const symbols = [...'$;:,.!?¡¿—…"«»"" ', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', ..."ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ"];
const vocabulary = new Map(symbols.map((symbol, i) => [symbol, i]));
let model: StyleTextToSpeech2Model | undefined;
let voices: Record<string, Uint8Array> | undefined;

async function cachedBytes(url: string): Promise<Uint8Array> {
  let cache: Cache | undefined;
  try { cache = await caches.open('portfolio-model-assets'); const hit = await cache.match(url); if (hit) return new Uint8Array(await hit.arrayBuffer()); } catch { /* Cache storage is optional. */ }
  const response = await fetch(url); if (!response.ok) throw new Error(`Voice download failed (${response.status}).`);
  if (cache) { try { await cache.put(url, response.clone()); } catch { /* Quota errors do not block inference. */ } }
  return new Uint8Array(await response.arrayBuffer());
}

function styleVector(bytes: Uint8Array, length: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] !== 0x93 || new TextDecoder().decode(bytes.slice(1, 6)) !== 'NUMPY') throw new Error('Invalid voice data.');
  const offset = bytes[6] === 1 ? 10 : 12;
  const headerLength = offset === 10 ? view.getUint16(8, true) : view.getUint32(8, true);
  const header = new TextDecoder().decode(bytes.slice(offset, offset + headerLength));
  if (!header.includes("'<f4'")) throw new Error('Unsupported voice data type.');
  const shape = header.match(/'shape'\s*:\s*\(([^)]+)\)/)?.[1].split(',').map(Number).filter(Number.isFinite);
  if (!shape || shape.length < 2) throw new Error('Invalid voice shape.');
  const row = Math.min(length, shape[0] - 1), width = shape[1], start = offset + headerLength + row * width * 4;
  return new Float32Array(bytes.slice(start, start + width * 4).buffer);
}

export async function generateKitten(text: string, voice: 'af_heart' | 'bm_george', progress: (event: { status: string; file?: string; progress?: number }) => void, status: (text: string) => void) {
  const id = 'onnx-community/KittenTTS-Nano-v0.8-ONNX';
  if (!model) model = await StyleTextToSpeech2Model.from_pretrained(id, { dtype: 'fp32', device: 'wasm', progress_callback: progress });
  if (!voices) voices = unzipSync(await cachedBytes(`https://huggingface.co/${id}/resolve/main/voices.npz`));
  status('Generating speech with the 15M-parameter model…');
  const start = performance.now();
  const sections = text.trim().match(/[^;:,.!?]+|[;:,.!?]+/g) ?? [text];
  const parts: string[] = [];
  for (const section of sections) parts.push(/^[;:,.!?]+$/.test(section) ? section : (await phonemize(section, 'en-us')).join(' '));
  const phonemes = (parts.join('').match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]/gu) ?? []).join(' ');
  const ids = [0, ...[...phonemes].flatMap(char => vocabulary.has(char) ? [vocabulary.get(char)!] : []), 10, 0];
  const style = styleVector(voices[voice === 'af_heart' ? 'expr-voice-2-f.npy' : 'expr-voice-2-m.npy'], text.trim().length);
  const output = await model({ input_ids: new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]), style: new Tensor('float32', style, [1, style.length]), speed: new Tensor('float32', [0.8], [1]) });
  const audio = new Float32Array(output.waveform.data as Float32Array);
  if (!audio.length || !audio.every(Number.isFinite)) throw new Error('The speech model produced invalid audio on this device. Try Kokoro instead.');
  return { audio, sampleRate: 24000, inferenceMs: performance.now() - start };
}
