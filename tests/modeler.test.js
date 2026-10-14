import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, classifyPrompt, detectPrimarySubject, getMeshStats, hasDedicatedGeometry } from '../src/modeler.js';

const cases = [
  ['robot avatar with cyan visor', 'character'],
  ['build a human', 'character'],
  ['a human holding a flag', 'character'],
  ['a human with a sword', 'character'],
  ['a dragon carrying a sword', 'creature'],
  ['a flag with a human emblem', 'prop'],
  ['a realistic woman with long hair', 'character'],
  ['a scientist wearing a space suit', 'character'],
  ['tiny purple dragon with wings and tail', 'creature'],
  ['low-poly horse with block legs', 'creature'],
  ['fantasy sword with green blade', 'weapon'],
  ['pine tree prop', 'prop'],
  ['simple mug', 'prop']
];


test('main subject outranks accessories, research hints, and later nouns', () => {
  assert.equal(detectPrimarySubject('build a human holding a flag').subject, 'human');
  assert.equal(detectPrimarySubject('make a dragon carrying a sword').subject, 'dragon');
  assert.equal(detectPrimarySubject('make a flag with a human emblem').subject, 'flag');
  assert.equal(classifyPrompt('build a human holding a flag'), 'character');
  assert.equal(classifyPrompt('make a dragon carrying a sword'), 'creature');
  assert.equal(classifyPrompt('make a person without a flag'), 'character');
});

test('research/design hints cannot hijack the requested human into a flag', () => {
  const result = createModel({
    prompt: 'build a human',
    designHints: 'Reference notes discuss national flags, banners, flag poles and signs.',
    triangleBudget: 500
  });
  const names = [];
  result.group.traverse(o => { if (o.isMesh) names.push(o.name); });
  assert.equal(result.category, 'character');
  assert.ok(names.includes('HumanHead'), 'must build an actual human head');
  assert.ok(names.includes('HumanTorso'), 'must build an actual human torso');
  assert.ok(names.some(n => /HumanLeft|HumanRight/.test(n)), 'must include human anatomy');
  assert.ok(!names.includes('FlagField'), 'research nouns must not replace the subject');
  assert.ok(result.stats.triangles <= 500, `human exceeded budget: ${result.stats.triangles}`);
});

test('human accessories decorate the human instead of replacing it', () => {
  const result = createModel({ prompt: 'a human holding a flag', triangleBudget: 500 });
  const names = [];
  result.group.traverse(o => { if (o.isMesh) names.push(o.name); });
  assert.equal(result.category, 'character');
  assert.ok(names.includes('HumanHead'));
  assert.ok(names.includes('HumanTorso'));
  assert.ok(names.includes('HeldFlagPole'));
  assert.ok(names.includes('HeldFlagCloth'));
  assert.ok(result.stats.triangles <= 500);
});

test('body color follows the subject rather than feature colors', () => {
  const blueDragon = createModel({ prompt: 'a blue dragon with red eyes' });
  const redDragon = createModel({ prompt: 'a red dragon with blue eyes' });
  assert.equal(blueDragon.palette.base.toLowerCase(), '#4c9ea8');
  assert.equal(blueDragon.palette.glow.toLowerCase(), '#ff766e');
  assert.equal(redDragon.palette.base.toLowerCase(), '#b94f4f');
  assert.equal(redDragon.palette.glow.toLowerCase(), '#66e8ff');
});

test('automatic prompt classification', () => {
  for (const [prompt, expected] of cases) assert.equal(classifyPrompt(prompt), expected, prompt);
});

test('every standard example has real mesh geometry and stays <= 500 triangles', () => {
  for (const [prompt, expected] of cases) {
    const result = createModel({ prompt, triangleBudget: 500 });
    const stats = getMeshStats(result.group);
    assert.equal(result.category, expected);
    assert.ok(stats.parts > 0, `${prompt} should contain mesh parts`);
    assert.ok(stats.vertices > 0, `${prompt} should have vertices`);
    assert.ok(stats.triangles > 0, `${prompt} should have triangles`);
    assert.ok(stats.triangles <= 500, `${prompt}: ${stats.triangles} triangles`);
  }
});


