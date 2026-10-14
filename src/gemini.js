// Google Gemini API client for Forge3D.
// Three selectable "roles", each can use a different Gemini model:
//   understand — reads the prompt and works out the real subject / style / features
//   vision     — looks at the reference image (only runs when an image is attached)
//   build      — writes the final part-by-part design blueprint that the modeler turns into geometry
// The browser calls the Gemini REST API directly with the user's own key (nothing goes through a Forge3D server).
import { BLUEPRINT_SYSTEM, buildBlueprintUserPrompt } from './prompts.js';

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const GEMINI_ROLES = [
  { id: 'understand', label: 'Prompt understanding', hint: 'Reads your prompt and picks the main subject, style and features.' },
  { id: 'vision', label: 'Image understanding', hint: 'Looks at your reference image. Needs a model that accepts images.' },
  { id: 'build', label: 'Building (part plan)', hint: 'Writes the part-by-part shape plan the modeler turns into geometry.' }
];

// Starting list. "Load my models" replaces this with the exact list your API key can use.
export const GEMINI_PRESETS = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite — fastest, cheapest' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite — low cost' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash — balanced' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash — most capable Flash' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (preview)' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview) — best quality' },
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon — flagship reasoning' }
];

export const DEFAULT_GEMINI_MODELS = { understand: 'gemini-3.5-flash-lite', vision: 'gemini-3.8-flash', build: 'gemini-3.8-flash' };

// Models that can't do text/JSON generation for this app (speech, live audio, image/video generation, embeddings …).
const NOT_FOR_DESIGN = /(^|[-_])(tts|live|transcribe|embedding|embed|image|imagen|veo|lyria|audio|robotics|omni|nano-banana|computer-use|antigravity|deep-research)([-_]|$)/i;

export class GeminiError extends Error {
  constructor(message, { status = 0, fatal = false } = {}) { super(message); this.name = 'GeminiError'; this.status = status; this.fatal = fatal; }
}

