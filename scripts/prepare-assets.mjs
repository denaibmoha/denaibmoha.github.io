import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
for (const dir of ['ort', 'ocr']) await mkdir(resolve(root, 'public', dir), { recursive: true });
const ort = resolve(root, 'node_modules/onnxruntime-web/dist');
for (const name of await readdir(ort)) {
  if (/^ort-wasm.*\.(mjs|wasm)$/.test(name)) await copyFile(resolve(ort, name), resolve(root, 'public/ort', name));
}
const core = resolve(root, 'node_modules/tesseract.js-core');
for (const name of await readdir(core)) {
  if (/\.wasm(\.js)?$/.test(name)) await copyFile(resolve(core, name), resolve(root, 'public/ocr', name));
}
await copyFile(resolve(root, 'node_modules/tesseract.js/dist/worker.min.js'), resolve(root, 'public/ocr/worker.min.js'));
console.log('Prepared self-hosted inference runtimes.');

const notices = resolve(root, 'public/inference-licenses');
await mkdir(notices, { recursive: true });
for (const pkg of ['onnxruntime-web', 'tesseract.js', 'tesseract.js-core', 'kokoro-js', 'phonemizer', '@huggingface/transformers']) {
  const dir = resolve(root, 'node_modules', pkg);
  const names = await readdir(dir);
  const license = names.find(name => /^LICENSE(\..*)?$/i.test(name));
  if (license) await copyFile(resolve(dir, license), resolve(notices, pkg.replaceAll('/', '-') + '.txt'));
}