test('misleading secondary nouns do not replace subjects across major asset families', () => {
  const suite = [
    { prompt: 'a human holding a flag', category: 'character', must: 'HumanHead', mustNot: 'FlagField' },
    { prompt: 'a blue dragon carrying a sword', category: 'creature', must: 'DragonHead', mustNot: 'Blade' },
    { prompt: 'a red sports car with a pirate flag sticker', category: 'prop', must: 'LowerChassis', mustNot: 'FlagField' },
    { prompt: 'a flag with a dragon emblem', category: 'prop', must: 'FlagField' },
    { prompt: 'a cat riding a rocket', category: 'creature', must: 'AnimalHead' },
    { prompt: 'a laptop with a tiny flag sticker', category: 'prop', must: 'LaptopBase' },
    { prompt: 'a medieval castle with a horse statue', category: 'prop', must: 'BuildingBody' },
    { prompt: 'a chair with a sword mounted beside it', category: 'prop', must: 'SeatCushion' },
    { prompt: 'a pine tree beside a red sword', category: 'prop', must: 'Trunk' },
    { prompt: 'a human carrying a sword', category: 'character', must: 'HumanHead' }
  ];
  for (const item of suite) {
    const result = createModel({ prompt: item.prompt, triangleBudget: 500 });
    const names = [];
    result.group.traverse(o => { if (o.isMesh) names.push(o.name); });
    assert.equal(result.category, item.category, item.prompt);
    assert.ok(names.includes(item.must), `${item.prompt}: expected ${item.must}; got ${names.slice(0, 20).join(', ')}`);
    if (item.mustNot) assert.ok(!names.includes(item.mustNot), `${item.prompt}: did not expect ${item.mustNot}`);
    assert.ok(result.stats.triangles <= 500, `${item.prompt}: ${result.stats.triangles} triangles`);
  }
});

test('prompt-to-geometry routing stays faithful across diverse subjects and accessory nouns', () => {
  const suite = [
    { prompt: 'build a human', category: 'character', must: 'HumanHead', avoid: ['FlagField', 'AnimalHead'] },
    { prompt: 'a human with a flag on the backpack', category: 'character', must: 'HumanHead', avoid: ['FlagField'] },
    { prompt: 'a flag with a human emblem', category: 'prop', must: 'FlagField', avoid: ['HumanHead'] },
    { prompt: 'blue dragon holding a sword with a shield on its back', category: 'creature', must: 'DragonHead', avoid: ['Blade'] },
    { prompt: 'a chair with a sword mounted beside it', category: 'prop', must: 'SeatCushion', avoid: ['Blade'] },
    { prompt: 'royal oak desk with a drawer and a tiny flag decal', category: 'prop', must: 'TableTop', avoid: ['CanopyMain', 'FlagField'] },
    { prompt: 'a black laptop with a phone sticker', category: 'prop', must: 'LaptopBase', avoid: ['PhoneBody'] },
    { prompt: 'a red sports car with an orange flag sticker', category: 'prop', must: 'LowerChassis', avoid: ['FlagField', 'FruitBody'] },
    { prompt: 'a bicycle with a watermelon basket', category: 'prop', must: 'FrontWheel', avoid: ['WatermelonBody'] },
    { prompt: 'a royal castle with a dragon banner', category: 'prop', must: 'BuildingBody', avoid: ['FlagField'] },
    { prompt: 'a green cat carrying a dinosaur toy', category: 'creature', must: 'AnimalHead', avoid: ['DinoHead'] },
    { prompt: 'a bow engraved with a sword icon', category: 'weapon', must: 'BowGrip', avoid: ['Blade'] },
    { prompt: 'a gun with a rocket logo', category: 'weapon', must: 'GunReceiver', avoid: ['RocketBody'] },
    { prompt: 'a sign with a flag icon', category: 'prop', must: 'SignBoard', avoid: ['FlagField'] },
    { prompt: 'a wooden baseball bat with a dragon logo', category: 'prop', must: 'BatBarrel', avoid: ['DragonHead'] },
    { prompt: 'an oak tree with a sword leaning against it', category: 'prop', must: 'CanopyMain', avoid: ['Blade'] },
    { prompt: 'a laptop-sized spaceship', category: 'prop', must: 'ShipHull', avoid: ['LaptopBase'] },
    { prompt: 'a wizard holding a staff', category: 'character', must: 'HumanHead', avoid: ['StaffCore'] },
  ];
  for (const item of suite) {
    const result = createModel({ prompt: item.prompt, type: 'auto', triangleBudget: 500 });
    const names = [];
    result.group.traverse(o => { if (o.isMesh) names.push(o.name); });
    assert.equal(result.category, item.category, `${item.prompt} classification`);
    assert.ok(names.includes(item.must), `${item.prompt}: expected ${item.must}, got ${names.slice(0, 25).join(', ')}`);
    for (const unwanted of item.avoid || []) assert.ok(!names.includes(unwanted), `${item.prompt}: unwanted ${unwanted}`);
    assert.ok(result.stats.triangles <= 500, `${item.prompt}: triangle cap ${result.stats.triangles}`);
  }
});

