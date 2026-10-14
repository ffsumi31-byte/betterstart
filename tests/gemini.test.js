import test from 'node:test';
import assert from 'node:assert/strict';
import { askGeminiBlueprint, listGeminiModels, geminiGenerate, normalizeModelId, parseJsonLoose, looksLikeApiKey, GeminiError, GEMINI_PRESETS, DEFAULT_GEMINI_MODELS } from '../src/gemini.js';
import { BLUEPRINT_SYSTEM } from '../src/prompts.js';

const KEY = 'AIzaFAKEKEYFORTESTSONLY_1234567890';
const ok = (obj) => ({ ok: true, status: 200, json: async () => obj });
const fail = (status, message) => ({ ok: false, status, json: async () => ({ error: { message } }) });
const reply = (text) => ok({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });
const bp = { subject: 'lantern', objectType: 'prop', silhouette: 'x', parts: [{ name: 'base', shape: 'box', position: [0, 0.2, 0], size: [1, 0.3, 1], rotation: [0, 0, 0], role: 'base', priority: 'primary', symmetry: 'single' }] };

function recorder(handler) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => { const body = init.body ? JSON.parse(init.body) : null; calls.push({ url, init, body }); return handler(url, body, calls.length); };
  return { calls, fetchImpl };
}

test('model IDs are normalized and validated', () => {
  assert.equal(normalizeModelId('models/gemini-3.8-flash'), 'gemini-3.8-flash');
  assert.equal(normalizeModelId('  gemini-3.5-flash-lite '), 'gemini-3.5-flash-lite');
  assert.equal(normalizeModelId('../../etc/passwd'), '');
  assert.equal(normalizeModelId('gemini 3 flash'), '');
  for (const preset of GEMINI_PRESETS) assert.equal(normalizeModelId(preset.id), preset.id);
  for (const id of Object.values(DEFAULT_GEMINI_MODELS)) assert.ok(GEMINI_PRESETS.some(p => p.id === id), `${id} should be a preset`);
  assert.ok(looksLikeApiKey(KEY));
  assert.ok(!looksLikeApiKey('short'));
});

test('parseJsonLoose accepts fenced or chatty JSON and rejects garbage', () => {
  assert.deepEqual(parseJsonLoose('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('Here you go: {"a":{"b":2}} enjoy'), { a: { b: 2 } });
  assert.throws(() => parseJsonLoose('no json here'), GeminiError);
});

test('geminiGenerate sends key in a header (not the URL), the chosen model, system prompt, JSON mode and image', async () => {
  const { calls, fetchImpl } = recorder(() => reply('{"ok":true}'));
  const text = await geminiGenerate({ apiKey: KEY, model: 'models/gemini-3.8-flash', system: 'SYS', text: 'hello', imageDataUrl: 'data:image/jpeg;base64,QUJD', fetchImpl });
  assert.equal(text, '{"ok":true}');
  const [c] = calls;
  assert.match(c.url, /\/models\/gemini-3\.8-flash:generateContent$/);
  assert.ok(!c.url.includes(KEY), 'key must not be in the URL');
  assert.equal(c.init.headers['x-goog-api-key'], KEY);
  assert.equal(c.body.systemInstruction.parts[0].text, 'SYS');
  assert.equal(c.body.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(c.body.contents[0].parts[1], { inlineData: { mimeType: 'image/jpeg', data: 'QUJD' } });
});

test('geminiGenerate ignores thought parts and explains common API errors', async () => {
  const thought = ok({ candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text: '{"a":1}' }] } }] });
  assert.equal(await geminiGenerate({ apiKey: KEY, model: 'gemini-3.8-flash', text: 'x', fetchImpl: async () => thought }), '{"a":1}');
  const cases = [[400, 'API key not valid. Please pass a valid API key.', /rejected the API key/, true], [403, 'denied', /403/, true], [404, 'not found', /could not find that model/, false], [429, 'quota', /quota or rate limit/, false]];
  for (const [status, msg, re, fatal] of cases) {
    await assert.rejects(geminiGenerate({ apiKey: KEY, model: 'gemini-3.8-flash', text: 'x', fetchImpl: async () => fail(status, msg) }), err => { assert.match(err.message, re); assert.equal(err.fatal, fatal); return true; });
  }
  await assert.rejects(geminiGenerate({ apiKey: '', model: 'gemini-3.8-flash', text: 'x', fetchImpl: async () => reply('{}') }), /API key/);
  await assert.rejects(geminiGenerate({ apiKey: KEY, model: 'bad model!', text: 'x', fetchImpl: async () => reply('{}') }), /not a valid Gemini model/);
  const blocked = ok({ promptFeedback: { blockReason: 'SAFETY' } });
  await assert.rejects(geminiGenerate({ apiKey: KEY, model: 'gemini-3.8-flash', text: 'x', fetchImpl: async () => blocked }), /blocked/);
});

test('geminiGenerate retries a busy model once, then succeeds', async () => {
  const { calls, fetchImpl } = recorder((u, b, n) => n === 1 ? fail(503, 'overloaded') : reply('{"ok":1}'));
  assert.equal(await geminiGenerate({ apiKey: KEY, model: 'gemini-3.8-flash', text: 'x', fetchImpl, retryDelayMs: 1 }), '{"ok":1}');
  assert.equal(calls.length, 2);
});

