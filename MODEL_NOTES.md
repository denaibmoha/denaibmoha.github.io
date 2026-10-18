# Browser AI lab: model decisions and validation

Reviewed 18 October 2026. These are small, reproducible smoke checks on the development device, not a benchmark suite or a guarantee of visitor performance. Published model evaluations and local measurements are kept separate.

## Selection

| Tool | Chosen model | Browser weights | Reason and limits |
| --- | --- | --- | --- |
| Embeddings | Xenova/bge-small-en-v1.5, int8 | 34,014,426 bytes | Original BAAI model reports 62.17 average on the original 56-task MTEB suite, versus 63.55 for BGE Base and 64.23 for Large. Small provides 384D embeddings with a modest download. Those published scores do not independently validate this quantized export. English only. |
| TTS, default | KittenTTS Nano v0.8, fp32 | 56,767,095 bytes + 3,278,902-byte voices | 15M parameters, documented WASM support, smaller and faster in the local smoke test. No directly comparable human-preference evaluation was found in its model card; listen and compare voices. |
| TTS, alternative | Kokoro 82M v1.0, int8 | 92,361,116 bytes + voice | Published human-preference arena snapshots provide a quality signal, but browser latency and int8 quality are separate questions. Available as an explicit alternative after its slower CPU result. |
| STT | onnx-community/whisper-tiny.en, int8 | 10,124,993-byte encoder + 30,718,858-byte merged decoder | 39M parameters. English-specific, compact, and faster size tier than Base/Small in the authors' native tests. A100 timings are not browser timings. Noise, silence, music, and accents remain failure cases. |
| Chat / short writing | onnx-community/SmolLM2-135M-Instruct-ONNX, int8 | 135,658,354 bytes + tokenizer | Original model IFEval 29.9; 360M reaches 41.0 but its int8 weights require 363,115,149 bytes. Prioritizes download budget over instruction reliability. English, 600-character prompt, 32/64 generated tokens, no conversation history. |
| OCR | Tesseract.js 6.0.1 / Tesseract 5 WASM | Runtime + English LSTM data | Dedicated printed-text engine with reproducible browser benchmarks, substantially less download complexity than a generative vision model. English only here. Not a handwriting or PDF demo. |

Supertonic 2 was also reviewed: its model card publishes promising native CPU/WebGPU latency, but those figures are not measurements of this browser, and its multi-model integration was not selected for this release.

## Development browser smoke measurements

Windows embedded Chromium, WASM CPU execution, one inference thread, no cross-origin isolation. These observations came from the actual UI's worker timings. Hardware model was not recorded. Setup times reflect the browser/cache state during each run and must not be treated as cold-download benchmarks.

| Experiment | Input | Inference | Reported total | Observation |
| --- | --- | --- | --- | --- |
| BGE Small | Eight provided English sentences | 0.27 s | 3.52 s | Eight 384D normalized vectors; finite PCA output; diagonal cosine scores approximately 1. |
| Tesseract | Built-in 1200 × 660 printed sample | 0.53 s | 1.55 s | Recognized the text with one AI/Al character confusion after whitespace normalization; engine confidence 92/100 is not calibrated accuracy. |
| Whisper Tiny EN | Built-in 11-second JFK sample | 2.37 s | 2.37 s | All 22 reference words matched after ignoring punctuation and case. One clean sample does not establish general WER. |
| Kokoro Heart | Default text | 14.04 s | 20.13 s | 5.65 s audio; real-time factor 2.49. Too slow to call instantaneous. |
| Kitten Bella | Same default text | 4.40 s | 10.04 s | 10.10 s audio; real-time factor 0.44. Different speaking rates make raw wall-time comparisons imperfect. |

A generated Kitten WAV was also uploaded through the file chooser and transcribed locally; the intended words matched after punctuation/case normalization. Experiment switching, invalid/duplicate sentence rejection, cancellation, and 320/390-pixel layouts were checked. Microphone capture requires a user permission grant and was not exercised in this automated check.

Default TTS test text: “Good AI starts with understanding people. Stay curious, and build something useful.”

## What the vector map means

- BGE uses CLS pooling and L2 normalization, following its model card.
- Cosine similarity is computed using the complete 384D vectors, never the 3D points. It is not a probability.
- PCA is fitted to the current sentence set and retains three components. The retained-variance percentage is displayed. Adding sentences can change the entire projection.
- Particle glow and node colours are decorative. Node centers are the actual projected coordinates.
- The initial example ships real precomputed BGE output. It is labelled as precomputed. Model execution and downloads occur only after an explicit run.
- Visitors can export vectors, coordinates, and similarities to inspect the result.