test('unlisted main nouns beat known accessory words even without command verbs', () => {
  const prompt = 'a handheld gravimetric analyzer with flag logos and a tiny orange screen';
  const subject = detectPrimarySubject(prompt);
  assert.equal(subject.subject, 'custom prop');
  assert.match(subject.matchedText, /gravimetric analyzer/i);
  assert.equal(hasDedicatedGeometry(prompt, 'prop'), false);
  const result = createModel({ prompt, triangleBudget: 500 });
  const names = [];
  result.group.traverse(o => { if (o.isMesh) names.push(o.name); });
  assert.ok(!names.includes('FlagField'), `unknown object must not become a flag: ${names.join(', ')}`);
  assert.ok(names.includes('DeviceChassis'), `unknown analyzer should use its designed device fallback: ${names.join(', ')}`);
  assert.ok(result.stats.triangles <= 500);
});

test('an explicit object in the prompt overrides a mismatched UI category selector', () => {
  const result = createModel({ prompt: 'build a human', type: 'prop', triangleBudget: 500 });
  const names = [];
  result.group.traverse(o => { if (o.isMesh) names.push(o.name); });
  assert.equal(result.category, 'character');
  assert.ok(names.includes('HumanHead'));
  assert.ok(!names.includes('FlagField'));
});

test('requested 100-triangle limit is enforced', () => {
  for (const [prompt] of cases) {
    const { stats } = createModel({ prompt, triangleBudget: 100 });
    assert.ok(stats.triangles <= 100, `${prompt}: ${stats.triangles} triangles`);
  }
});

