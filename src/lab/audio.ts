export async function decodeAudio(blob: Blob): Promise<Float32Array> {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    const timeout = setTimeout(() => { reader.abort(); reject(new Error('The audio file could not be read. Try a WAV file or the built-in sample.')); }, 15000);
    reader.onload = () => { clearTimeout(timeout); resolve(reader.result as ArrayBuffer); };
    reader.onerror = () => { clearTimeout(timeout); reject(new Error('Could not read this audio file.')); };
    reader.readAsArrayBuffer(blob);
  });
  // Decode ordinary PCM WAV directly. This also avoids audio-device initialization
  // for the shipped sample and generated speech round-trips.
  const view = new DataView(bytes);
  const signature = (at: number) => String.fromCharCode(...new Uint8Array(bytes, at, 4));
  if (bytes.byteLength >= 44 && signature(0) === 'RIFF' && signature(8) === 'WAVE') {
    let channels = 0, rate = 0, bits = 0, format = 0, offset = 0, length = 0;
    for (let at = 12; at + 8 <= bytes.byteLength;) {
      const name = signature(at), size = view.getUint32(at + 4, true), start = at + 8;
      if (start + size > bytes.byteLength) break;
      if (name === 'fmt ' && size >= 16) { format = view.getUint16(start, true); channels = view.getUint16(start + 2, true); rate = view.getUint32(start + 4, true); bits = view.getUint16(start + 14, true); }
      if (name === 'data') { offset = start; length = size; }
      at = start + size + (size % 2);
    }
    if (format === 1 && bits === 16 && channels > 0 && channels <= 8 && rate > 0 && length > 0) {
      const frames = Math.floor(length / (channels * 2)), duration = frames / rate;
      if (duration > 20 || duration < .1) throw new Error('Choose a speech clip between 0.1 and 20 seconds.');
      const mono = new Float32Array(frames);
      for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) mono[i] += view.getInt16(offset + (i * channels + c) * 2, true) / 32768 / channels;
      const output = new Float32Array(Math.round(duration * 16000));
      for (let i = 0; i < output.length; i++) { const pos = i * rate / 16000, left = Math.floor(pos), fraction = pos - left; output[i] = mono[Math.min(left, frames - 1)] * (1 - fraction) + mono[Math.min(left + 1, frames - 1)] * fraction; }
      return output;
    }
  }
  const context = new AudioContext();
  try {
    const original = await context.decodeAudioData(bytes);
    if (original.duration > 20 || original.duration < 0.1) throw new Error('Choose a speech clip between 0.1 and 20 seconds.');
    const offline = new OfflineAudioContext(1, Math.ceil(original.duration * 16000), 16000);
    const source = offline.createBufferSource(); source.buffer = original; source.connect(offline.destination); source.start();
    const resampled = await offline.startRendering();
    return new Float32Array(resampled.getChannelData(0));
  } finally { void context.close().catch(() => {}); }
}

export function wavBlob(audio: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + audio.length * 2), view = new DataView(buffer);
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + audio.length * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, audio.length * 2, true);
  audio.forEach((sample, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true));
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function prepareImage(blob: Blob): Promise<Blob> {
  if (blob.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
  const image = await createImageBitmap(blob);
  try {
    if (image.width * image.height > 32_000_000) throw new Error('Image dimensions are too large. Use a smaller image.');
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not prepare image.')), 'image/png'));
  } finally { image.close(); }
}
