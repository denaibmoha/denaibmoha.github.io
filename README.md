# Mahmoud Denaib — Signal / Noise

A Vite + React + TypeScript portfolio for `denaibmoha.github.io`.

The central interaction is a custom Three.js particle sculpture that morphs between language, memory, and voice. The page pairs the experiment with readable, CV-grounded work and experience.

## Develop and build

Requires Node.js 22.12+ (or a supported newer release) and npm.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

`npm run build` checks TypeScript and creates **dist/**. Deploy that folder to any static host. Use an HTTP server to preview it; opening index.html as a file will not load ES modules correctly.

## GitHub Pages

1. Create or use the repository `denaibmoha/denaibmoha.github.io`.
2. Push this project to its `main` branch, excluding node_modules and dist (already gitignored).
3. In Settings → Pages, choose **GitHub Actions** as the source.
4. The included workflow builds and uploads **dist/**, then deploys it.

Expected address after successful deployment: `https://denaibmoha.github.io/`.
Deployment is handled by the included GitHub Actions workflow.

## Where to edit

- `src/content.ts`: identity, contact links, project details, timeline, sculpture labels.
- `src/App.tsx`: page sections, case-study disclosure, controls, fallback boundary.
- `src/components/ParticleScene.tsx`: seeded geometry, shader, morphing, OrbitControls.
- `src/style.css`: design tokens, layouts, typography, breakpoints.
- `src/lab/`: model metadata, inference worker, audio/image input handling, PCA visualization, and lab UI.
- `MODEL_NOTES.md`: source evaluations, measured browser timings, limits, and model choices.
- `scripts/prepare-assets.mjs`: copies ONNX and OCR runtimes for self-hosting during prebuild/predev.
- `public/`: portrait, CV, fonts, samples, and generated runtimes copied into dist.

Add projects by extending the content model and rendering reusable project components. Keep confidential projects and illustrative interfaces labelled accurately.

## Libraries

Vite, React, TypeScript, Three.js, React Three Fiber, Drei, Lucide React, Transformers.js, Kokoro.js, phonemizer, Tesseract.js, ml-pca, and fflate. Versions are pinned in package.json and package-lock.json. Styling uses CSS custom properties and component classes; a heavy UI kit is unnecessary for this presentation-led layout and can be added later for richer application controls.

## Accessibility and performance

- Semantic sections, skip link, visible focus, button state announcements.
- Native anchor navigation and a real mailto contact link.
- Reduced-motion preference pauses the initial scene; an explicit control toggles animation.
- Lower particle count on smaller viewports, capped pixel ratio, no shadows or postprocessing.
- Three.js is lazy-loaded separately from the main page. Its production chunk is about 247 KB gzip; Vite emits a size advisory for this chunk.
- Fonts and inference runtimes are self-hosted; models and OCR language data download on explicit use from their upstream hosts. No analytics, external font calls, or runtime API key.
- WebGL failure falls back without removing the portfolio content.

## Content provenance

Professional copy is based on the supplied Mahmoud Denaib CV. The language-learning application is described as ongoing exploration. The sample French conversation is illustrative copy, not a quote or an actual product screenshot. No invented repositories, shipped-product claims, testimonials, or numerical results are included. The supplied CV is included as a downloadable PDF, with its original contents. The portrait uses the supplied photo with CSS monochrome styling; the original image is unchanged.

Fonts: Manrope and Instrument Serif, licensed under the SIL Open Font License. License files are included in public/fonts.


## Interactive AI lab

The lab includes BGE embeddings with a real PCA/cosine explorer; Kitten Nano and Kokoro TTS; Whisper Tiny English transcription; and local Tesseract OCR. Precomputed example vectors are labelled explicitly. All inference is browser-local. See MODEL_NOTES.md for the evidence, measured results, privacy boundaries, limitations, and licenses.

Use npm ci --ignore-scripts for a browser-only dependency installation if native Node inference postinstall downloads are unnecessary. Generated public/ort and public/ocr files are gitignored and recreated before builds.
