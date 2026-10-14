import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePrompt, findObjectSubject, createCartoonSvg, createBlueprintConceptSvg, researchReferences, askLocalOllama } from '../src/brain.js';

test('prompt analysis finds many subjects instead of falling back to a robot', () => {
  const cases = [
    ['a silver spaceship with cyan lights', 'spaceship'],
    ['a small stegosaurus with armor plates', 'dinosaur'],
    ['a royal castle with four towers', 'castle'],
    ['an enchanted mushroom with glowing spots', 'mushroom'],
    ['a gaming laptop with green screen', 'computer'],
    ['a small dog with a red collar', 'dog'],
    ['build a human holding a flag', 'human'],
    ['a dragon carrying a sword', 'dragon'],
    ['a flag with a human symbol', 'flag'],
    ['a realistic woman with blonde hair', 'human'],
    ['a wizard holding a staff', 'human']
  ];
  for (const [prompt, expected] of cases) assert.equal(findObjectSubject(prompt), expected, prompt);
  const brief = analyzePrompt('A giant purple dragon with cyan eyes and wide wings');
  assert.equal(brief.category, 'creature');
  assert.equal(brief.sizeProfile, 'oversized');
  assert.ok(brief.features.includes('wings'));
  assert.ok(brief.designPrinciples.length >= 6);
});


test('main-subject parsing does not mistake accessory nouns for the object', () => {
  assert.equal(findObjectSubject('build a human holding a flag'), 'human');
  assert.equal(analyzePrompt('a dragon carrying a sword').category, 'creature');
  assert.equal(analyzePrompt('a human with a flag').category, 'character');
  assert.equal(analyzePrompt('a flag with a human emblem').category, 'prop');
});

test('cartoon concept preview is category-aware and valid inline SVG', () => {
  const svg = createCartoonSvg(analyzePrompt('a red spaceship with a blue cockpit'), { base: '#cc3333', glow: '#3366ff' });
  assert.match(svg, /<svg/);
  assert.match(svg, /#cc3333/);
  assert.match(svg, /#3366ff/);
  assert.match(svg, /SPACE SHIP|SPACESHIP/i);
});

test('internet research formats Wikipedia and Wikimedia results', async () => {
  const fetchMock = async (url) => {
    if (String(url).includes('en.wikipedia.org')) {
      return { ok: true, json: async () => ({ query: { search: [{ title: 'Dragon', snippet: 'A legendary creature with wings.' }] } }) };
    }
    return { ok: true, json: async () => ({ query: { pages: {
      1: { title: 'File:Dragon.jpg', imageinfo: [{
        thumburl: 'https://example.test/thumb.jpg',
        descriptionurl: 'https://commons.wikimedia.org/wiki/File:Dragon.jpg',
        extmetadata: { Artist: { value: 'Example Artist' }, LicenseShortName: { value: 'CC BY-SA' } }
      }] }
    } } }) };
  };
  const report = await researchReferences('a tiny purple dragon', fetchMock);
  assert.equal(report.status, 'complete');
  assert.equal(report.articles[0].title, 'Dragon');
  assert.equal(report.images[0].license, 'CC BY-SA');
});

test('local model integration parses structured blueprint JSON without an API key', async () => {
  const fetchMock = async () => ({ ok: true, json: async () => ({ message: { content: JSON.stringify({ objectType: 'creature', subject: 'dragon', silhouette: 'wide angular wings', primaryForms: ['torso', 'wings'], secondaryDetails: ['chest plates'], accentDetails: ['glowing eyes'], designHints: 'broad wings and plated chest', parts: [{ name: 'torso', shape: 'plate', position: [0, 1, 0], size: [0.8, 0.8, 0.6], role: 'base' }] }) } }) });
  const blueprint = await askLocalOllama({ endpoint: 'http://localhost:11434', model: 'qwen2.5:3b', prompt: 'purple dragon', fetchImpl: fetchMock });
  assert.equal(blueprint.subject, 'dragon');
  assert.deepEqual(blueprint.primaryForms, ['torso', 'wings']);
  assert.equal(blueprint.parts[0].shape, 'plate');
});


test('local AI part plan produces a concept preview from its actual forms', () => {
  const brief = analyzePrompt('a custom gravimetric analyzer');
  const palette = { base: '#667788', accent: '#AA8844', accent2: '#DDCCAA', dark: '#223344', glow: '#44DDFF' };
  const blueprint = { subject: 'gravimetric analyzer', parts: [
    { name: 'body', shape: 'plate', position: [0, 0.7, 0], size: [0.8, 0.8, 0.4], role: 'base' },
    { name: 'screen', shape: 'plate', position: [0, 1, -0.2], size: [0.4, 0.2, 0.05], role: 'glow' },
    { name: 'left sensor', shape: 'rod', position: [-0.2, 1.4, 0], size: [0.08, 0.4, 0.08], role: 'metal' },
    { name: 'right sensor', shape: 'rod', position: [0.2, 1.4, 0], size: [0.08, 0.4, 0.08], role: 'metal' },
    { name: 'grip', shape: 'box', position: [0, 0.2, 0], size: [0.3, 0.3, 0.25], role: 'dark' }
  ] };
  const svg = createBlueprintConceptSvg(brief, palette, blueprint);
  assert.match(svg, /FORGE3D \/ AI BLOCKOUT/);
  assert.match(svg, /GRAVIMETRIC ANALYZER/);
  assert.match(svg, /#44DDFF/);
});

test('subject resolver favors object heads over material adjectives and accessory nouns', () => {
  const cases = [
    ['royal oak desk with a drawer', 'table'],
    ['a black laptop with a phone sticker', 'computer'],
    ['a pirate ship with a skull flag', 'boat'],
    ['a cat carrying a dinosaur toy', 'cat'],
    ['a flag with a human emblem', 'flag'],
    ['a human holding a flag', 'human'],
    ['build a gravimetric analyzer with flag logos', 'gravimetric analyzer'],
    ['a handheld gravimetric analyzer with flag logos', 'gravimetric analyzer']
  ];
  for (const [prompt, expected] of cases) assert.equal(findObjectSubject(prompt), expected, prompt);
});