test('listGeminiModels keeps text-capable Gemini models only and follows pagination', async () => {
  const pages = [
    { models: [
      { name: 'models/gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.8-flash-tts', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.8-live', supportedGenerationMethods: ['bidiGenerateContent'] },
      { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-3.1-flash-image', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/veo-3.1-generate-preview', supportedGenerationMethods: ['predictLongRunning'] }
    ], nextPageToken: 'p2' },
    { models: [{ name: 'models/gemini-3.1-pro-preview', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }] }
  ];
  const { calls, fetchImpl } = recorder((url) => ok(url.includes('pageToken=p2') ? pages[1] : pages[0]));
  const list = await listGeminiModels({ apiKey: KEY, fetchImpl });
  assert.deepEqual(list.map(m => m.id), ['gemini-3.8-flash', 'gemini-3.1-pro-preview']); // stable before preview, no duplicates
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers['x-goog-api-key'], KEY);
});

test('askGeminiBlueprint runs the three selected models in order for prompt + image + build', async () => {
  const { calls, fetchImpl } = recorder((url) => {
    if (url.includes('model-vision')) return reply('{"subject":"lantern","dominantColors":["cyan"]}');
    if (url.includes('model-prompt')) return reply('{"subject":"lantern","objectType":"prop","primaryForms":["frame"]}');
    return reply(JSON.stringify(bp));
  });
  const seen = [];
  const out = await askGeminiBlueprint({ apiKey: KEY, models: { understand: 'model-prompt', vision: 'model-vision', build: 'model-build' }, prompt: 'a cyan lantern', imageDataUrl: 'data:image/jpeg;base64,QUJD', fetchImpl, onProgress: (s, m) => seen.push([s, m]) });
  assert.deepEqual(seen, [['vision', 'model-vision'], ['understand', 'model-prompt'], ['build', 'model-build']]);
  assert.deepEqual(calls.map(c => c.url.match(/models\/([^:]+):/)[1]), ['model-vision', 'model-prompt', 'model-build']);
  assert.ok(calls[0].body.contents[0].parts.some(p => p.inlineData), 'vision call carries the image');
  assert.ok(!calls[2].body.contents[0].parts.some(p => p.inlineData), 'build call uses the vision notes, not a second image upload');
  assert.match(calls[2].body.contents[0].parts[0].text, /PROMPT ANALYSIS/);
  assert.match(calls[2].body.contents[0].parts[0].text, /REFERENCE IMAGE ANALYSIS/);
  assert.equal(calls[2].body.systemInstruction.parts[0].text, BLUEPRINT_SYSTEM);
  assert.equal(out.subject, 'lantern');
  assert.equal(out.parts.length, 1);
  assert.deepEqual(out.aiMeta.models, { vision: 'model-vision', understand: 'model-prompt', build: 'model-build' });
});

test('askGeminiBlueprint skips the image model with no image and merges steps when one model does both jobs', async () => {
  const { calls, fetchImpl } = recorder(() => reply(JSON.stringify(bp)));
  const out = await askGeminiBlueprint({ apiKey: KEY, models: { understand: 'same', vision: 'model-vision', build: 'same' }, prompt: 'a lantern', fetchImpl });
  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(out.aiMeta.models), ['build']);
});

test('askGeminiBlueprint degrades gracefully: image failure continues, build failure keeps the prompt analysis, bad key stops', async () => {
  // vision fails (non-fatal) -> still builds, warning recorded, image passed to the builder instead
  let r = recorder((url) => url.includes('model-vision') ? fail(500, 'boom') : reply(JSON.stringify(bp)));
  let out = await askGeminiBlueprint({ apiKey: KEY, models: { understand: 'same', vision: 'model-vision', build: 'same' }, prompt: 'x', imageDataUrl: 'data:image/png;base64,QUJD', fetchImpl: r.fetchImpl, retryDelayMs: 1 });
  assert.match(out.aiMeta.warnings[0], /Image understanding/);
  assert.ok(r.calls.at(-1).body.contents[0].parts.some(p => p.inlineData));
  // build fails but prompt analysis worked -> blueprint without parts + warning
  r = recorder((url) => url.includes('model-build') ? fail(404, 'nope') : reply('{"subject":"lantern","objectType":"prop"}'));
  out = await askGeminiBlueprint({ apiKey: KEY, models: { understand: 'model-prompt', vision: 'model-v', build: 'model-build' }, prompt: 'x', fetchImpl: r.fetchImpl });
  assert.equal(out.subject, 'lantern'); assert.ok(!out.parts); assert.match(out.aiMeta.warnings[0], /Building/);
  // invalid key is fatal immediately
  r = recorder(() => fail(400, 'API key not valid'));
  await assert.rejects(askGeminiBlueprint({ apiKey: KEY, models: { understand: 'model-a', vision: 'model-b', build: 'model-c' }, prompt: 'x', fetchImpl: r.fetchImpl }), /rejected the API key/);
  assert.equal(r.calls.length, 1);
});