test('image palette input is accepted and generated group has a name', () => {
  const result = createModel({ prompt: 'a mint robot', imageColor: '#b36bd9', triangleBudget: 500 });
  assert.ok(result.name.length > 0);
  assert.match(result.palette.base, /^#[0-9a-f]{6}$/i);
});


test('premium grammar provides hard-surface rules and prompt scale changes proportions', () => {
  const base = createModel({ prompt: 'purple robot', triangleBudget: 500 });
  const giant = createModel({ prompt: 'giant purple robot', triangleBudget: 500 });
  assert.equal(base.group.userData.shapeStyle, 'premium');
  assert.ok(base.group.userData.designRules.includes('silhouette-first'));
  assert.ok(giant.group.scale.y > base.group.scale.y);
  assert.ok(base.stats.parts >= 12, 'premium default should preserve a multi-part asset');
});

test('specialist creature and vehicle models stay under the hard triangle cap', () => {
  const cases = ['dragon boss with sharp wings', 'armored unicorn', 'cute octopus', 'sports car'];
  for (const prompt of cases) {
    const result = createModel({ prompt, triangleBudget: 500 });
    assert.ok(result.stats.triangles <= 500, `${prompt}: ${result.stats.triangles}`);
    assert.ok(result.stats.parts >= 5, `${prompt} should retain a coherent multi-part silhouette`);
  }
});


test('feature color overrides the body hue for eyes and visors', () => {
  const cyan = createModel({ prompt: 'purple robot with cyan visor' });
  const gold = createModel({ prompt: 'blue dragon with gold eyes' });
  assert.equal(cyan.palette.glow, '#66E8FF');
  assert.equal(gold.palette.glow, '#FFD56A');
});

test('specialist grammar makes distinct non-robot assets and respects 500 triangles', () => {
  const prompts = [
    'sleek silver spaceship with cyan cockpit', 'red rocket ship with two fins', 'cartoon fighter jet with gold accents',
    'medieval stone castle with purple flags', 'woodland mushroom with glowing spots', 'black laptop with mint screen',
    'cartoon corgi with blue collar', 'tiny green stegosaurus with back plates', 'pirate sailboat with red sail',
    'mountain bicycle with silver frame', 'brass lantern with warm glowing glass', 'royal oak desk with a drawer'
  ];
  const outputs = prompts.map(prompt => createModel({ prompt, triangleBudget: 500 }));
  for (let i = 0; i < outputs.length; i++) {
    assert.ok(outputs[i].stats.parts >= 5, `${prompts[i]} should have specialist geometry`);
    assert.ok(outputs[i].stats.triangles <= 500, `${prompts[i]}: ${outputs[i].stats.triangles}`);
  }
  const signatures = outputs.map(o => `${o.category}:${o.stats.parts}:${o.group.children.map(c => c.name).slice(0, 4).join(',')}`);
  assert.ok(new Set(signatures).size >= 8, 'models should not collapse into a few reused shapes');
});

test('audit reports geometry budget and finite bounds', async () => {
  const { auditModel } = await import('../src/modeler.js');
  const result = createModel({ prompt: 'premium cartoon lighthouse with mint windows', triangleBudget: 500 });
  const audit = auditModel(result.group, 500);
  assert.ok(audit.triangles <= 500);
  assert.ok(audit.parts > 0);
  assert.equal(audit.invalidVertices, 0);
  assert.equal(audit.emptyMeshes, 0);
});

test('remix variation is recorded and proportion modifiers are supported', () => {
  const a = createModel({ prompt: 'cartoon dragon with wide wings', variation: 1, triangleBudget: 500 });
  const b = createModel({ prompt: 'cartoon dragon with wide wings', variation: 2, triangleBudget: 500 });
  assert.equal(a.group.userData.variation, 1);
  assert.equal(b.group.userData.variation, 2);
  assert.ok(a.stats.triangles <= 500 && b.stats.triangles <= 500);
});


test('unknown objects can be assembled from a bounded local-AI geometry plan', () => {
  const prompt = 'a handheld gravimetric analyzer with twin sensor prongs and a grip';
  assert.equal(hasDedicatedGeometry(prompt, 'prop'), false, 'novel noun should use the custom AI composition path');
  const blueprint = {
    subject: 'gravimetric analyzer',
    proportions: { headScale: 1, bodyWidth: 1.08, limbLength: 1, tailLength: 1 },
    parts: [
      { name: 'main chassis', shape: 'plate', position: [0, 0.62, 0], size: [0.78, 0.82, 0.44], role: 'base', priority: 'primary' },
      { name: 'upper sensor block', shape: 'plate', position: [0, 1.16, -0.02], size: [0.62, 0.34, 0.38], role: 'dark' },
      { name: 'display glass', shape: 'plate', position: [0, 0.78, -0.25], size: [0.42, 0.23, 0.025], role: 'glow' },
      { name: 'left prong', shape: 'rod', position: [-0.22, 1.48, -0.02], size: [0.09, 0.44, 0.09], rotation: [0, 0, -0.08], role: 'metal' },
      { name: 'right prong', shape: 'rod', position: [0.22, 1.48, -0.02], size: [0.09, 0.44, 0.09], rotation: [0, 0, 0.08], role: 'metal' },
      { name: 'hand grip', shape: 'box', position: [0, 0.22, 0.10], size: [0.26, 0.28, 0.22], role: 'dark', priority: 'secondary' },
      { name: 'status ring', shape: 'ring', position: [0, 1.02, -0.28], size: [0.16, 0.16, 0.05], role: 'glow' }
    ]
  };
  const result = createModel({ prompt, type: 'prop', blueprint, triangleBudget: 500 });
  assert.equal(result.group.userData.aiAuthoredGeometry, true);
  assert.ok(result.stats.parts >= 7);
  assert.ok(result.stats.triangles <= 500);
});

test('poor local-AI geometry plans safely fall back to curated procedural grammar', () => {
  const result = createModel({ prompt: 'a one-off strange artifact', type: 'prop', blueprint: { parts: [{ name: 'only one', shape: 'box' }] }, triangleBudget: 500 });
  assert.equal(result.group.userData.aiAuthoredGeometry, false);
  assert.ok(result.stats.parts >= 5);
  assert.ok(result.stats.triangles <= 500);
});

test('hard triangle budget remains absolute even when an AI plan marks every part primary', () => {
  const parts = Array.from({ length: 26 }, (_, i) => ({
    name: `central module ${i + 1}`, shape: 'plate',
    position: [((i % 5) - 2) * 0.22, 0.4 + Math.floor(i / 5) * 0.23, ((i % 3) - 1) * 0.18],
    size: [0.62, 0.58, 0.42], role: i % 4 === 0 ? 'accent' : 'base', priority: 'primary'
  }));
  const result = createModel({ prompt: 'an unfamiliar modular orbital fabricator', type: 'prop', blueprint: { parts }, triangleBudget: 180 });
  assert.ok(result.stats.triangles <= 180, `hard cap violated: ${result.stats.triangles}`);
});

test('prompt-routing stress suite preserves the named main object across unrelated accessories', () => {
  const suite = [
    ['a tall human wearing glasses and carrying a flag', 'character', 'HumanTorso'],
    ['a robot with a human face and sword', 'character', 'TorsoShell'],
    ['a medieval knight with dragon-shaped shield', 'character', 'HumanTorso'],
    ['a baby dragon sitting on a treasure chest', 'creature', 'DragonHead'],
    ['a velociraptor with orange armor', 'creature', 'DinoTorso'],
    ['a corgi wearing a space helmet', 'creature', 'CreatureTorso'],
    ['a pirate ship with a skull flag', 'prop', 'Hull'],
    ['modern house with tree in front', 'prop', 'BuildingBody'],
    ['castle with horse statue', 'prop', 'BuildingBody'],
    ['royal oak desk with a drawer', 'prop', 'TableTop'],
    ['chair with lion emblem', 'prop', 'SeatCushion'],
    ['laptop with phone sticker', 'prop', 'LaptopBase'],
    ['smartphone with laptop logo', 'prop', 'PhoneBody'],
    ['sports car with flag sticker', 'prop', 'LowerChassis'],
    ['a tractor with flower decal', 'prop', 'TractorChassis'],
    ['a bow with sword engraving', 'weapon', 'BowString'],
    ['magic staff topped with dragon', 'weapon', 'StaffShaft'],
    ['gun with rocket logo', 'weapon', 'GunReceiver'],
    ['shield with human emblem', 'weapon', 'ShieldFace'],
    ['sign with flag graphic', 'prop', 'SignPost'],
    ['flag with human graphic', 'prop', 'FlagField'],
    ['green mushroom', 'prop', 'GillRing'],
    ['red apple in mug', 'prop', 'FoodBody'],
    ['wooden baseball bat', 'prop', 'BatHandle'],
    ['fountain with small dragon statue', 'prop', 'FountainPlinth'],
    ['handheld gravimetric analyzer with flag logos', 'prop', 'DeviceChassis'],
    ['quantum garden spool with orange lights', 'prop', 'SpoolCore'],
    ['self-folding transport pod', 'prop', 'PodHull'],
    ['horse-shaped carousel with flags', 'prop', 'CarouselMast'],
    ['gold ring with tiny sword charm', 'prop', 'RingBand'],
    ['rocket launcher on a tank', 'weapon', 'LauncherFrame'],
    ['coffee mug with spaceship logo', 'prop', 'CupBody'],
    ['build an old wooden windmill next to a house', 'prop', 'WindmillTower'],
    ['build a futuristic vending machine with a giant screen and two glowing buttons', 'prop', 'DeviceChassis']
  ];
  for (const [prompt, expectedCategory, requiredPart] of suite) {
    // Deliberately supply the wrong category to prove the named subject wins.
    const wrongType = expectedCategory === 'prop' ? 'character' : 'prop';
    const result = createModel({ prompt, type: wrongType, triangleBudget: 500 });
    const names = [];
    result.group.traverse(o => { if (o.isMesh) names.push(o.name); });
    assert.equal(result.category, expectedCategory, `${prompt}: category`);
    assert.ok(names.includes(requiredPart), `${prompt}: expected ${requiredPart}, got ${names.slice(0, 12).join(', ')}`);
    assert.ok(result.stats.triangles <= 500, `${prompt}: triangle budget exceeded`);
  }
});