export function normalizeModelId(value) {
  const id = String(value || '').trim().replace(/^models\//i, '');
  return /^[a-z0-9][a-z0-9._-]{1,80}$/i.test(id) ? id : '';
}

export function looksLikeApiKey(value) { return /^[A-Za-z0-9_-]{20,}$/.test(String(value || '').trim()); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function timeoutSignal(ms) { return typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined; }

async function readError(response) {
  let message = '';
  try { const body = await response.json(); message = body?.error?.message || ''; } catch { /* body wasn't JSON */ }
  const status = response.status;
  if ((status === 400 && /api key/i.test(message)) || status === 401) return new GeminiError('Gemini rejected the API key. Check that you pasted the whole key from Google AI Studio.', { status, fatal: true });
  if (status === 403) return new GeminiError(`Gemini refused the request (403). The key may not be allowed to use this model or API. ${message}`.trim().slice(0, 240), { status, fatal: true });
  if (status === 404) return new GeminiError(`Gemini could not find that model for your key (404). Pick another model or click “Load my models”. ${message}`.trim().slice(0, 240), { status });
  if (status === 429) return new GeminiError('Gemini quota or rate limit reached (429). Wait a minute, pick a lighter model, or check your plan in Google AI Studio.', { status });
  if (status === 400) return new GeminiError(`Gemini rejected the request (400): ${message || 'bad request'}`.slice(0, 260), { status });
  return new GeminiError(`Gemini is unavailable right now (${status}). ${message}`.trim().slice(0, 240), { status });
}

// Lists the models this API key can call, keeping only the ones that can write text/JSON.
export async function listGeminiModels({ apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new GeminiError('Enter your Gemini API key first.', { fatal: true });
  const found = [];
  let pageToken = '';
  for (let page = 0; page < 6; page++) {
    const url = `${GEMINI_BASE}/models?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const response = await fetchImpl(url, { headers: { 'x-goog-api-key': apiKey }, signal: timeoutSignal(20000) });
    if (!response.ok) throw await readError(response);
    const data = await response.json();
    for (const m of data.models || []) {
      const id = normalizeModelId(m.name);
      if (!id || !/^gemini/i.test(id) || NOT_FOR_DESIGN.test(id)) continue;
      if (Array.isArray(m.supportedGenerationMethods) && !m.supportedGenerationMethods.includes('generateContent')) continue;
      found.push({ id, label: m.displayName ? `${m.displayName} (${id})` : id, inputTokenLimit: m.inputTokenLimit || 0 });
    }
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }
  const unique = [...new Map(found.map(m => [m.id, m])).values()];
  // Newest-looking first: stable names before previews, then by name descending.
  unique.sort((a, b) => (/preview|exp/i.test(a.id) - /preview|exp/i.test(b.id)) || b.id.localeCompare(a.id, 'en', { numeric: true }));
  return unique;
}

export function parseJsonLoose(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(text); } catch { /* try to cut the JSON object out of surrounding prose */ }
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* fall through */ } }
  throw new GeminiError('Gemini did not return valid JSON. Try a stronger model for this step.');
}

function splitDataUrl(dataUrl) {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  return m ? { mimeType: m[1], data: m[2] } : null;
}

// One generateContent call. Returns the model's text.
export async function geminiGenerate({ apiKey, model, system, text, imageDataUrl = null, json = true, temperature = 0.35, maxOutputTokens = 8192, timeoutMs = 90000, fetchImpl = fetch, retryDelayMs = 1500 }) {
  const id = normalizeModelId(model);
  if (!apiKey) throw new GeminiError('Enter your Gemini API key first.', { fatal: true });
  if (!id) throw new GeminiError(`“${model}” is not a valid Gemini model ID.`, { fatal: true });
  const parts = [{ text }];
  const image = imageDataUrl ? splitDataUrl(imageDataUrl) : null;
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature, maxOutputTokens, ...(json ? { responseMimeType: 'application/json' } : {}) }
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(id)}:generateContent`;
  let response;
  for (let attempt = 0; attempt < 2; attempt++) {
    response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body), signal: timeoutSignal(timeoutMs) });
    if (response.ok || ![500, 503].includes(response.status) || attempt === 1) break;
    await sleep(retryDelayMs); // one gentle retry for a busy model
  }
  if (!response.ok) throw await readError(response);
  const data = await response.json();
  const block = data.promptFeedback?.blockReason;
  if (block) throw new GeminiError(`Gemini blocked this prompt (${block}). Reword the description and try again.`);
  const candidate = data.candidates?.[0];
  const output = (candidate?.content?.parts || []).filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join('');
  if (!output.trim()) throw new GeminiError(candidate?.finishReason === 'MAX_TOKENS' ? 'Gemini ran out of output space before answering. Try a different model.' : 'Gemini returned an empty answer.');
  return output;
}

const VISION_SYSTEM = `You are a 3D technical artist studying a reference image for a low-poly game asset. Describe only what is visible; never invent hidden sides. Return ONLY compact JSON with keys: subject (short noun), silhouette (one sentence), visibleParts (3-10 short strings), proportions (one sentence), dominantColors (2-4 color names), materials (array of short strings), notes (one sentence about anything ambiguous).`;
const UNDERSTAND_SYSTEM = `You are a senior art director reading a request for a low-poly game asset. Work out what the user really wants. The MAIN requested object is the subject; nouns that are carried, worn, printed or mentioned as decoration are accessories, not the subject. Examples: 'human holding a flag' = human; 'flag with a human emblem' = flag. Return ONLY compact JSON with keys: subject (short noun for the main object), objectType (character, creature, weapon or prop), accessories (array), silhouette (one sentence), primaryForms (3-6 strings), secondaryDetails (3-8 strings), accentDetails (2-5 strings), palette (2-4 color names), designHints (short description), proportions (headScale, bodyWidth, limbLength, tailLength numbers 0.7-1.4).`;

function clip(value, n = 1800) { return String(value ?? '').slice(0, n); }

// Runs the selected models in order and returns a blueprint in the same shape the Ollama path returns,
// so the existing modeler, validation and triangle-budget code needs no changes.
export async function askGeminiBlueprint({ apiKey, models = DEFAULT_GEMINI_MODELS, prompt, imageDataUrl = null, fetchImpl = fetch, onProgress = () => {}, retryDelayMs } = {}) {
  const m = { ...DEFAULT_GEMINI_MODELS, ...models };
  const call = (model, extra) => geminiGenerate({ apiKey, model, fetchImpl, retryDelayMs, ...extra });
  const warnings = [], used = {};
  let imageNotes = null, understanding = null;

  if (imageDataUrl) {
    onProgress('vision', m.vision);
    try {
      const raw = await call(m.vision, { system: VISION_SYSTEM, text: 'Study this reference image and describe the asset it shows.', imageDataUrl, maxOutputTokens: 4096 });
      imageNotes = parseJsonLoose(raw); used.vision = m.vision;
    } catch (err) {
      if (err.fatal) throw err;
      warnings.push(`Image understanding (${m.vision}) failed: ${err.message}`);
    }
  }

  // When the same model does both jobs, skip the separate pass and save a request.
  if (m.understand !== m.build) {
    onProgress('understand', m.understand);
    try {
      const text = `User request: ${prompt}${imageNotes ? `\n\nReference image analysis (from the vision model): ${clip(JSON.stringify(imageNotes))}` : ''}`;
      understanding = parseJsonLoose(await call(m.understand, { system: UNDERSTAND_SYSTEM, text, maxOutputTokens: 4096 })); used.understand = m.understand;
    } catch (err) {
      if (err.fatal) throw err;
      warnings.push(`Prompt understanding (${m.understand}) failed: ${err.message}`);
    }
  }

  onProgress('build', m.build);
  let built = null;
  try {
    const extra = [
      understanding ? `\n\nPROMPT ANALYSIS (already worked out; keep the subject consistent with it): ${clip(JSON.stringify(understanding))}` : '',
      imageNotes ? `\n\nREFERENCE IMAGE ANALYSIS: ${clip(JSON.stringify(imageNotes))}` : ''
    ].join('');
    built = parseJsonLoose(await call(m.build, { system: BLUEPRINT_SYSTEM, text: `${buildBlueprintUserPrompt(prompt)}${extra}`, maxOutputTokens: 16384, imageDataUrl: imageDataUrl && !imageNotes ? imageDataUrl : null }));
    used.build = m.build;
  } catch (err) {
    if (err.fatal || !understanding) throw err;
    warnings.push(`Building (${m.build}) failed: ${err.message}. Using the prompt analysis with the built-in modeling rules.`);
  }

  const blueprint = { ...(understanding || {}), ...(built || {}) };
  if (!blueprint || typeof blueprint !== 'object' || !Object.keys(blueprint).length) throw new GeminiError('Gemini returned an empty design blueprint.');
  blueprint.aiMeta = { provider: 'gemini', models: used, warnings };
  return blueprint;
}
