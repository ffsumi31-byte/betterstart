import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(path.join(root, p), 'utf8');

test('static app includes import map for Three.js and no API credentials', async () => {
  const html = await read('index.html');
  assert.match(html, /type="importmap"/);
  assert.match(html, /three\.module\.js/);
  assert.match(html, /\/vendor\/three\/build\/three\.module\.js/);
  assert.match(html, /src="\/src\/main\.js"/);
  assert.doesNotMatch(html, /sk-[A-Za-z0-9]{10,}/);
});
test('modeler has character, creature, weapon, and prop shape paths', async () => {
  const source = await read('src/modeler.js');
  for (const token of ['detectPrimarySubject', 'makeHuman', 'makeHumanoid', 'makeDragon', 'makeHorse', 'makeMarine', 'makeOctopus', 'makeDinosaur', 'makeFeline', 'makeBird', 'makeSpacecraft', 'makeAircraft', 'makeBuilding', 'makeFurniture', 'makeLantern', 'makeMushroom', 'makeComputer', 'makeWeapon', 'makeProp', 'makeBlueprintComposition', 'hasDedicatedGeometry', 'enforceBudget', 'auditModel', 'getMeshStats', 'silhouette-first', 'hard planar faces']) assert.ok(source.includes(token), `Missing ${token}`);
  assert.match(source, /clamp\(Number\(triangleBudget\) \|\| 500, 100, 500\)/);
});
test('hosting config supports Render Web Service without Root Directory settings', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const vercel = JSON.parse(await read('vercel.json'));
  const render = await read('render.yaml');
  assert.equal(pkg.scripts.build, 'node build.mjs');
  assert.equal(pkg.scripts.start, 'node build.mjs && node server.mjs');
  assert.ok(pkg.dependencies.three, 'Three.js must be installed for building and tests');
  assert.equal(vercel.installCommand, 'npm install');
  assert.equal(vercel.outputDirectory, 'dist');
  assert.match(render, /runtime: node/);
  assert.match(render, /buildCommand: npm install/);
  assert.match(render, /startCommand: npm start/);
});
test('exports and feedback memory are wired into the UI', async () => {
  const main = await read('src/main.js');
  const html = await read('index.html');
  for (const token of ['GLTFExporter', 'exportOBJ', 'exportLua', 'forge3d-library', 'forge3d-preferences', 'imageColorFromUrl', 'researchReferences', 'createCartoonSvg', 'askLocalOllama', 'geometryBlueprint', '8-pass']) assert.ok(main.includes(token), `Missing ${token}`);
  assert.match(html, /Final quality check/);
  assert.match(html, /Connect a local AI brain/);
  assert.match(main, /const chosenType = classifyPrompt\(prompt, state\.type\)/, 'every generation pass must use the detected main noun instead of blindly following the category dropdown');
});
test('Gemini integration is wired in without any hard-coded key', async () => {
  const main = await read('src/main.js');
  const html = await read('index.html');
  const gemini = await read('src/gemini.js');
  for (const token of ['askGeminiBlueprint', 'listGeminiModels', 'setProvider', 'prepareImageForGemini', 'forge3d-gemini']) assert.ok(main.includes(token), `Missing ${token}`);
  for (const id of ['ai-provider', 'gm-understand', 'gm-vision', 'gm-build', 'gemini-key', 'gemini-load-models']) assert.ok(html.includes(`id="${id}"`), `Missing #${id}`);
  assert.match(gemini, /x-goog-api-key/);
  assert.doesNotMatch(gemini + main + html, /AIza[0-9A-Za-z_-]{30,}/);
  assert.doesNotMatch(gemini, /[?&]key=/);
});