## Runtime and privacy

The portfolio needs no inference server or API key. Models run in module workers, and OCR uses its dedicated worker. Changing experiment or cancelling terminates the worker; model files can remain in browser caches. Recordings stop automatically after 19 seconds; files are limited to 20 seconds. Image processing is bounded to 10 MB and a 1600-pixel longest edge.

Application code does not upload inputs. Hugging Face receives model and voice download requests; jsDelivr receives English OCR language-data requests. Microphone access happens only after clicking Record. Normal static asset requests still go to the website host. Runtimes are copied locally by `scripts/prepare-assets.mjs`; Node inference binaries are not needed in the browser.

Single-thread WASM is deliberate because standard GitHub Pages does not set COOP/COEP headers. No WebGPU speed claim is made. Browsers without WebGL retain the forms and text results. Safari, Firefox, mobile hardware, microphone permissions, and every file codec are not comprehensively validated; use the explicit errors and fallback paths.

## Primary evidence and model licenses

- [BAAI BGE evaluation and usage](https://huggingface.co/BAAI/bge-small-en-v1.5): MIT.
- [BGE ONNX export](https://huggingface.co/Xenova/bge-small-en-v1.5).
- [Kitten Nano ONNX model card](https://huggingface.co/onnx-community/KittenTTS-Nano-v0.8-ONNX): Apache 2.0. The IPA alphabet and style-selection convention implement the published model interface.
- [KittenML source and model documentation](https://github.com/KittenML/KittenTTS).
- [Kokoro evaluation snapshots](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/EVAL.md) and [JavaScript implementation](https://github.com/hexgrad/kokoro/tree/main/kokoro.js): Apache 2.0.
- [Whisper model card](https://github.com/openai/whisper/blob/main/model-card.md) and [size/speed discussion](https://github.com/openai/whisper#available-models-and-languages): MIT. [ONNX export](https://huggingface.co/onnx-community/whisper-tiny.en).
- [Tesseract.js source and benchmarks](https://github.com/naptha/tesseract.js): Apache 2.0.
- [Supertonic 2 model card](https://huggingface.co/Supertone/supertonic-2): model OpenRAIL-M; sample code MIT.
- [JFK sample asset](https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav): historical US presidential speech used for the reproducible demo.

Model weights remain at their respective upstream hosts. Consult the linked licenses for model-specific terms. Dependency notices accompany the bundled runtime assets.

## Small LLM evaluation and browser validation

SmolLM2 135M is an explicitly loaded writing experiment, not a factual assistant. Its original model reports IFEval 29.9, MMLU 29.3, and GSM8K 1.4; the 360M model reports IFEval 41.0. These evaluations are not independent tests of the quantized export. The download tradeoff is explicit: 135M int8 weights are 135,658,354 bytes, 360M int8 weights are 363,115,149 bytes, and Qwen2.5 0.5B int8 weights are 512,096,557 bytes. The 135M q4 export is actually larger at 180,581,125 bytes; a q4 label alone does not establish a smaller download.

Pinned ONNX revision: `b8a5c0f183b78c55955a5364f610c36668b5e681`. Uses Transformers.js WASM CPU with one thread and the model-native system prompt. A worker streams plain text safely through React, with no HTML execution or file access. Cancelling or switching tools terminates the worker. The orange helix responds to emitted token count and is labelled illustrative; it is not a visualization of internal activations.

Actual browser checks: the 32-token creative run took 2.50 seconds including setup, about 12.8 tokens/s including prefill, with first token after 0.60 seconds of inference. A summarization run produced “A tutor listens to a learner speak, correcting errors and suggesting new words for improvement.” in 1.99 seconds total (18 tokens). One initial setup/run took 9.40 seconds; cache/network state makes this unsuitable as a cold-download benchmark. The warmth rewrite failed its tone instruction, and another rewrite added an unsupported AM. This is a meaningful quality limit, so the UI calls it experimental and defaults to the successful summary example. Thirty-two tokens can truncate responses; an optional 64-token limit provides more room. These are smoke checks, not a general quality or speed benchmark.

Primary sources: [135M original evaluation](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct#evaluation), [360M evaluation](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct#evaluation), [135M ONNX export](https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/tree/main/onnx), [Qwen export sizes](https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/tree/main/onnx). SmolLM2 model license: Apache 2.0. Model weights stay upstream and are fetched only on Generate.
