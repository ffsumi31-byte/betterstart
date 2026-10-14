import * as THREE from 'three';

/*
 * Forge3D Model Grammar v2
 * ------------------------
 * The generator follows a real game-asset blockout order:
 * 1) recognizable silhouette and readable proportions,
 * 2) primary masses with a consistent bevel language,
 * 3) secondary armor / anatomy plates that sit slightly above the surface,
 * 4) a restrained set of tertiary accents and emissive details.
 *
 * Most hero forms use hard-edged polygonal prisms instead of piles of plain
 * cubes. Their large planar faces remain quad-like in appearance, while cut
 * corners give the silhouette a deliberate, premium hard-surface finish.
 * The triangle budget is a hard cap, not a target that may be exceeded.
 */

const COLOR_MAP = [
  [/\b(purple|violet|magenta)\b/i, '#8054B8'],
  [/\b(red|crimson|ruby)\b/i, '#B94F4F'],
  [/\b(blue|cyan|ice|teal)\b/i, '#4C9EA8'],
  [/\b(green|mint|emerald)\b/i, '#4D9971'],
  [/\b(yellow|gold|golden)\b/i, '#C7A047'],
  [/\b(orange|amber)\b/i, '#C9793F'],
  [/\b(pink|rose)\b/i, '#C779A5'],
  [/\b(black|dark|graphite|obsidian)\b/i, '#414A55'],
  [/\b(white|ivory|pearl)\b/i, '#C9D1D4']
];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const isMatch = (prompt, re) => re.test(prompt);

// All geometry dispatch uses the detected primary noun, never every noun in the sentence.
// The full prompt remains available to builders for style/features/accessories.
function primaryTerm(prompt) {
  const subject = detectPrimarySubject(prompt);
  return String(subject?.matchedText || '').toLowerCase().trim();
}

function primaryPaletteColor(prompt) {
  const text = String(prompt || '').toLowerCase();
  const colorToken = /\b(?:purple|violet|magenta|red|crimson|ruby|blue|cyan|ice|teal|green|mint|emerald|yellow|gold|golden|orange|amber|pink|rose|black|dark|graphite|obsidian|white|ivory|pearl|brown|tan|silver|gray|grey)\b/gi;
  const matches = [...text.matchAll(colorToken)].map(m => {
    const word = m[0].toLowerCase();
    const rule = COLOR_MAP.find(([re]) => re.test(word));
    return { word, index: m.index ?? 0, color: rule?.[1] };
  }).filter(m => m.color);
  if (!matches.length) return null;

  // Explicit body/material descriptions are stronger than eye, visor or accessory colors.
  const roleWord = '(?:body|main\\s+body|skin|fur|scales|feathers|shell|coat|hide|armor|armour|outfit|clothes|clothing|shirt|hoodie|dress|robe|suit|torso|primary\\s+color|primary\\s+colour)';
  for (const color of matches) {
    const after = text.slice(color.index + color.word.length, color.index + color.word.length + 45);
    if (new RegExp(`^\\s*(?:colored|colour|color)?\\s*${roleWord}\\b`).test(after)) return color.color;
  }
  // Prefer the color that directly describes the main requested object: "blue dragon with red eyes".
  const subject = detectPrimarySubject(text);
  if (subject) {
    const preceding = matches.filter(m => m.index < subject.index && subject.index - m.index <= 42);
    if (preceding.length) return preceding[preceding.length - 1].color;
  }
  // If the prompt specifies clothing without a colored subject, use the outfit's hue.
  for (const color of matches) {
    const after = text.slice(color.index + color.word.length, color.index + color.word.length + 36);
    if (new RegExp(`^\\s*(?:colored|colour|color)?\\s*(?:shirt|hoodie|dress|robe|suit|outfit|clothing|armor|armour|jacket|pants|jeans)\\b`).test(after)) return color.color;
  }
  return matches[0].color;
}

function paletteFor(prompt, imageColor) {
  let base = imageColor || '#8C70C8';
  if (!imageColor) base = primaryPaletteColor(prompt) || base;
  const c = new THREE.Color(base);
  const hsl = {}; c.getHSL(hsl);
  if (hsl.s < 0.18) c.setHSL(0.58, 0.14, clamp(hsl.l, 0.3, 0.72));
  const bHsl = {}; c.getHSL(bHsl);
  const accent = new THREE.Color().setHSL((bHsl.h + 0.095) % 1, clamp(Math.max(bHsl.s, 0.42), 0.42, 0.76), clamp(bHsl.l + 0.13, 0.48, 0.72));
  // Explicit feature colors ("cyan eyes", "gold visor") override body color.
  // Keep the color adjacent to the feature phrase so "blue dragon with gold eyes"
  // doesn't incorrectly assign the body color to the eyes.
  let glow = '#66E8E2';
  const featurePhrase = (color) => new RegExp(
    `\\b(?:${color})\\b\\s+(?:(?:bright|neon|glowing|luminous)\\s+)?(?:eyes?|visor|glow|lights?|core)\\b|\\b(?:eyes?|visor|glow|lights?|core)\\b\\s+(?:(?:are|is|glow|colored|color|:)\\s+)?(?:(?:bright|neon|glowing|luminous)\\s+)?\\b(?:${color})\\b`,
    'i'
  ).test(prompt);
  if (featurePhrase('cyan|teal|blue|ice')) glow = '#66E8FF';
  else if (featurePhrase('yellow|gold|golden|amber')) glow = '#FFD56A';
  else if (featurePhrase('green|mint|emerald')) glow = '#A5F58C';
  else if (featurePhrase('purple|violet|magenta|pink')) glow = '#E08BFF';
  else if (featurePhrase('red|crimson|ruby')) glow = '#FF766E';
  else if (isMatch(prompt, /\b(yellow|gold|golden|amber)\b/i)) glow = '#FFD56A';
  else if (isMatch(prompt, /\b(purple|violet|magenta)\b/i)) glow = '#E08BFF';
  else if (isMatch(prompt, /\b(red|crimson|ruby)\b/i)) glow = '#FF766E';
  else if (isMatch(prompt, /\b(green|mint|emerald)\b/i)) glow = '#A5F58C';
  else if (isMatch(prompt, /\b(blue|cyan|ice|teal)\b/i)) glow = '#66E8FF';
  if (isMatch(prompt, /\b(gold|golden|royal|ornate)\b/i)) accent.set('#D8AE58');
  if (isMatch(prompt, /\b(stealth|obsidian|black|graphite)\b/i)) accent.set('#788895');
  return {
    base: `#${c.getHexString()}`,
    accent: `#${accent.getHexString()}`,
    accent2: isMatch(prompt, /\b(gold|golden|royal|ornate)\b/i) ? '#D8AE58' : '#D4DFE2',
    dark: '#27323B',
    shadow: '#171F28',
    light: '#C9D4D9',
    metal: '#667784',
    eye: glow,
    glow
  };
}

function material(color, role = 'base', shapeStyle = 'premium') {
  const soft = shapeStyle === 'soft';
  const metalness = role === 'metal' ? 0.48 : role === 'glow' ? 0.12 : role === 'dark' ? 0.2 : 0.08;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: soft ? 0.94 : role === 'glow' ? 0.3 : role === 'metal' ? 0.42 : 0.72,
    metalness,
    flatShading: !soft,
    emissive: role === 'glow' ? color : '#000000',
    emissiveIntensity: role === 'glow' ? 0.42 : 0
  });
}

function addMesh(group, name, geometry, color, position, scale = [1, 1, 1], rotation = [0, 0, 0], role = 'base', style = 'premium') {
  const mesh = new THREE.Mesh(geometry, material(color, role, style));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.role = role;
  group.add(mesh);
  return mesh;
}

function box(g, name, pos, size, color, style = 'premium', role = 'base', rotation = [0, 0, 0]) {
  return addMesh(g, name, new THREE.BoxGeometry(...size), color, pos, [1, 1, 1], rotation, role, style);
}

function ico(g, name, pos, radius, color, scale = [1, 1, 1], detail = 0, style = 'premium', role = 'base') {
  return addMesh(g, name, new THREE.IcosahedronGeometry(radius, detail), color, pos, scale, [0, 0, 0], role, style);
}

function cylinder(g, name, pos, rTop, rBottom, height, color, segments = 6, rotation = [0, 0, 0], style = 'premium', role = 'base') {
  return addMesh(g, name, new THREE.CylinderGeometry(rTop, rBottom, height, segments, 1, false), color, pos, [1, 1, 1], rotation, role, style);
}
function cone(g, name, pos, radius, height, color, segments = 5, rotation = [0, 0, 0], style = 'premium') {
  return cylinder(g, name, pos, 0, radius, height, color, segments, rotation, style, 'metal');
}

function polygonPrismGeometry(points, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function plate(g, name, pos, size, color, style = 'premium', role = 'base', cut = 0.13, rotation = [0, 0, 0]) {
  // An octagonal face is still a broad readable plane, with clipped corners
  // instead of rounded toy-like edges. 28 triangles including its side walls.
  if (style === 'soft' || style === 'minimal') return box(g, name, pos, size, color, style, role, rotation);
  const [w, h, d] = size;
  const c = Math.min(w, h) * clamp(cut, 0.06, 0.24);
  const pts = [
    [-w / 2 + c, -h / 2], [w / 2 - c, -h / 2], [w / 2, -h / 2 + c],
    [w / 2, h / 2 - c], [w / 2 - c, h / 2], [-w / 2 + c, h / 2],
    [-w / 2, h / 2 - c], [-w / 2, -h / 2 + c]
  ];
  return addMesh(g, name, polygonPrismGeometry(pts, d), color, pos, [1, 1, 1], rotation, role, style);
}

function polyPlate(g, name, pos, points, depth, color, style = 'premium', role = 'base', rotation = [0, 0, 0]) {
  // Custom silhouettes stay custom in every material style; the style changes
  // shading and simple boxes, never silently destroys the designed profile.
  return addMesh(g, name, polygonPrismGeometry(points, depth), color, pos, [1, 1, 1], rotation, role, style);
}

function triangle(g, name, points, color, style = 'premium', role = 'base') {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  geo.computeVertexNormals();
  const mesh = addMesh(g, name, geo, color, [0, 0, 0], [1, 1, 1], [0, 0, 0], role, style);
  mesh.material.side = THREE.DoubleSide;
  return mesh;
}

function segment(g, name, start, end, width, depth, color, style = 'premium', role = 'base') {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const mesh = box(g, name, a.clone().add(b).multiplyScalar(0.5).toArray(), [width, delta.length(), depth], color, style, role);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function humanColors(prompt, p) {
  const text = String(prompt || '').toLowerCase();
  let skin = '#C98F68';
  if (/\b(?:very\s+)?pale\s+skin|fair\s+skin|light\s+skin\b/.test(text)) skin = '#E6BE9E';
  else if (/\b(?:dark|deep)\s+brown\s+skin|dark[- ]skinned|deep[- ]skinned\b/.test(text)) skin = '#65402F';
  else if (/\b(?:brown|medium[- ]brown)\s+skin|brown[- ]skinned\b/.test(text)) skin = '#8C5D43';
  else if (/\bolive\s+skin\b/.test(text)) skin = '#B58A61';
  else if (/\btan\s+skin\b/.test(text)) skin = '#B77D55';
  else if (/\bgoblin\b|\borc\b/.test(text)) skin = '#819B5B';
  else if (/\bzombie\b/.test(text)) skin = '#91A18A';
  let hair = '#3A2A24';
  if (/\b(?:blonde|blond)\s+hair\b/.test(text)) hair = '#D6B25F';
  else if (/\bred\s+hair\b/.test(text)) hair = '#984C34';
  else if (/\b(?:white|silver|gray|grey)\s+hair\b/.test(text)) hair = '#C5C9C7';
  else if (/\bbrown\s+hair\b/.test(text)) hair = '#6A4631';
  else if (/\bblack\s+hair\b/.test(text)) hair = '#25272C';
  else if (/\bblue\s+hair\b/.test(text)) hair = '#4D78AD';
  else if (/\bpink\s+hair\b/.test(text)) hair = '#D67FAE';
  return { skin, hair, shirt: p.base || '#527DA8', pants: /\b(?:jeans|blue\s+jeans)\b/.test(text) ? '#3E5B87' : p.dark || '#3D4650' };
}

function makeHuman(g, p, prompt, style) {
  const text = String(prompt || '').toLowerCase();
  const c = humanColors(text, p);
  const bald = /\bbald\b|\bshaved\s+head\b/.test(text);
  const fantasyEars = /\b(?:elf|goblin|orc|pointed\s+ears|long\s+ears)\b/.test(text);
  const skeleton = /\bskeleton\b/.test(text);
  if (skeleton) { c.skin = '#D8D0B8'; c.shirt = '#D8D0B8'; c.pants = '#45464A'; }
  const longHair = /\blong\s+hair\b/.test(text);
  const femalePresentation = /\bwoman\b|\bwomen\b|\bgirl\b|\bfemale\b/.test(text);
  const formal = /\b(?:suit|formal|business|tuxedo)\b/.test(text);
  const armored = /\b(?:armor|armour|knight|warrior|soldier|battle|astronaut|space\s+suit)\b/.test(text);
  const hoodie = /\bhoodie\b|\bsweatshirt\b/.test(text);

  // Human anatomy blockout: a clear head/neck/shoulders/pelvis with separated limbs.
  // The body silhouette is human by default; robotic visor/head grammar is never used here.
  polyPlate(g, 'HumanTorso', [0, 1.83, 0], [[-0.34,-0.48],[0.34,-0.48],[0.43,-0.15],[0.39,0.38],[0.27,0.48],[-0.27,0.48],[-0.39,0.38],[-0.43,-0.15]], 0.40, c.shirt, style, 'base');
  box(g, 'HumanPelvis', [0, 1.18, 0], [0.58,0.28,0.34], c.pants, style, 'dark');
  cylinder(g, 'HumanNeck', [0, 2.36, 0], 0.12, 0.14, 0.20, c.skin, 7, [0,0,0], style, 'base');

  // Head: low-poly ellipsoid plus readable facial landmarks facing the front (-Z).
  ico(g, 'HumanHead', [0, 2.78, 0], 0.34, c.skin, [0.88,1.10,0.82], 1, style, 'base');
  for (const side of [-1,1]) {
    if (fantasyEars) polyPlate(g, side < 0 ? 'HumanLeftPointedEar' : 'HumanRightPointedEar', [side*0.33,2.82,0], [[-0.07,-0.04],[0.16,0.02],[side*0.32,0.22],[side*0.04,0.13]], 0.055, c.skin, style, 'base');
    else ico(g, side < 0 ? 'HumanLeftEar' : 'HumanRightEar', [side*0.292,2.77,-0.005], 0.075, c.skin, [0.72,1.05,0.62], 0, style, 'base');
    box(g, side < 0 ? 'HumanLeftEye' : 'HumanRightEye', [side*0.105,2.81,-0.268], [0.058,0.062,0.025], '#292A2B', style, 'dark');
    box(g, side < 0 ? 'HumanLeftBrow' : 'HumanRightBrow', [side*0.106,2.885,-0.263], [0.085,0.022,0.028], c.hair, style, 'dark');
  }
  polyPlate(g, 'HumanNose', [0,2.735,-0.282], [[-0.035,0.045],[0.035,0.045],[0.052,-0.035],[0,-0.065],[-0.052,-0.035]], 0.055, c.skin, style, 'base');
  box(g, 'HumanMouth', [0,2.655,-0.274], [0.105,0.018,0.018], /\bsmil(e|ing)\b/.test(text) ? '#944F4B' : '#70443C', style, 'dark');
  if (/\b(?:beard|bearded)\b/.test(text) && !skeleton) polyPlate(g, 'HumanBeard', [0,2.59,-0.20], [[-0.17,0.11],[0.17,0.11],[0.12,-0.11],[0,-0.18],[-0.12,-0.11]], 0.07, c.hair, style, 'dark');
  if (/\b(?:mustache|moustache)\b/.test(text) && !skeleton) { for (const side of [-1,1]) polyPlate(g, `HumanMustache${side}`, [side*0.055,2.665,-0.285], [[-0.06,0.025],[0.02,0.025],[0.07,-0.02],[0,-0.035]], 0.025, c.hair, style, 'dark'); }
  if (/\bglasses\b|\bspectacles\b/.test(text)) {
    for (const side of [-1,1]) {
      box(g, `HumanGlassesLens${side}`, [side*0.105,2.81,-0.292], [0.13,0.11,0.025], p.dark, style, 'dark');
      box(g, `HumanGlassesBridge${side}`, [side*0.05,2.81,-0.308], [0.06,0.025,0.022], p.accent2, style, 'metal');
    }
  }
  if (/\b(?:hat|cap|beanie)\b/.test(text)) {
    plate(g, 'HumanHatBrim', [0,3.04,-0.015], [0.67,0.10,0.59], p.accent2, style, 'metal', 0.12);
    plate(g, 'HumanHatCrown', [0,3.16,0.02], [0.49,0.22,0.45], p.base, style, 'base', 0.14);
  }
  if (/\bcrown\b/.test(text)) {
    plate(g, 'HumanCrownBand', [0,3.12,0.01], [0.54,0.10,0.45], p.accent2, style, 'metal', 0.06);
    for (const x of [-0.18,0,0.18]) polyPlate(g, `HumanCrownPoint${x}`, [x,3.23,0.01], [[-0.05,0],[0,0.12],[0.05,0]], 0.055, p.accent2, style, 'metal');
  }
  if (!bald) {
    plate(g, 'HumanHairCap', [0,3.015,0.015], [0.59,0.22,0.53], c.hair, style, 'dark', 0.16);
    plate(g, 'HumanFringe', [0,2.94,-0.218], [0.48,0.15,0.12], c.hair, style, 'dark', 0.12);
    if (longHair || femalePresentation) {
      plate(g, 'HumanBackHair', [0,2.74,0.205], [0.58,0.63,0.18], c.hair, style, 'dark', 0.14);
      for (const side of [-1,1]) plate(g, side < 0 ? 'HumanLeftHairLock' : 'HumanRightHairLock', [side*0.285,2.75,-0.005], [0.11,0.40,0.15], c.hair, style, 'dark', 0.10);
    }
    if (/\bmohawk\b|\bspiky\s+hair\b/.test(text)) {
      for (let i=0;i<3;i++) polyPlate(g, `HumanHairSpike${i}`, [(i-1)*0.13,3.14,-0.01], [[-0.08,0],[0,0.18],[0.08,0]], 0.12, c.hair, style, 'dark');
    }
  }

  // Outfit layers. Features are attached to the torso, not randomly placed around it.
  if (formal) {
    polyPlate(g, 'SuitLeftLapel', [-0.12,2.04,-0.218], [[-0.09,0.18],[0.04,0.18],[0.09,-0.18],[0,-0.08]], 0.025, p.light, style, 'metal');
    polyPlate(g, 'SuitRightLapel', [0.12,2.04,-0.218], [[-0.04,0.18],[0.09,0.18],[0,-0.08],[-0.09,-0.18]], 0.025, p.light, style, 'metal');
    box(g, 'SuitTie', [0,1.91,-0.222], [0.075,0.34,0.025], p.accent2, style, 'metal');
  } else if (hoodie) {
    plate(g, 'HoodBack', [0,2.13,0.19], [0.48,0.45,0.20], c.shirt, style, 'base', 0.18);
    box(g, 'HoodiePocket', [0,1.56,-0.218], [0.32,0.14,0.025], p.accent, style, 'metal');
    for (const x of [-0.09,0.09]) cylinder(g, `HoodDrawstring${x}`, [x,2.08,-0.224], 0.012,0.012,0.19,p.light,4,[0,0,0],style,'metal');
  } else if (armored) {
    plate(g, 'HumanBreastplate', [0,1.93,-0.221], [0.53,0.49,0.075], p.accent, style, 'metal', 0.18);
    box(g, 'HumanBelt', [0,1.22,-0.181], [0.58,0.075,0.04], p.dark, style, 'dark');
    plate(g, 'HumanBeltBuckle', [0,1.22,-0.209], [0.13,0.12,0.025], p.accent2, style, 'metal');
    if (/\bhelmet\b/.test(text)) plate(g, 'HumanHelmet', [0,3.045,0.015], [0.65,0.22,0.58], p.accent2, style, 'metal', 0.16);
  } else {
    box(g, 'HumanShirtPlacket', [0,1.93,-0.218], [0.045,0.42,0.025], p.accent, style, 'metal');
    for (let i=0;i<2;i++) ico(g, `HumanButton${i}`, [0,1.99-i*0.15,-0.238], 0.025, p.accent2, [1,1,0.35], 0, style, 'metal');
  }

  // Arms articulated visually into upper arm, forearm and hand; sleeves vary by outfit.
  for (const side of [-1,1]) {
    const prefix = side < 0 ? 'HumanLeft' : 'HumanRight';
    plate(g, `${prefix}Shoulder`, [side*0.47,2.13,0], [0.27,0.30,0.35], armored ? p.accent : c.shirt, style, armored ? 'metal':'base', 0.15, [0,0,side*-0.08]);
    segment(g, `${prefix}UpperArm`, [side*0.48,2.02,0], [side*0.58,1.68,-0.01], 0.205,0.23, c.shirt, style, 'base');
    segment(g, `${prefix}Forearm`, [side*0.58,1.68,-0.01], [side*0.61,1.38,-0.04], 0.165,0.19, c.skin, style, 'base');
    ico(g, `${prefix}Hand`, [side*0.61,1.29,-0.055], 0.105, c.skin, [0.78,1.05,0.70], 0, style, 'base');
    if (armored) plate(g, `${prefix}Bracer`, [side*0.60,1.48,-0.01], [0.20,0.25,0.22], p.dark, style, 'dark', 0.12);

    // Two-piece trousers and low-poly shoes keep the legs readable from a game camera.
    segment(g, `${prefix}Thigh`, [side*0.20,1.10,0], [side*0.22,0.72,0], 0.245,0.29, c.pants, style, 'dark');
    segment(g, `${prefix}Shin`, [side*0.22,0.72,0], [side*0.23,0.29,0], 0.195,0.24, c.pants, style, 'dark');
    plate(g, `${prefix}Shoe`, [side*0.23,0.14,-0.07], [0.30,0.20,0.46], p.dark, style, 'dark', 0.10);
    if (/\b(?:boots|boot|combat)\b/.test(text)) plate(g, `${prefix}BootCuff`, [side*0.23,0.30,0], [0.22,0.11,0.25], p.accent2, style, 'metal', 0.08);
  }

  if (/\b(?:holding|holds|carrying|carries|with)\s+(?:(?:a|the)\s+)?flag\b/.test(text)) {
    segment(g, 'HeldFlagPole', [0.65,1.28,-0.04], [0.65,2.40,-0.04], 0.035,0.035, p.dark, style, 'dark');
    polyPlate(g, 'HeldFlagCloth', [0.88,2.22,-0.04], [[0,0.17],[0.42,0.17],[0.36,-0.17],[0,-0.17]], 0.025, p.accent2, style, 'base');
  }
  if (/\b(?:holding|holds|carrying|carries|wielding|with)\s+(?:(?:a|the)\s+)?sword\b/.test(text)) {
    segment(g, 'HeldSwordGrip', [0.65,1.25,-0.08], [0.65,1.62,-0.08], 0.055,0.055,p.dark,style,'dark');
    plate(g, 'HeldSwordGuard', [0.65,1.64,-0.08], [0.25,0.055,0.08], p.accent2,style,'metal',0.08);
    polyPlate(g, 'HeldSwordBlade', [0.65,1.96,-0.08], [[-0.055,-0.04],[-0.045,0.28],[0,0.40],[0.045,0.28],[0.055,-0.04]], 0.04,p.light,style,'metal');
  }
}

function makeHumanoid(g, p, prompt, style) {
  // Head/torso ratio and tapered massing are deliberately Roblox-readable.
  polyPlate(g, 'TorsoShell', [0, 2.52, 0], [
    [-0.47, 0.52], [0.47, 0.52], [0.62, 0.28], [0.45, -0.43], [0.30, -0.52],
    [-0.30, -0.52], [-0.45, -0.43], [-0.62, 0.28]
  ], 0.58, p.base, style);
  box(g, 'Pelvis', [0, 1.87, 0], [0.78, 0.34, 0.5], p.dark, style, 'dark');
  box(g, 'NeckCoupler', [0, 3.12, 0], [0.28, 0.19, 0.28], p.dark, style, 'dark');

  plate(g, 'HeadShell', [0, 3.58, 0], [0.82, 0.76, 0.68], p.light, style, 'metal', 0.16);
  box(g, 'HelmetCrown', [0, 3.91, 0.015], [0.84, 0.21, 0.7], p.base, style);
  box(g, 'FaceInset', [0, 3.58, -0.353], [0.59, 0.245, 0.045], p.dark, style, 'dark');
  box(g, 'VisorCore', [0, 3.59, -0.38], [0.43, 0.075, 0.025], p.glow, style, 'glow');
  if (isMatch(prompt, /robot|mech|cyber|sci.?fi|astronaut|android|helmet/i)) {
    box(g, 'BrowGuard', [0, 3.76, -0.365], [0.63, 0.095, 0.075], p.dark, style, 'dark');
    cone(g, 'Antenna', [0.23, 4.10, 0.02], 0.065, 0.22, p.accent2, 5, [0, 0, 0], style);
  }

  // Raised chest armor is kept on its own depth plane to avoid z-fighting.
  polyPlate(g, 'ChestArmor', [0, 2.59, -0.315], [
    [-0.32, 0.26], [0.32, 0.26], [0.40, 0.06], [0.26, -0.24], [-0.26, -0.24], [-0.40, 0.06]
  ], 0.065, p.dark, style, 'dark');
  plate(g, 'ChestCoreFrame', [0, 2.59, -0.355], [0.27, 0.29, 0.035], p.accent2, style, 'metal', 0.22);
  box(g, 'ChestCore', [0, 2.59, -0.377], [0.105, 0.16, 0.02], p.glow, style, 'glow');

  for (const s of [-1, 1]) {
    const side = s < 0 ? 'Left' : 'Right';
    plate(g, `${side}ShoulderArmor`, [s * 0.70, 2.82, 0], [0.45, 0.40, 0.56], p.base, style, 'base', 0.22, [0, 0, s * -0.08]);
    box(g, `${side}UpperArm`, [s * 0.77, 2.42, 0], [0.32, 0.45, 0.4], p.base, style);
    box(g, `${side}ForearmArmor`, [s * 0.79, 2.04, -0.015], [0.36, 0.37, 0.45], p.dark, style, 'dark', [0, 0, s * 0.035]);
    box(g, `${side}ForearmStripe`, [s * 0.79, 2.09, -0.247], [0.19, 0.045, 0.022], p.accent, style, 'metal');
    box(g, `${side}Hand`, [s * 0.79, 1.78, -0.02], [0.30, 0.22, 0.34], p.light, style, 'metal');
    box(g, `${side}Thigh`, [s * 0.31, 1.48, 0], [0.34, 0.49, 0.43], p.base, style);
    box(g, `${side}KneeJoint`, [s * 0.31, 1.18, 0], [0.24, 0.12, 0.29], p.dark, style, 'dark');
    box(g, `${side}ShinArmor`, [s * 0.31, 0.82, -0.015], [0.36, 0.48, 0.48], p.dark, style, 'dark');
    plate(g, `${side}Boot`, [s * 0.31, 0.39, -0.055], [0.44, 0.27, 0.63], p.accent, style, 'metal', 0.15);
    box(g, `${side}BootToe`, [s * 0.31, 0.34, -0.34], [0.27, 0.075, 0.055], p.dark, style, 'dark');
  }
  if (isMatch(prompt, /backpack|jetpack|heavy|soldier|explorer/i)) {
    plate(g, 'Backpack', [0, 2.62, 0.36], [0.55, 0.65, 0.28], p.dark, style, 'dark');
    box(g, 'PackLatch', [0, 2.61, 0.515], [0.18, 0.22, 0.025], p.accent2, style, 'metal');
  }
}

function makeDragon(g, p, prompt, style) {
  plate(g, 'DragonTorso', [0, 1.68, 0.12], [0.86, 0.62, 1.18], p.base, style, 'base', 0.19);
  box(g, 'ChestScute', [0, 1.66, -0.49], [0.54, 0.40, 0.06], p.light, style, 'metal');
  for (let i = 0; i < 2; i++) box(g, `ScuteSeam${i}`, [0, 1.72 - i * 0.12, -0.529], [0.34 - i * 0.035, 0.022, 0.012], p.accent2, style, 'metal');
  box(g, 'DragonNeck', [0, 1.99, -0.47], [0.47, 0.57, 0.52], p.base, style, 'base', [-0.18, 0, 0]);
  plate(g, 'DragonHead', [0, 2.37, -0.72], [0.65, 0.52, 0.55], p.base, style, 'base', 0.2);
  box(g, 'DragonMuzzle', [0, 2.19, -1.02], [0.50, 0.24, 0.28], p.dark, style, 'dark');
  box(g, 'JawPlate', [0, 2.06, -0.99], [0.32, 0.08, 0.25], p.accent2, style, 'metal');
  for (const s of [-1, 1]) {
    box(g, s < 0 ? 'LeftEye' : 'RightEye', [s * 0.20, 2.43, -1.014], [0.085, 0.074, 0.025], p.glow, style, 'glow');
    box(g, s < 0 ? 'LeftBrow' : 'RightBrow', [s * 0.2, 2.51, -0.98], [0.21, 0.07, 0.06], p.dark, style, 'dark', [0, 0, s * 0.18]);
    cone(g, s < 0 ? 'LeftHorn' : 'RightHorn', [s * 0.22, 2.73, -0.65], 0.10, 0.31, p.accent2, 4, [0, 0, s * -0.22], style);
  }

  // Webbed wings: one clear silhouette plus a contrasting angular inner panel.
  const wing = [[0.02, -0.17], [0.16, 0.43], [0.82, 0.91], [0.69, 0.44], [1.04, 0.12], [0.49, 0.19], [0.28, -0.24]];
  const inset = [[0.15, -0.03], [0.22, 0.36], [0.65, 0.65], [0.58, 0.32], [0.78, 0.17], [0.43, 0.13]];
  for (const s of [-1, 1]) {
    const mirror = arr => s < 0 ? [...arr].reverse().map(([x, y]) => [-x, y]) : arr;
    polyPlate(g, s < 0 ? 'LeftWing' : 'RightWing', [s * 0.43, 2.01, 0.15], mirror(wing), 0.105, p.dark, style, 'dark');
    polyPlate(g, s < 0 ? 'LeftWingMembrane' : 'RightWingMembrane', [s * 0.43, 2.01, 0.087], mirror(inset), 0.025, p.accent, style, 'metal');
    segment(g, s < 0 ? 'LeftWingRib' : 'RightWingRib', [s * 0.49, 2.00, 0.045], [s * 1.12, 2.79, 0.045], 0.045, 0.045, p.accent2, style, 'metal');
  }

  // Limbs use paired upper/lower masses and a clear ground contact plane.
  for (const s of [-1, 1]) for (const z of [-0.31, 0.35]) {
    const side = s < 0 ? 'L' : 'R'; const fore = z < 0 ? 'F' : 'B';
    box(g, `Dragon${side}${fore}UpperLeg`, [s * 0.48, 1.22, z], [0.27, 0.47, 0.31], p.base, style);
    box(g, `Dragon${side}${fore}Foot`, [s * 0.49, 0.91, z - 0.045], [0.31, 0.20, 0.37], p.dark, style, 'dark');
    if (z < 0) box(g, `Dragon${side}${fore}Claw`, [s * 0.49, 0.90, z - 0.20], [0.10, 0.09, 0.12], p.accent2, style, 'metal');
  }
  // Three visibly decreasing tail links make the silhouette read as a creature.
  box(g, 'TailRoot', [0, 1.54, 0.78], [0.42, 0.34, 0.49], p.base, style);
  box(g, 'TailMid', [0, 1.43, 1.16], [0.31, 0.25, 0.43], p.accent, style);
  polyPlate(g, 'TailBlade', [0, 1.37, 1.48], [[-0.14, 0.08], [0.14, 0.08], [0.18, 0], [0, -0.15], [-0.18, 0]], 0.18, p.dark, style, 'dark');
  for (let i = 0; i < 2; i++) cone(g, `BackSpine${i}`, [0, 2.02 - i * 0.045, -0.10 + i * 0.28], 0.075 - i * 0.008, 0.18, p.accent2, 4, [Math.PI / 2, 0, 0], style);
}

function makeHorse(g, p, prompt, style) {
  // Horse faces -Z; torso, neck, head and muzzle form one intentional profile.
  plate(g, 'HorseBarrel', [0, 1.57, 0.12], [0.94, 0.65, 1.40], p.base, style, 'base', 0.18);
  box(g, 'RumpPlate', [0, 1.64, 0.69], [0.89, 0.56, 0.38], p.accent, style);
  box(g, 'ChestMass', [0, 1.72, -0.46], [0.65, 0.68, 0.55], p.base, style);
  box(g, 'Neck', [0, 2.08, -0.61], [0.43, 0.93, 0.48], p.base, style, 'base', [-0.18, 0, 0]);
  plate(g, 'Head', [0, 2.59, -0.83], [0.48, 0.55, 0.48], p.light, style, 'metal', 0.20, [-0.09, 0, 0]);
  box(g, 'Muzzle', [0, 2.42, -1.11], [0.43, 0.24, 0.23], p.accent2, style, 'metal');
  for (const s of [-1, 1]) {
    cone(g, s < 0 ? 'LeftEar' : 'RightEar', [s * 0.16, 2.96, -0.79], 0.09, 0.30, p.dark, 4, [0, 0, s * 0.16], style);
    box(g, s < 0 ? 'LeftEye' : 'RightEye', [s * 0.245, 2.65, -1.035], [0.055, 0.065, 0.028], p.dark, style, 'dark');
    box(g, s < 0 ? 'LeftBridle' : 'RightBridle', [s * 0.21, 2.49, -1.045], [0.035, 0.28, 0.025], p.accent, style, 'metal');
  }
  plate(g, 'ManeCrest', [0, 2.47, -0.52], [0.25, 0.83, 0.32], p.accent, style, 'base', 0.16, [-0.23, 0, 0]);
  for (const z of [-0.35, 0.44]) for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R'; const fore = z < 0 ? 'F' : 'B';
    box(g, `Horse${side}${fore}UpperLeg`, [s * 0.32, 1.00, z], [0.24, 0.62, 0.25], p.base, style);
    box(g, `Horse${side}${fore}Joint`, [s * 0.32, 0.65, z - 0.015], [0.20, 0.11, 0.20], p.dark, style, 'dark');
    box(g, `Horse${side}${fore}Shin`, [s * 0.32, 0.43, z], [0.18, 0.37, 0.19], p.light, style, 'metal');
    box(g, `Horse${side}${fore}Hoof`, [s * 0.32, 0.20, z - 0.055], [0.29, 0.17, 0.30], p.dark, style, 'dark');
  }
  segment(g, 'TailUpper', [0, 1.56, 0.78], [0.04, 1.13, 1.14], 0.19, 0.19, p.accent, style);
  segment(g, 'TailTip', [0.04, 1.13, 1.14], [0.08, 0.94, 1.32], 0.14, 0.14, p.dark, style);
  if (/unicorn/i.test(prompt)) cone(g, 'UnicornHorn', [0, 2.85, -0.98], 0.085, 0.34, p.accent2, 5, [-0.25, 0, 0], style);
  if (/armou?r|knight|royal/i.test(prompt)) {
    plate(g, 'HorseBarding', [0, 1.63, -0.12], [0.75, 0.57, 0.09], p.dark, style, 'dark', 0.19);
    box(g, 'BardingEmblem', [0, 1.66, -0.177], [0.14, 0.19, 0.025], p.accent2, style, 'metal');
  }
}

function makeMarine(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const shark = /shark/.test(target), fish = /fish|koi|goldfish/.test(target);
  ico(g, 'MarineBody', [0, 1.62, 0.05], 0.82, p.base, [1.16, 0.84, 1.58], 1, style);
  ico(g, 'Belly', [0, 1.36, -0.03], 0.55, p.light, [1.02, 0.48, 1.34], 0, style, 'metal');
  plate(g, 'Snout', [0, 1.65, -1.10], [0.48, 0.25, 0.46], p.base, style, 'base', 0.18);
  for (const s of [-1, 1]) {
    box(g, s < 0 ? 'LeftEyeSocket' : 'RightEyeSocket', [s * 0.52, 1.91, -0.67], [0.14, 0.13, 0.05], p.dark, style, 'dark');
    box(g, s < 0 ? 'LeftEye' : 'RightEye', [s * 0.52, 1.92, -0.704], [0.065, 0.075, 0.02], p.glow, style, 'glow');
    polyPlate(g, s < 0 ? 'LeftPectoralFin' : 'RightPectoralFin', [s * 0.58, 1.41, -0.05], [[0, 0.16], [s * 0.64, -0.30], [s * 0.38, 0.30], [0.04 * s, 0.38]], 0.11, p.accent, style);
  }
  polyPlate(g, 'DorsalFin', [0, 2.24, 0.22], [[-0.12, -0.12], [0.02, 0.42], [0.22, 0.54], [0.18, -0.1]], 0.13, p.dark, style);
  polyPlate(g, 'TailFinLeft', [-0.18, 1.63, 1.27], [[0.13, 0.04], [-0.36, 0.40], [-0.20, -0.05]], 0.12, p.accent, style);
  polyPlate(g, 'TailFinRight', [0.18, 1.63, 1.27], [[-0.13, 0.04], [0.36, 0.40], [0.20, -0.05]], 0.12, p.accent, style);
  if (shark) {
    for (let i = 0; i < 4; i++) triangle(g, `Gill${i}`, [[-0.37 + i * 0.08, 1.63, -0.88], [-0.34 + i * 0.08, 1.46, -0.89], [-0.31 + i * 0.08, 1.63, -0.88]], p.light, style, 'metal');
  }
  if (fish && /tropical|clown|colorful/i.test(prompt)) {
    for (const z of [-0.40, 0.16, 0.62]) plate(g, `FishBand${z}`, [0, 1.65, z], [1.20, 1.30, 0.08], p.accent2, style, 'metal', 0.2, [0, 0, Math.PI / 2]);
  }
}

function makeOctopus(g, p, prompt, style) {
  ico(g, 'Mantle', [0, 2.12, 0.03], 0.73, p.base, [1.00, 1.10, 0.88], 1, style);
  plate(g, 'FaceMask', [0, 1.94, -0.58], [0.67, 0.37, 0.12], p.dark, style, 'dark', 0.22);
  for (const s of [-1, 1]) {
    box(g, s < 0 ? 'LeftEyeSocket' : 'RightEyeSocket', [s * 0.19, 2.04, -0.653], [0.16, 0.17, 0.04], p.accent2, style, 'metal');
    box(g, s < 0 ? 'LeftEye' : 'RightEye', [s * 0.19, 2.04, -0.681], [0.075, 0.095, 0.02], p.glow, style, 'glow');
  }
  // Six flared, two-link tentacles with clear spacing; the outer pair is widest.
  for (let i = 0; i < 6; i++) {
    const t = (i / 5) * 2 - 1;
    const x0 = t * 0.34, x1 = t * 0.78, x2 = t * (1.15 + (1 - Math.abs(t)) * 0.12);
    const y1 = 1.32 - Math.abs(t) * 0.09, y2 = 0.78 + Math.abs(t) * 0.08;
    const side = i < 3 ? 'L' : 'R';
    segment(g, `Tentacle${i + 1}Upper`, [x0, 1.64, 0.02], [x1, y1, -0.02], 0.23, 0.22, p.base, style);
    segment(g, `Tentacle${i + 1}Lower`, [x1, y1, -0.02], [x2, y2, -0.10], 0.17, 0.17, p.accent, style);
    box(g, `Tentacle${i + 1}Tip`, [x2, y2, -0.10], [0.13, 0.13, 0.14], p.light, style, 'metal');
  }
  if (/crown|king|royal/i.test(prompt)) {
    plate(g, 'CrownBand', [0, 2.70, 0], [0.56, 0.14, 0.49], p.accent2, style, 'metal');
    for (const x of [-0.20, 0, 0.20]) cone(g, `CrownPoint${x}`, [x, 2.83, 0], 0.06, 0.20, p.accent2, 4, [0, 0, x * -0.5], style);
  }
}

function makeRabbit(g, p, prompt, style) {
  plate(g,'RabbitBody',[0,1.14,0.12],[0.78,0.65,1.08],p.base,style,'base',0.18);
  ico(g,'RabbitHead',[0,1.68,-0.55],0.37,p.base,[0.92,1.02,0.88],1,style,'base');
  for(const side of [-1,1]) {
    plate(g,side<0?'RabbitEarL':'RabbitEarR',[side*0.16,2.12,-0.56],[0.15,0.62,0.12],p.base,style,'base',0.10,[0,0,side*0.18]);
    plate(g,side<0?'RabbitInnerEarL':'RabbitInnerEarR',[side*0.16,2.12,-0.632],[0.065,0.43,0.025],p.accent,style,'metal',0.03,[0,0,side*0.18]);
    box(g,side<0?'RabbitEyeL':'RabbitEye',[side*0.21,1.72,-0.86],[0.06,0.065,0.025],p.glow,style,'glow');
    for(const z of [-0.22,0.40]) plate(g,`RabbitLeg${side}_${z}`,[side*0.27,0.72,z],[0.25,0.42,0.27],p.base,style,'base',0.10);
  }
  ico(g,'RabbitTail',[0,1.08,0.72],0.16,p.light,[1,1,1],0,style,'metal');
  plate(g,'RabbitMuzzle',[0,1.50,-0.83],[0.26,0.18,0.19],p.light,style,'metal',0.08);
  if(/\b(?:wizard|magical|fantasy)\b/.test(prompt)) cone(g,'RabbitCharm',[0,2.48,-0.55],0.08,0.22,p.accent2,5,[0,0,0],style);
}

function makeFrog(g, p, prompt, style) {
  ico(g,'FrogBody',[0,0.91,0.10],0.62,p.base,[1.15,0.76,1.02],1,style,'base');
  plate(g,'FrogBelly',[0,0.76,-0.36],[0.62,0.36,0.12],p.light,style,'metal',0.12);
  for(const side of [-1,1]) {
    ico(g,side<0?'FrogEyeMountL':'FrogEyeMountR',[side*0.30,1.42,-0.26],0.20,p.base,[1,1,0.85],0,style,'base');
    ico(g,side<0?'FrogEyeL':'FrogEyeR',[side*0.30,1.43,-0.43],0.09,p.glow,[1,1,0.5],0,style,'glow');
    segment(g,`FrogFrontArm${side}`,[side*0.37,0.91,-0.12],[side*0.52,0.46,-0.30],0.15,0.15,p.base,style,'base');
    segment(g,`FrogHindThigh${side}`,[side*0.36,0.75,0.38],[side*0.67,0.52,0.61],0.25,0.22,p.accent,style,'base');
    segment(g,`FrogHindShin${side}`,[side*0.67,0.52,0.61],[side*0.46,0.30,0.23],0.13,0.14,p.base,style,'base');
    plate(g,`FrogFoot${side}`,[side*0.46,0.25,0.11],[0.32,0.10,0.30],p.dark,style,'dark',0.05);
  }
  box(g,'FrogSmile',[0,0.99,-0.50],[0.36,0.025,0.02],p.dark,style,'dark');
}

function makeSpider(g, p, prompt, style) {
  ico(g,'SpiderAbdomen',[0,1.15,0.42],0.43,p.base,[1.0,0.88,1.20],1,style,'base');
  ico(g,'SpiderHead',[0,1.15,-0.34],0.30,p.base,[1,0.92,0.88],1,style,'base');
  for(let i=0;i<4;i++) {
    const x=0.22+i*0.08, y=1.10-i*0.02;
    for(const side of [-1,1]) {
      segment(g,`SpiderLeg${side}_${i}Upper`,[side*0.20,y,0.04],[side*x,y+0.14,-0.02+i*0.18],0.075,0.075,p.dark,style,'dark');
      segment(g,`SpiderLeg${side}_${i}Lower`,[side*x,y+0.14,-0.02+i*0.18],[side*(0.70+i*0.06),0.33,-0.18+i*0.22],0.06,0.06,p.accent,style,'base');
    }
  }
  for(let i=0;i<4;i++) box(g,`SpiderEye${i}`,[-0.16+i*0.105,1.22,-0.60],[0.055,0.06,0.025],p.glow,style,'glow');
  if(/\bscorpion\b/.test(prompt)) { segment(g,'ScorpionTailA',[0,1.35,0.72],[0,1.68,0.94],0.10,0.10,p.accent,style); segment(g,'ScorpionTailB',[0,1.68,0.94],[0,1.97,0.75],0.08,0.08,p.base,style); cone(g,'ScorpionStinger',[0,2.06,0.70],0.07,0.20,p.dark,5,[0.3,0,0],style); }
  if(/\bbutterfly\b|\bmoth\b/.test(prompt)) for(const side of [-1,1]) { polyPlate(g,`WingUpper${side}`,[side*0.46,1.38,0.02],[[0,0],[side*0.55,0.36],[side*0.77,0.12],[side*0.38,-0.14]],0.06,p.accent,style); polyPlate(g,`WingLower${side}`,[side*0.38,0.93,0.02],[[0,0.10],[side*0.42,0.10],[side*0.55,-0.22],[side*0.22,-0.30]],0.06,p.base,style); }
}

function makeReptile(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text=String(prompt||'').toLowerCase();
  if(/\b(?:snake|serpent|python|cobra)\b/.test(target)) {
    const pts=[[-0.4,0.30,0.45],[-0.58,0.33,0.10],[-0.36,0.35,-0.23],[0.0,0.37,-0.40],[0.36,0.40,-0.20],[0.42,0.44,0.12],[0.20,0.48,0.36]];
    for(let i=0;i<pts.length-1;i++) segment(g,`SnakeBody${i}`,pts[i],pts[i+1],0.20-i*0.015,0.18-i*0.01,i%2?p.accent:p.base,style,'base');
    ico(g,'SnakeHead',pts[pts.length-1],0.20,p.base,[1,0.75,1],0,style,'base');
    for(const side of [-1,1]) box(g,`SnakeEye${side}`,[0.30+side*0.08,0.53,0.31],[0.05,0.055,0.025],p.glow,style,'glow');
    if(/\bcobra\b/.test(target)) plate(g,'CobraHood',[0.20,0.59,0.12],[0.54,0.42,0.08],p.accent,style,'base',0.08);
    return;
  }
  if(/\b(?:turtle|tortoise)\b/.test(target)) {
    plate(g,'TurtleShell',[0,1.02,0.10],[1.05,0.66,1.22],p.base,style,'base',0.21);
    plate(g,'TurtleShellTop',[0,1.36,0.08],[0.78,0.13,0.92],p.accent,style,'metal',0.15);
    plate(g,'TurtleHead',[0,0.97,-0.74],[0.40,0.34,0.48],p.base,style,'base',0.16);
    for(const side of [-1,1]) { box(g,`TurtleEye${side}`,[side*0.14,1.06,-0.96],[0.05,0.05,0.02],p.glow,style,'glow'); for(const z of [-0.35,0.45]) plate(g,`TurtleLeg${side}_${z}`,[side*0.42,0.58,z],[0.28,0.43,0.30],p.base,style,'base',0.12); }
    return;
  }
  plate(g,'ReptileTorso',[0,0.98,0.05],[0.66,0.45,1.35],p.base,style,'base',0.16);
  plate(g,'ReptileHead',[0,1.05,-0.72],[0.53,0.38,0.56],p.base,style,'base',0.16);
  plate(g,'ReptileSnout',[0,0.91,-1.03],[0.43,0.18,0.30],p.accent,style,'base',0.10);
  for(const side of [-1,1]) { box(g,`ReptileEye${side}`,[side*0.18,1.16,-0.92],[0.06,0.06,0.025],p.glow,style,'glow'); for(const z of [-0.35,0.40]) segment(g,`ReptileLeg${side}_${z}`,[side*0.24,0.89,z],[side*0.48,0.43,z-0.08],0.14,0.14,p.base,style,'base'); }
  for(let i=0;i<4;i++) plate(g,`ReptileTail${i}`,[0,0.93,0.76+i*0.22],[0.43-i*0.08,0.30-i*0.04,0.30],p.accent,style,'base',0.12);
  if(/\b(?:crocodile|alligator)\b/.test(text)) { plate(g,'CrocodileJaw',[0,0.80,-1.12],[0.62,0.12,0.63],p.light,style,'metal',0.04); for(let i=0;i<4;i++) cone(g,`CrocTooth${i}`,[ -0.22+i*0.145,0.86,-1.15],0.035,0.10,p.light,4,[0,0,0],style); }
}

function makeLargeMammal(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text=String(prompt||'').toLowerCase();
  const elephant=/elephant/.test(target), pig=/\bpig\b|boar/.test(target), cow=/cow|bull|ox|buffalo|goat|sheep|ram/.test(target), giraffe=/giraffe/.test(target), bear=/bear|panda|koala/.test(target);
  plate(g,'MammalTorso',[0,1.20,0.12],[elephant?1.18:0.95,0.82,1.45],p.base,style,'base',0.18);
  plate(g,'MammalChest',[0,1.30,-0.43],[0.70,0.64,0.45],p.accent,style,'base',0.15);
  plate(g,'MammalHead',[0,giraffe?2.04:1.72,-0.70],[elephant?0.76:0.62,elephant?0.76:0.60,0.58],p.base,style,'base',0.16);
  if(elephant) { segment(g,'ElephantTrunk',[0,1.66,-0.97],[0,1.10,-1.12],0.18,0.18,p.base,style,'base'); segment(g,'ElephantTrunkTip',[0,1.10,-1.12],[0.11,1.02,-1.15],0.12,0.12,p.accent,style,'base'); for(const side of [-1,1]) cone(g,`ElephantTusk${side}`,[side*0.26,1.43,-1.00],0.075,0.30,p.light,5,[0.4,0,side*0.35],style); }
  else if(pig) { plate(g,'PigSnout',[0,1.61,-1.03],[0.40,0.25,0.20],p.accent,style,'base',0.07); for(const side of [-1,1]) box(g,`PigNostril${side}`,[side*0.09,1.62,-1.14],[0.045,0.07,0.02],p.dark,style,'dark'); }
  else if(cow) { plate(g,'Muzzle',[0,1.51,-1.00],[0.42,0.27,0.22],p.light,style,'metal',0.10); for(const side of [-1,1]) cone(g,`Horn${side}`,[side*0.24,2.06,-0.63],0.10,0.28,p.light,5,[0,0,side*0.35],style); if(/\bsheep\b/.test(text)) for(let i=0;i<5;i++) ico(g,`WoolPuff${i}`,[(i-2)*0.20,1.74,0.04],0.20,p.light,[1,0.85,0.9],0,style,'metal'); }
  else if(giraffe) { plate(g,'GiraffeNeck',[0,1.85,-0.52],[0.30,1.16,0.32],p.base,style,'base',0.10); for(let i=0;i<4;i++) plate(g,`GiraffeSpot${i}`,[(i%2?0.1:-0.1),1.43+i*0.2,-0.70],[0.10,0.10,0.025],p.accent2,style,'metal',0.02); }
  else if(bear) { plate(g,'MammalMuzzle',[0,1.54,-1.02],[0.38,0.23,0.28],p.light,style,'metal',0.10); if(/panda/.test(text)) { for(const side of [-1,1]) plate(g,`PandaEyePatch${side}`,[side*0.16,1.78,-0.95],[0.17,0.18,0.035],p.dark,style,'dark',0.04); } }
  for(const side of [-1,1]) { box(g,`MammalEye${side}`,[side*0.21,giraffe?2.13:1.81,-0.98],[0.06,0.06,0.025],p.glow,style,'glow'); for(const z of [-0.35,0.42]) { plate(g,`MammalLeg${side}_${z}`,[side*(elephant?0.40:0.34),0.74,z],[elephant?0.31:0.25,0.75,0.30],p.base,style,'base',0.12); plate(g,`MammalFoot${side}_${z}`,[side*(elephant?0.40:0.34),0.35,z-0.05],[0.34,0.15,0.34],p.dark,style,'dark',0.05); } }
  segment(g,'MammalTail',[0,1.27,0.77],[0.06,1.02,1.18],0.09,0.09,p.accent,style,'base');
}

function makeQuadruped(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  if (/rabbit|bunny|hare/i.test(prompt)) return makeRabbit(g, p, prompt, style);
  if (/frog|toad/i.test(target)) return makeFrog(g, p, prompt, style);
  if (/spider|scorpion|insect|beetle|butterfly|moth|bee|wasp/i.test(target)) return makeSpider(g, p, prompt, style);
  if (/snake|serpent|python|cobra|turtle|tortoise|lizard|gecko|crocodile|alligator/i.test(target)) return makeReptile(g, p, prompt, style);
  if (/elephant|cow|bull|ox|buffalo|goat|sheep|ram|pig|boar|giraffe|bear|panda|koala|deer|moose|camel|hippo|rhinoceros|rhino|monkey|gorilla|chimpanzee|kangaroo|otter|beaver/i.test(target)) return makeLargeMammal(g, p, prompt, style);
  if (/horse|unicorn|pony/i.test(target)) return makeHorse(g, p, prompt, style);
  if (/dinosaur|trex|t-rex|tyrannosaurus|triceratops|stegosaurus|raptor/i.test(target)) return makeDinosaur(g, p, prompt, style);
  if (/cat|kitten|tiger|lion|lynx|wolf|fox|dog|puppy|canine/i.test(target)) return makeFeline(g, p, prompt, style);
  if (/bird|owl|eagle|hawk|penguin|parrot|raven|duck|chicken/i.test(target)) return makeBird(g, p, prompt, style);
  if (/whale|fish|shark|dolphin/i.test(target)) return makeMarine(g, p, prompt, style);
  if (/octopus|squid/i.test(target)) return makeOctopus(g, p, prompt, style);
  if (/dragon|wyvern/i.test(target)) return makeDragon(g, p, prompt, style);

  // Fallback creature grammar: torso mass, forward head, muzzle, matched limbs,
  // and an articulated-looking tail. Avoids the old unrelated-cube silhouette.
  plate(g, 'CreatureTorso', [0, 1.62, 0.12], [0.95, 0.66, 1.35], p.base, style, 'base', 0.18);
  plate(g, 'CreatureRuff', [0, 1.83, -0.45], [0.72, 0.60, 0.54], p.accent, style, 'base', 0.18);
  plate(g, 'CreatureHead', [0, 2.15, -0.75], [0.60, 0.50, 0.52], p.base, style, 'base', 0.18);
  plate(g, 'Muzzle', [0, 1.98, -1.04], [0.43, 0.22, 0.25], p.light, style, 'metal', 0.18);
  for (const s of [-1, 1]) {
    box(g, s < 0 ? 'LeftEye' : 'RightEye', [s * 0.22, 2.19, -1.02], [0.075, 0.075, 0.025], p.glow, style, 'glow');
    plate(g, s < 0 ? 'LeftEar' : 'RightEar', [s * 0.22, 2.48, -0.70], [0.17, 0.28, 0.15], p.dark, style, 'dark', 0.18, [0, 0, s * -0.20]);
    for (const z of [-0.31, 0.37]) {
      plate(g, `Leg${s}${z}`, [s * 0.39, 0.92, z], [0.27, 0.73, 0.28], p.base, style, 'base', 0.13);
      plate(g, `Foot${s}${z}`, [s * 0.40, 0.48, z - 0.06], [0.34, 0.18, 0.39], p.dark, style, 'dark', 0.13);
    }
  }
  segment(g, 'TailRoot', [0, 1.60, 0.77], [0.08, 1.40, 1.22], 0.24, 0.23, p.accent, style);
  segment(g, 'TailTip', [0.08, 1.40, 1.22], [0.16, 1.52, 1.52], 0.15, 0.15, p.base, style);
  if (/spike|armou?r|dinosaur/i.test(prompt)) for (let i = 0; i < 3; i++) cone(g, `BackSpike${i}`, [0, 2.02, 0.06 + i * 0.3], 0.09, 0.2, p.accent2, 4, [Math.PI / 2, 0, 0], style);
}

function makeWeapon(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text = String(prompt || '').toLowerCase();
  const subject = target;
  const isAxe = /\b(?:axe|battleaxe|hatchet)\b/.test(subject);
  const isHammer = /\b(?:hammer|mace|warhammer)\b/.test(subject);
  const isBow = /\b(?:bow|crossbow)\b/.test(subject);
  const isGun = /\b(?:gun|pistol|rifle|blaster|laser\s+gun|shotgun)\b/.test(subject);
  const isPick = /\bpickaxe|pick\s*axe\b/.test(subject);
  const isDagger = /\b(?:dagger|knife)\b/.test(subject);
  const isStaff = /\b(?:magic staff|wizard staff|staff|wand)\b/.test(subject);
  const isShield = /\b(?:shield|buckler)\b/.test(subject);
  const isLauncher = /\b(?:rocket launcher|missile launcher)\b/.test(subject);

  // Separate construction grammars. Never silently turn a gun, bow or pickaxe
  // into a sword just because it was the previous generic weapon preset.
  if (isPick) return makeTool(g, p, prompt, style);
  if (isShield) {
    polyPlate(g,'ShieldOuter',[0,1.08,0],[[-0.42,0.46],[0.42,0.46],[0.49,0.12],[0.34,-0.22],[0,-0.57],[-0.34,-0.22],[-0.49,0.12]],0.16,p.dark,style,'dark');
    polyPlate(g,'ShieldFace',[0,1.08,-0.095],[[-0.34,0.37],[0.34,0.37],[0.39,0.10],[0.27,-0.16],[0,-0.45],[-0.27,-0.16],[-0.39,0.10]],0.045,p.base,style,'base');
    polyPlate(g,'ShieldBoss',[0,1.10,-0.13],[[-0.17,0.07],[0,0.22],[0.17,0.07],[0,-0.19]],0.04,p.accent2,style,'metal');
    for(const side of [-1,1]) plate(g,`ShieldRim${side}`,[side*0.41,1.08,-0.09],[0.045,0.45,0.035],p.accent,style,'metal',0.02,[0,0,side*0.12]);
    if(/royal|crest|emblem|ornate/i.test(text)) ico(g,'ShieldCrest',[0,1.30,-0.16],0.10,p.glow,[1,1,0.5],0,style,'glow');
    return;
  }
  if (isLauncher) {
    plate(g,'LauncherFrame',[0,1.13,0],[0.52,0.52,0.94],p.base,style,'base',0.12);
    for(const side of [-1,1]) {
      cylinder(g,`LauncherTube${side}`,[side*0.18,1.30,-0.48],0.12,0.14,0.96,p.dark,6,[Math.PI/2,0,0],style,'dark');
      cylinder(g,`LauncherMuzzle${side}`,[side*0.18,1.30,-0.99],0.12,0.12,0.12,p.metal,6,[Math.PI/2,0,0],style,'metal');
      polyPlate(g,`LauncherWarhead${side}`,[side*0.18,1.31,-0.75],[[-0.07,-0.13],[0.07,-0.13],[0.07,0.11],[0,0.20],[-0.07,0.11]],0.045,p.accent,style,'base');
    }
    plate(g,'LauncherGrip',[0,0.73,0.20],[0.22,0.42,0.29],p.dark,style,'dark',0.08);
    plate(g,'LauncherSight',[0,1.56,0.03],[0.24,0.10,0.17],p.accent2,style,'metal',0.04);
    return;
  }
  if (isStaff) {
    segment(g,'StaffShaft',[0,0.15,0],[0,2.02,0],0.09,0.09,p.dark,style,'dark');
    plate(g,'StaffGrip',[0,0.55,-0.02],[0.14,0.47,0.14],p.accent,style,'base',0.05);
    ico(g,'StaffOrb',[0,2.14,0],0.18,p.glow,[1,1,0.8],1,style,'glow');
    for(const side of [-1,1]) segment(g,`StaffOrbit${side}`,[0,1.86,0],[side*0.20,2.14,0],0.035,0.035,p.accent2,style,'metal');
    return;
  }
  if (isBow) {
    plate(g, 'BowGrip', [0, 1.04, 0], [0.13, 0.42, 0.14], p.dark, style, 'dark', 0.12);
    segment(g, 'BowUpperLimb', [0, 1.12, 0], [-0.24, 1.65, 0], 0.14, 0.16, p.base, style, 'base');
    segment(g, 'BowUpperTip', [-0.24, 1.65, 0], [-0.15, 2.02, 0], 0.075, 0.10, p.accent2, style, 'metal');
    segment(g, 'BowLowerLimb', [0, 0.96, 0], [-0.24, 0.43, 0], 0.14, 0.16, p.base, style, 'base');
    segment(g, 'BowLowerTip', [-0.24, 0.43, 0], [-0.15, 0.10, 0], 0.075, 0.10, p.accent2, style, 'metal');
    segment(g, 'BowString', [-0.15, 0.10, -0.015], [-0.15, 2.02, -0.015], 0.018, 0.018, p.light, style, 'metal');
    if (/crossbow/i.test(subject)) {
      plate(g, 'CrossbowStock', [0, 1.08, -0.10], [0.24, 1.02, 0.20], p.dark, style, 'dark', 0.10);
      plate(g, 'CrossbowRail', [0, 1.30, -0.18], [0.16, 0.90, 0.07], p.accent2, style, 'metal', 0.06);
      segment(g, 'CrossbowBow', [-0.60, 1.40, -0.12], [0.60, 1.40, -0.12], 0.12, 0.14, p.base, style, 'base');
      box(g, 'CrossbowBolt', [0, 1.44, -0.24], [0.04, 0.95, 0.035], p.light, style, 'metal');
    }
    return;
  }
  if (isGun) {
    const rifle = /rifle|shotgun/.test(subject);
    const blaster = /blaster|laser/.test(subject);
    plate(g, 'GunReceiver', [0, 1.22, 0], [rifle ? 0.34 : 0.38, 0.38, 0.58], p.base, style, 'base', 0.13);
    plate(g, 'GunSlide', [0, 1.43, -0.02], [rifle ? 0.31 : 0.34, 0.13, 0.56], p.accent2, style, 'metal', 0.06);
    segment(g, 'GunBarrel', [0, 1.34, -0.24], [0, 1.34, -0.95], 0.14, 0.14, p.dark, style, 'dark');
    cylinder(g, 'GunMuzzle', [0, 1.34, -0.99], 0.105, 0.105, 0.08, blaster ? p.glow : p.metal, 6, [Math.PI / 2, 0, 0], style, blaster ? 'glow' : 'metal');
    plate(g, 'GunGrip', [0, 0.88, 0.10], [0.22, 0.50, 0.28], p.dark, style, 'dark', 0.10, [0.16,0,0]);
    if (rifle) {
      segment(g, 'GunStock', [0, 1.23, 0.22], [0, 1.20, 0.88], 0.22, 0.25, p.dark, style, 'dark');
      plate(g, 'GunMagazine', [0, 0.91, -0.02], [0.20, 0.34, 0.25], p.accent, style, 'base', 0.08);
      plate(g, 'GunForegrip', [0, 1.10, -0.40], [0.18, 0.26, 0.20], p.dark, style, 'dark', 0.08);
    } else {
      plate(g, 'GunMagazine', [0, 0.99, -0.04], [0.18, 0.20, 0.22], p.accent, style, 'base', 0.06);
    }
    plate(g, 'GunSightRear', [0, 1.55, 0.06], [0.13, 0.06, 0.12], p.dark, style, 'dark');
    plate(g, 'GunSightFront', [0, 1.47, -0.55], [0.09, 0.05, 0.10], p.accent2, style, 'metal');
    if (blaster) box(g, 'GunEnergyCell', [0.205, 1.26, 0.06], [0.035, 0.18, 0.22], p.glow, style, 'glow');
    return;
  }

  plate(g, 'Pommel', [0, 0.38, 0], [0.24, 0.20, 0.23], p.accent2, style, 'metal', 0.18);
  plate(g, 'Grip', [0, 0.96, 0], [0.15, 0.93, 0.16], p.dark, style, 'dark', 0.15);
  for (let y = 0.70; y <= 1.18; y += 0.16) box(g, `GripWrap${y.toFixed(2)}`, [0, y, -0.09], [0.16, 0.035, 0.025], p.accent, style, 'metal');
  if (!isDagger) {
    plate(g, 'Guard', [0, 1.48, 0], [0.86, 0.15, 0.22], p.accent2, style, 'metal', 0.20);
    box(g, 'GuardGem', [0, 1.49, -0.125], [0.13, 0.10, 0.025], p.glow, style, 'glow');
  }
  if (isHammer) {
    plate(g, 'HammerHead', [0, 2.02, 0], [0.82, 0.54, 0.46], p.base, style, 'base', 0.17);
    plate(g, 'HammerFaceL', [-0.43, 2.02, 0], [0.12, 0.40, 0.38], p.accent2, style, 'metal');
    plate(g, 'HammerFaceR', [0.43, 2.02, 0], [0.12, 0.40, 0.38], p.accent2, style, 'metal');
  } else if (isAxe) {
    polyPlate(g, 'AxeBlade', [0.28, 2.08, 0], [[-0.02, 0.34], [0.30, 0.48], [0.52, 0.17], [0.55, -0.22], [0.25, -0.38], [-0.02, -0.25]], 0.17, p.base, style);
    polyPlate(g, 'AxeEdge', [0.29, 2.08, -0.094], [[0.24, 0.36], [0.52, 0.17], [0.55, -0.22], [0.25, -0.38], [0.34, -0.02]], 0.025, p.light, style, 'metal');
    box(g, 'AxeEtch', [0.39, 2.08, -0.112], [0.045, 0.28, 0.015], p.glow, style, 'glow');
  } else {
    const reach = isDagger ? 0.76 : 1.36;
    const bladeW = isDagger ? 0.16 : 0.24;
    polyPlate(g, isDagger ? 'DaggerBlade' : 'Blade', [0, isDagger ? 1.83 : 2.13, 0], [
      [-bladeW*0.84, -0.16], [-bladeW, reach*0.39], [-bladeW*0.48, reach*0.77], [0, reach], [bladeW*0.48, reach*0.77], [bladeW, reach*0.39], [bladeW*0.84, -0.16]
    ], 0.13, p.base, style);
    polyPlate(g, isDagger ? 'DaggerFacet' : 'BladeFacet', [0, isDagger ? 1.84 : 2.15, -0.072], [[-0.10, 0.04], [-0.08, reach*0.63], [0, reach*0.88], [0.08, reach*0.63], [0.10, 0.04]], 0.018, p.light, style, 'metal');
    if (!isDagger) box(g, 'BladeRune', [0, 2.40, -0.085], [0.035, 0.28, 0.012], p.glow, style, 'glow');
  }
  if (/royal|legendary|ancient|ornate/i.test(text)) {
    plate(g, 'PommelCrest', [0, 0.39, -0.14], [0.14, 0.12, 0.025], p.glow, style, 'glow');
    for (const side of [-1, 1]) box(g, `GuardEngraving${side}`, [side * 0.25, 1.50, -0.13], [0.08, 0.035, 0.02], p.dark, style, 'dark');
  }
}

function makeCar(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text = String(prompt || '').toLowerCase();
  if (/\b(?:train|locomotive|railcar|tram)\b/.test(target)) {
    plate(g,'TrainChassis',[0,0.63,0.05],[1.28,0.30,2.35],p.dark,style,'dark',0.06);
    plate(g,'TrainBoiler',[0,1.12,-0.30],[0.90,0.68,1.28],p.base,style,'base',0.15);
    plate(g,'TrainFrontPlate',[0,0.98,-0.98],[0.96,0.48,0.12],p.accent,style,'base',0.10);
    cylinder(g,'TrainSmokestack',[0,1.70,-0.66],0.13,0.18,0.38,p.dark,6,[0,0,0],style,'dark');
    plate(g,'TrainCabin',[0,1.46,0.74],[0.86,1.08,0.76],p.accent,style,'base',0.10);
    plate(g,'TrainCabWindow',[0,1.62,0.34],[0.54,0.47,0.035],p.glow,style,'glow',0.04);
    for(const side of [-1,1]) for(const z of [-0.70,0.03,0.76]) { cylinder(g,`TrainWheel${side}_${z}`,[side*0.70,0.43,z],0.22,0.22,0.14,p.dark,8,[0,0,Math.PI/2],style,'dark'); cylinder(g,`TrainHub${side}_${z}`,[side*0.79,0.43,z],0.09,0.09,0.025,p.accent2,6,[0,0,Math.PI/2],style,'metal'); }
    plate(g,'TrainCowcatcher',[0,0.58,-1.18],[1.02,0.20,0.22],p.metal,style,'metal',0.05);
    return;
  }
  if (/\btank\b/.test(target)) {
    for (const side of [-1,1]) {
      plate(g, `TankTrack${side}`, [side*0.73,0.48,0.06], [0.30,0.48,2.18], p.dark, style, 'dark', 0.10);
      for (let i=0;i<5;i++) cylinder(g,`TankRoadWheel${side}_${i}`,[side*0.90,0.48,-0.78+i*0.40],0.16,0.16,0.09,p.metal,6,[0,0,Math.PI/2],style,'metal');
    }
    plate(g,'TankLowerHull',[0,0.69,0],[1.30,0.50,1.98],p.base,style,'base',0.10);
    polyPlate(g,'TankUpperHull',[0,1.04,-0.05],[[-0.60,-0.80],[0.60,-0.80],[0.70,0.50],[0.45,0.78],[-0.45,0.78],[-0.70,0.50]],1.18,p.accent,style,'base');
    plate(g,'TankTurret',[0,1.43,0.18],[0.88,0.42,0.83],p.dark,style,'dark',0.12);
    segment(g,'TankCannon',[0,1.49,-0.18],[0,1.49,-1.20],0.16,0.16,p.metal,style,'metal');
    cylinder(g,'TankMuzzle',[0,1.49,-1.22],0.12,0.12,0.12,p.dark,6,[Math.PI/2,0,0],style,'dark');
    box(g,'TankHatch',[0,1.68,0.29],[0.36,0.07,0.33],p.accent2,style,'metal');
    return;
  }
  if (/\bbus\b/.test(target)) {
    plate(g,'BusChassis',[0,0.53,0.10],[1.62,0.27,3.05],p.dark,style,'dark',0.08);
    plate(g,'BusBody',[0,1.28,0.10],[1.72,1.34,3.10],p.base,style,'base',0.12);
    plate(g,'BusRoof',[0,1.99,0.10],[1.66,0.11,3.00],p.accent,style,'metal',0.05);
    plate(g,'BusFrontGlass',[0,1.58,-1.48],[1.25,0.43,0.035],p.glow,style,'glow',0.05);
    plate(g,'BusDestinationSign',[0,1.91,-1.505],[0.66,0.13,0.025],p.dark,style,'dark',0.02);
    for (const side of [-1,1]) {
      for(let i=0;i<4;i++) plate(g,`BusSideWindow${side}_${i}`,[side*0.872,1.58,-0.92+i*0.61],[0.025,0.43,0.45],p.glow,style,'glow',0.03);
      for(const z of [-0.96,1.08]) { cylinder(g,`BusWheel${side}_${z}`,[side*0.88,0.48,z],0.28,0.28,0.16,p.dark,8,[0,0,Math.PI/2],style,'dark'); cylinder(g,`BusHub${side}_${z}`,[side*0.975,0.48,z],0.12,0.12,0.03,p.accent2,6,[0,0,Math.PI/2],style,'metal'); }
    }
    plate(g,'BusBumper',[0,0.58,-1.58],[1.50,0.15,0.14],p.metal,style,'metal',0.05);
    return;
  }
  if (/\btractor\b/.test(target)) {
    plate(g,'TractorChassis',[0,0.60,0.05],[1.08,0.30,1.95],p.dark,style,'dark',0.08);
    plate(g,'TractorHood',[0,0.99,-0.48],[1.02,0.57,1.08],p.base,style,'base',0.10);
    plate(g,'TractorGrille',[0,0.94,-1.04],[0.47,0.32,0.035],p.dark,style,'dark',0.03);
    for(let i=0;i<4;i++) box(g,`TractorGrilleBar${i}`,[-0.16+i*0.105,0.94,-1.065],[0.025,0.24,0.02],p.metal,style,'metal');
    plate(g,'TractorCabRoof',[0,1.92,0.32],[0.98,0.12,0.90],p.accent,style,'metal',0.05);
    for(const side of [-1,1]) {
      plate(g,`TractorCabPillar${side}`,[side*0.43,1.52,0.32],[0.10,0.72,0.10],p.dark,style,'dark',0.03);
      plate(g,`TractorRearWheel${side}`,[side*0.68,0.48,0.60],[0.22,0.88,0.88],p.dark,style,'dark',0.12);
      cylinder(g,`TractorFrontWheel${side}`,[side*0.60,0.35,-0.80],0.28,0.28,0.17,p.dark,8,[0,0,Math.PI/2],style,'dark');
      cylinder(g,`TractorRearHub${side}`,[side*0.805,0.48,0.60],0.23,0.23,0.035,p.accent2,6,[0,0,Math.PI/2],style,'metal');
    }
    return;
  }
  plate(g, 'LowerChassis', [0, 0.58, 0], [1.52, 0.30, 2.42], p.dark, style, 'dark', 0.12);
  plate(g, 'MainBody', [0, 0.85, 0], [1.80, 0.46, 2.48], p.base, style, 'base', 0.14);
  plate(g, 'Hood', [0, 1.05, -0.78], [1.58, 0.20, 0.77], p.accent, style, 'base', 0.10);
  polyPlate(g, 'Cabin', [0, 1.36, 0.11], [[-0.62, -0.23], [0.62, -0.23], [0.45, 0.26], [0.30, 0.36], [-0.30, 0.36], [-0.45, 0.26]], 1.02, p.light, style, 'metal');
  plate(g, 'Windshield', [0, 1.39, -0.414], [0.88, 0.30, 0.045], p.dark, style, 'dark', 0.16);
  plate(g, 'WindshieldGlint', [0, 1.43, -0.442], [0.59, 0.055, 0.014], p.accent2, style, 'metal', 0.18);
  plate(g, 'RearWindow', [0, 1.40, 0.63], [0.82, 0.27, 0.045], p.dark, style, 'dark', 0.16);
  plate(g, 'FrontBumper', [0, 0.73, -1.28], [1.56, 0.15, 0.18], p.accent2, style, 'metal', 0.13);
  plate(g, 'RearBumper', [0, 0.73, 1.28], [1.56, 0.15, 0.18], p.accent2, style, 'metal', 0.13);
  for (const s of [-1, 1]) {
    box(g, s < 0 ? 'LeftHeadlight' : 'RightHeadlight', [s * 0.57, 0.98, -1.24], [0.26, 0.10, 0.035], p.glow, style, 'glow');
    box(g, s < 0 ? 'LeftTaillight' : 'RightTaillight', [s * 0.60, 0.97, 1.245], [0.22, 0.10, 0.035], '#F07866', style, 'glow');
    for (const z of [-0.78, 0.78]) {
      cylinder(g, `Wheel${s}${z}`, [s * 0.91, 0.53, z], 0.31, 0.31, 0.18, p.shadow, 6, [0, 0, Math.PI / 2], style, 'dark');
      cylinder(g, `Hub${s}${z}`, [s * 1.015, 0.53, z], 0.15, 0.15, 0.025, p.accent2, 4, [0, 0, Math.PI / 2], style, 'metal');
    }
    box(g, `SideStripe${s}`, [s * 0.91, 0.87, 0.0], [0.035, 0.06, 0.62], p.accent2, style, 'metal');
  }
  if (/truck|van/i.test(target)) {
    plate(g, 'CargoBed', [0, 1.20, 0.70], [1.38, 0.40, 0.78], p.base, style, 'base');
    box(g, 'CargoInset', [0, 1.42, 0.70], [0.98, 0.035, 0.48], p.dark, style, 'dark');
  }
}

function makeDinosaur(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const horned = /triceratops/.test(target) || (/dinosaur/.test(target) && /\bhorned\b/.test(prompt));
  const spined = /spike|spiny|stegosaurus|armou?r|dragon-like/i.test(prompt);
  plate(g, 'DinoTorso', [0, 1.55, 0.08], [0.98, 0.72, 1.40], p.base, style, 'base', 0.19);
  plate(g, 'DinoChest', [0, 1.57, -0.53], [0.64, 0.53, 0.20], p.accent, style, 'base', 0.17);
  plate(g, 'DinoHead', [0, 1.96, -0.83], [0.70, 0.52, 0.67], p.base, style, 'base', 0.20);
  plate(g, 'DinoJaw', [0, 1.72, -1.07], [0.59, 0.20, 0.43], p.dark, style, 'dark', 0.16);
  for (const s of [-1, 1]) {
    box(g, s < 0 ? 'LeftEye' : 'RightEye', [s * 0.28, 2.03, -1.174], [0.085, 0.075, 0.025], p.glow, style, 'glow');
    plate(g, s < 0 ? 'LeftBrow' : 'RightBrow', [s * 0.28, 2.10, -1.15], [0.19, 0.07, 0.045], p.dark, style, 'dark', 0.2, [0, 0, s * 0.15]);
    if (horned) cone(g, s < 0 ? 'LeftHorn' : 'RightHorn', [s * 0.30, 2.29, -0.82], 0.09, 0.25, p.accent2, 4, [0, 0, s * -0.25], style);
  }
  for (const z of [-0.36, 0.42]) for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R', fore = z < 0 ? 'F' : 'B';
    plate(g, `Dino${side}${fore}Leg`, [s * 0.43, 1.01, z], [0.32, 0.62, 0.34], p.base, style, 'base', 0.15);
    plate(g, `Dino${side}${fore}Foot`, [s * 0.45, 0.65, z - 0.08], [0.39, 0.17, 0.40], p.dark, style, 'dark', 0.14);
    if (z < 0) for (let c = -1; c <= 1; c++) cone(g, `Dino${side}Claw${c}`, [s * 0.45 + c * 0.09, 0.61, z - 0.29], 0.035, 0.10, p.light, 4, [Math.PI / 2, 0, 0], style);
  }
  for (let i = 0; i < 4; i++) {
    const z = 0.62 + i * 0.30, scale = 1 - i * 0.17;
    plate(g, `TailLink${i}`, [0, 1.48 - i * 0.10, z], [0.40 * scale, 0.36 * scale, 0.45 * scale], i % 2 ? p.accent : p.base, style, 'base', 0.16);
  }
  if (spined) for (let i = 0; i < 5; i++) cone(g, `BackSpike${i}`, [0, 2.02, -0.33 + i * 0.30], 0.095 - i * 0.008, 0.24 - i * 0.015, p.accent2, 4, [Math.PI / 2, 0, 0], style);
  if (/stegosaurus/i.test(target)) for (let i = 0; i < 5; i++) polyPlate(g, `DorsalPlate${i}`, [0, 2.00, -0.28 + i * 0.28], [[-0.01, -0.10], [0.0, 0.22], [0.17, 0.38], [0.25, 0.08], [0.13, -0.12]], 0.12, p.accent2, style, 'metal');
}

function makeFeline(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const isCat = /cat|kitten|tiger|lion|lynx|panther|leopard/.test(target);
  const isWolf = /wolf|fox|dog|puppy|canine|corgi|shiba|husky/.test(target);
  const isLion = /lion/.test(target);
  plate(g, 'AnimalBody', [0, 1.28, 0.14], [0.83, 0.58, 1.30], p.base, style, 'base', 0.20);
  if (isLion) plate(g, 'ManeRuff', [0, 1.70, -0.40], [1.03, 0.88, 0.65], p.accent2, style, 'metal', 0.22);
  plate(g, 'AnimalNeck', [0, 1.55, -0.43], [0.43, 0.48, 0.47], p.base, style, 'base', 0.18);
  plate(g, 'AnimalHead', [0, 1.90, -0.67], [0.61, 0.49, 0.58], p.base, style, 'base', 0.22);
  plate(g, 'AnimalMuzzle', [0, 1.73, -0.98], [isWolf ? 0.40 : 0.31, 0.20, 0.31], p.light, style, 'metal', 0.18);
  box(g, 'Nose', [0, 1.80, -1.145], [0.085, 0.065, 0.035], p.dark, style, 'dark');
  for (const s of [-1, 1]) {
    box(g, s < 0 ? 'LeftEye' : 'RightEye', [s * 0.22, 1.96, -0.966], [0.075, 0.08, 0.025], p.glow, style, 'glow');
    polyPlate(g, s < 0 ? 'LeftEar' : 'RightEar', [s * 0.22, 2.23, -0.61], [[-0.12, -0.07], [-0.075, 0.20], [0.08, 0.24], [0.13, -0.06]], 0.13, p.dark, style, 'dark', [0, 0, s * -0.10]);
  }
  for (const z of [-0.36, 0.43]) for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R', fore = z < 0 ? 'F' : 'B';
    plate(g, `Animal${side}${fore}Leg`, [s * 0.30, 0.81, z], [0.23, 0.70, 0.25], p.base, style, 'base', 0.11);
    plate(g, `Animal${side}${fore}Paw`, [s * 0.31, 0.43, z - 0.07], [0.31, 0.18, 0.34], p.accent, style, 'base', 0.12);
  }
  segment(g, 'TailMain', [0, 1.42, 0.70], [isCat ? 0.04 : 0.20, 1.60, 1.10], 0.17, 0.17, p.base, style);
  segment(g, 'TailTip', [isCat ? 0.04 : 0.20, 1.60, 1.10], [isCat ? 0.05 : 0.34, isCat ? 1.83 : 1.47, 1.37], 0.12, 0.12, p.accent, style);
  if (isWolf) for (let i = 0; i < 3; i++) plate(g, `CheekTuft${i}`, [0, 1.77 - i * 0.08, -0.91], [0.36 - i * 0.04, 0.045, 0.03], p.light, style, 'metal');
  if (isCat && /whisker/i.test(prompt)) for (const s of [-1, 1]) for (let i = 0; i < 2; i++) segment(g, `Whisker${s}${i}`, [s * 0.18, 1.73 - i * 0.04, -1.12], [s * 0.44, 1.76 - i * 0.06, -1.10], 0.012, 0.012, p.light, style, 'metal');
}

function makeBird(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const penguin = /penguin/.test(target), owl = /owl/.test(target), eagle = /eagle|hawk/.test(target);
  ico(g, 'BirdBody', [0, 1.31, 0.02], 0.67, p.base, [0.91, 1.15, 0.82], 0, style);
  plate(g, 'BreastPatch', [0, 1.30, -0.52], [0.59, 0.74, 0.08], p.light, style, 'metal', 0.22);
  ico(g, 'BirdHead', [0, 2.03, -0.16], 0.40, p.base, [1.0, 0.93, 0.90], 0, style);
  const beakColor = p.accent2;
  polyPlate(g, 'Beak', [0, 1.97, -0.57], [[-0.13, 0.07], [0.13, 0.07], [0, -0.23]], 0.15, beakColor, style, 'metal');
  for (const s of [-1, 1]) {
    ico(g, s < 0 ? 'LeftEyeSocket' : 'RightEyeSocket', [s * 0.25, 2.07, -0.44], 0.105, p.dark, [1, 1, 0.40], 0, style, 'dark');
    ico(g, s < 0 ? 'LeftEye' : 'RightEye', [s * 0.25, 2.07, -0.485], 0.048, p.glow, [1, 1, 0.45], 0, style, 'glow');
    polyPlate(g, s < 0 ? 'LeftWing' : 'RightWing', [s * 0.48, 1.42, -0.03], [[-s * 0.05, 0.30], [s * 0.25, 0.16], [s * 0.44, -0.22], [s * 0.16, -0.34], [-s * 0.04, -0.05]], 0.12, p.accent, style, 'base');
    plate(g, s < 0 ? 'LeftFoot' : 'RightFoot', [s * 0.20, 0.42, -0.04], [0.25, 0.16, 0.35], p.accent2, style, 'metal', 0.10);
  }
  if (!penguin) for (let i = 0; i < 3; i++) polyPlate(g, `TailFeather${i}`, [(i - 1) * 0.15, 1.17, 0.59], [[-0.08, -0.12], [0, 0.18], [0.10, 0.32], [0.16, -0.12]], 0.07, i % 2 ? p.accent : p.base, style, 'base');
  if (owl) for (const s of [-1, 1]) plate(g, s < 0 ? 'LeftBrow' : 'RightBrow', [s * 0.25, 2.16, -0.47], [0.27, 0.06, 0.035], p.accent2, style, 'metal', 0.18, [0, 0, s * 0.2]);
  if (penguin) plate(g, 'PenguinBelly', [0, 1.12, -0.48], [0.50, 0.62, 0.07], '#E8ECE8', style, 'metal', 0.20);
  if (eagle) for (const s of [-1, 1]) polyPlate(g, s < 0 ? 'LeftWingTip' : 'RightWingTip', [s * 0.80, 1.30, 0], [[0, 0.1], [s * 0.23, -0.03], [s * 0.13, -0.25]], 0.1, p.dark, style, 'dark');
}

function makeSpacecraft(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const rocket = /rocket|missile/.test(target), ufo = /ufo|saucer|flying disc/.test(target);
  if (ufo) {
    cylinder(g, 'SaucerHull', [0, 1.25, 0], 0.66, 1.08, 0.32, p.base, 8, [0, 0, 0], style);
    cylinder(g, 'LowerHull', [0, 1.06, 0], 0.36, 0.61, 0.22, p.dark, 8, [0, 0, 0], style, 'dark');
    ico(g, 'Dome', [0, 1.48, 0], 0.53, p.light, [1, 0.58, 1], 1, style, 'metal');
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; box(g, `SaucerLight${i}`, [Math.cos(a) * 0.72, 1.19, Math.sin(a) * 0.72], [0.12, 0.06, 0.07], p.glow, style, 'glow', [0, -a, 0]); }
    return;
  }
  if (rocket) {
    cylinder(g, 'RocketBody', [0, 1.52, 0], 0.33, 0.40, 2.08, p.base, 6, [0, 0, 0], style);
    cone(g, 'NoseCone', [0, 2.75, 0], 0.34, 0.54, p.accent, 6, [Math.PI, 0, 0], style);
    for (const s of [-1, 1]) polyPlate(g, s < 0 ? 'LeftFin' : 'RightFin', [s * 0.32, 0.80, 0], [[0, 0.22], [s * 0.35, -0.08], [s * 0.30, -0.34], [0, -0.20]], 0.13, p.dark, style, 'dark');
    cylinder(g, 'EngineBell', [0, 0.35, 0], 0.23, 0.32, 0.29, p.dark, 6, [0, 0, 0], style, 'dark');
    cylinder(g, 'RocketGlow', [0, 0.16, 0], 0.16, 0.12, 0.13, p.glow, 6, [0, 0, 0], style, 'glow');
    box(g, 'RocketWindow', [0.18, 1.75, -0.33], [0.11, 0.14, 0.02], p.glow, style, 'glow');
    return;
  }
  plate(g, 'ShipKeel', [0, 0.86, 0], [0.72, 0.32, 2.38], p.dark, style, 'dark', 0.15);
  polyPlate(g, 'ShipHull', [0, 1.08, -0.04], [[-0.30, -0.30], [0.30, -0.30], [0.49, 0.12], [0.25, 0.76], [0, 1.05], [-0.25, 0.76], [-0.49, 0.12]], 1.38, p.base, style, 'base');
  plate(g, 'CockpitFrame', [0, 1.63, -0.28], [0.46, 0.39, 0.47], p.dark, style, 'dark', 0.18);
  plate(g, 'CockpitGlass', [0, 1.66, -0.535], [0.31, 0.22, 0.035], p.glow, style, 'glow', 0.16);
  for (const s of [-1, 1]) {
    polyPlate(g, s < 0 ? 'LeftWing' : 'RightWing', [s * 0.40, 0.97, 0.20], [[-s * 0.02, 0.35], [s * 0.72, 0.05], [s * 1.08, -0.28], [s * 0.18, -0.20]], 0.10, p.accent, style);
    cylinder(g, s < 0 ? 'LeftEngine' : 'RightEngine', [s * 0.39, 0.89, 0.75], 0.15, 0.20, 0.42, p.dark, 6, [Math.PI / 2, 0, 0], style, 'dark');
    cylinder(g, s < 0 ? 'LeftThruster' : 'RightThruster', [s * 0.39, 0.89, 0.99], 0.105, 0.12, 0.09, p.glow, 6, [Math.PI / 2, 0, 0], style, 'glow');
    plate(g, s < 0 ? 'LeftWingPanel' : 'RightWingPanel', [s * 0.78, 1.00, 0.15], [0.32, 0.035, 0.18], p.accent2, style, 'metal', 0.12);
  }
  if (/battle|armou?r|fighter/i.test(prompt)) for (const s of [-1, 1]) polyPlate(g, s < 0 ? 'LeftFin' : 'RightFin', [s * 0.20, 1.31, 0.83], [[0, -0.05], [s * 0.20, 0.28], [s * 0.24, -0.08]], 0.10, p.dark, style, 'dark');
}

function makeAircraft(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  if (/helicopter|heli/.test(target)) {
    plate(g, 'HeliCabin', [0, 1.23, -0.15], [0.74, 0.62, 1.06], p.base, style, 'base', 0.22);
    plate(g, 'HeliNose', [0, 1.12, -0.73], [0.55, 0.37, 0.42], p.accent, style, 'base', 0.21);
    plate(g, 'FrontGlass', [0, 1.31, -0.96], [0.38, 0.23, 0.035], p.glow, style, 'glow');
    segment(g, 'TailBoom', [0, 1.28, 0.35], [0, 1.45, 1.55], 0.16, 0.16, p.base, style);
    polyPlate(g, 'TailRotor', [0.0, 1.47, 1.55], [[-0.05, -0.30], [0.05, -0.30], [0.05, 0.30], [-0.05, 0.30]], 0.05, p.accent2, style, 'metal');
    cylinder(g, 'RotorMast', [0, 1.69, -0.1], 0.06, 0.06, 0.37, p.dark, 5, [0, 0, 0], style, 'dark');
    box(g, 'MainRotorBladeA', [0, 1.89, -0.1], [2.48, 0.055, 0.12], p.dark, style, 'dark');
    box(g, 'MainRotorBladeB', [0, 1.91, -0.1], [0.12, 0.055, 2.25], p.dark, style, 'dark');
    for (const s of [-1, 1]) box(g, s < 0 ? 'LeftSkid' : 'RightSkid', [s * 0.38, 0.75, -0.03], [0.09, 0.08, 1.18], p.dark, style, 'dark');
    return;
  }
  const jet = /jet|fighter|military/.test(target);
  plate(g, 'Fuselage', [0, 1.05, 0], [0.46, 0.44, 2.90], p.base, style, 'base', 0.15);
  polyPlate(g, 'NoseCone', [0, 1.06, -1.48], [[-0.23, -0.12], [0.23, -0.12], [0.15, 0.23], [0, 0.55], [-0.15, 0.23]], 0.35, p.accent, style, 'metal');
  plate(g, 'Cockpit', [0, 1.34, -0.48], [0.35, 0.22, 0.62], p.glow, style, 'glow', 0.18);
  for (const s of [-1, 1]) {
    polyPlate(g, s < 0 ? 'LeftWing' : 'RightWing', [s * 0.40, 0.98, 0.10], [[-s * 0.04, 0.36], [s * 1.03, 0.04], [s * 0.84, -0.23], [s * 0.08, -0.18]], 0.12, p.base, style);
    polyPlate(g, s < 0 ? 'LeftTailplane' : 'RightTailplane', [s * 0.17, 1.13, 1.03], [[-s * 0.03, 0.15], [s * 0.48, 0.01], [s * 0.35, -0.12], [0, -0.10]], 0.09, p.accent, style);
    cylinder(g, s < 0 ? 'LeftEngine' : 'RightEngine', [s * 0.18, 0.90, 1.40], 0.11, 0.14, 0.35, p.dark, 6, [Math.PI / 2, 0, 0], style, 'dark');
    if (jet) cylinder(g, s < 0 ? 'LeftExhaust' : 'RightExhaust', [s * 0.18, 0.90, 1.59], 0.08, 0.10, 0.10, p.glow, 6, [Math.PI / 2, 0, 0], style, 'glow');
  }
  polyPlate(g, 'VerticalTail', [0, 1.30, 1.14], [[-0.04, -0.15], [0.04, -0.15], [0.09, 0.40], [0, 0.52], [-0.09, 0.12]], 0.10, p.accent, style);
}

function makeBuilding(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text = String(prompt || '').toLowerCase();
  const castle = /castle|fortress|keep/.test(target), tower = /tower|lighthouse/.test(target);
  if (/\bbridge\b/.test(target)) {
    plate(g,'BridgeDeck',[0,1.05,0],[1.68,0.18,2.70],p.base,style,'base',0.06);
    for(const side of [-1,1]) {
      for(const z of [-0.92,0,0.92]) plate(g,`BridgePier${side}_${z}`,[side*0.64,0.55,z],[0.25,0.92,0.30],p.dark,style,'dark',0.06);
      plate(g,`BridgeRail${side}`,[side*0.78,1.42,0],[0.11,0.72,2.72],p.accent,style,'base',0.04);
      for(let i=0;i<7;i++) plate(g,`BridgeBaluster${side}_${i}`,[side*0.78,1.14,-1.16+i*0.38],[0.10,0.38,0.10],p.metal,style,'metal',0.03);
    }
    if(/stone|medieval|ancient/i.test(text)) for(const z of [-0.55,0.55]) polyPlate(g,`BridgeArch${z}`,[0,0.54,z],[[-0.42,-0.10],[-0.32,0.22],[0,0.38],[0.32,0.22],[0.42,-0.10]],0.10,p.accent,style,'base');
    return;
  }
  if (/\bwindmill\b/.test(target)) {
    plate(g,'WindmillTower',[0,0.98,0],[0.86,1.92,0.78],p.base,style,'base',0.12);
    cone(g,'WindmillRoof',[0,2.08,0],0.60,0.42,p.dark,5,[0,0,0],style);
    cylinder(g,'WindmillHub',[0,1.76,-0.48],0.13,0.13,0.18,p.accent2,6,[Math.PI/2,0,0],style,'metal');
    for(let i=0;i<4;i++){const a=i*Math.PI/2; segment(g,'WindmillBlade'+i,[0,1.76,-0.60],[Math.sin(a)*0.88,1.76+Math.cos(a)*0.88,-0.60],0.13,0.07,p.light,style,'metal');}
    plate(g,'WindmillDoor',[0,0.48,-0.41],[0.28,0.55,0.04],p.dark,style,'dark',0.04);
    return;
  }
  plate(g, 'Foundation', [0, 0.16, 0], [1.90, 0.30, 1.72], p.dark, style, 'dark', 0.10);
  plate(g, 'BuildingBody', [0, 1.12, 0], [1.55, 1.70, 1.32], p.base, style, 'base', 0.12);
  plate(g, 'DoorFrame', [0, 0.69, -0.675], [0.45, 0.92, 0.055], p.dark, style, 'dark', 0.12);
  plate(g, 'Door', [0, 0.67, -0.711], [0.32, 0.77, 0.03], p.accent, style, 'base', 0.10);
  box(g, 'DoorHandle', [0.10, 0.67, -0.735], [0.045, 0.08, 0.025], p.accent2, style, 'metal');
  for (const s of [-1, 1]) {
    plate(g, s < 0 ? 'LeftWindowFrame' : 'RightWindowFrame', [s * 0.43, 1.50, -0.687], [0.30, 0.38, 0.05], p.dark, style, 'dark', 0.10);
    box(g, s < 0 ? 'LeftWindow' : 'RightWindow', [s * 0.43, 1.50, -0.718], [0.20, 0.28, 0.02], p.glow, style, 'glow');
    box(g, s < 0 ? 'LeftWindowSill' : 'RightWindowSill', [s * 0.43, 1.30, -0.73], [0.36, 0.045, 0.07], p.accent2, style, 'metal');
  }
  if (castle) {
    plate(g, 'BattlementTop', [0, 2.03, 0], [1.82, 0.25, 1.56], p.dark, style, 'dark', 0.08);
    for (const x of [-0.66, -0.22, 0.22, 0.66]) for (const z of [-0.58, 0.58]) plate(g, `Merlon${x}${z}`, [x, 2.21, z], [0.22, 0.24, 0.22], p.base, style, 'base', 0.06);
    for (const x of [-0.73, 0.73]) for (const z of [-0.55, 0.55]) { plate(g, `TowerBase${x}${z}`, [x, 1.22, z], [0.40, 1.90, 0.4], p.accent, style, 'base', 0.10); cone(g, `TowerRoof${x}${z}`, [x, 2.35, z], 0.25, 0.38, p.dark, 4, [0,0,0], style); }
  } else if (tower) {
    plate(g, 'TowerCap', [0, 2.04, 0], [1.72, 0.17, 1.48], p.accent, style, 'base', 0.10);
    cone(g, 'TowerRoof', [0, 2.35, 0], 0.82, 0.62, p.dark, 5, [0, 0, 0], style);
  } else {
    polyPlate(g, 'Roof', [0, 2.00, 0], [[-0.94, -0.10], [0.94, -0.10], [0.0, 0.64]], 1.52, p.accent, style);
    plate(g, 'RoofRidge', [0, 2.61, 0], [0.12, 0.10, 1.60], p.accent2, style, 'metal', 0.06);
  }
  if (/snow|winter|ice/i.test(prompt)) plate(g, 'SnowCap', [0, 2.12, 0], [1.40, 0.08, 1.18], '#E8F3F7', style, 'metal', 0.12);
}

function makeFurniture(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  if (/bed|crib/.test(target)) {
    plate(g, 'BedBase', [0, 0.57, 0.12], [1.58, 0.30, 2.20], p.dark, style, 'dark', 0.10);
    plate(g, 'Mattress', [0, 0.78, 0.12], [1.62, 0.22, 2.16], p.base, style, 'base', 0.10);
    plate(g, 'Pillow', [0, 0.94, -0.72], [0.67, 0.16, 0.40], p.light, style, 'metal', 0.14);
    plate(g, 'Headboard', [0, 1.18, -0.98], [1.68, 0.85, 0.14], p.accent, style, 'base', 0.12);
    for (const s of [-1, 1]) plate(g, s < 0 ? 'LeftBedFoot' : 'RightBedFoot', [s * 0.62, 0.30, 0.90], [0.15, 0.48, 0.15], p.dark, style, 'dark');
    return;
  }
  if (/chair|seat|throne|stool|bench/.test(target)) {
    plate(g, 'SeatCushion', [0, 1.03, 0.02], [1.18, 0.20, 0.98], p.base, style, 'base', 0.14);
    plate(g, 'SeatInset', [0, 1.145, -0.01], [0.84, 0.035, 0.70], p.accent, style, 'metal', 0.12);
    plate(g, 'BackRest', [0, 1.76, 0.43], [1.18, 1.18, 0.18], p.base, style, 'base', 0.15, [0.06, 0, 0]);
    plate(g, 'BackPanel', [0, 1.80, 0.325], [0.78, 0.72, 0.035], p.dark, style, 'dark', 0.12);
    plate(g, 'BackEmblem', [0, 1.83, 0.300], [0.19, 0.24, 0.025], p.accent2, style, 'metal');
    for (const x of [-0.46, 0.46]) for (const z of [-0.32, 0.38]) plate(g, `ChairLeg${x}${z}`, [x, 0.52, z], [0.14, 0.88, 0.14], p.dark, style, 'dark', 0.08);
    if (/throne|royal/.test(target) || /royal|ornate/.test(prompt)) {
      for (const x of [-0.50, 0.50]) cone(g, `ThroneFinial${x}`, [x, 2.43, 0.42], 0.08, 0.26, p.accent2, 4, [0,0,0], style);
    }
  } else if (/sofa|couch|loveseat/.test(target)) {
    plate(g, 'SofaBase', [0, 0.72, 0.12], [1.72, 0.42, 1.05], p.base, style, 'base', 0.16);
    plate(g, 'SofaBack', [0, 1.22, 0.56], [1.72, 0.68, 0.25], p.dark, style, 'dark', 0.14);
    for (const s of [-1, 1]) plate(g, s < 0 ? 'LeftArm' : 'RightArm', [s * 0.79, 1.02, 0.13], [0.22, 0.58, 1.0], p.accent, style, 'base', 0.12);
    plate(g, 'SofaSeat', [0, 0.98, -0.02], [1.25, 0.16, 0.78], p.light, style, 'metal', 0.15);
    for (const s of [-1, 1]) plate(g, s < 0 ? 'LeftCushion' : 'RightCushion', [s * 0.34, 1.25, 0.41], [0.54, 0.42, 0.12], p.accent2, style, 'metal', 0.18);
  } else {
    plate(g, 'TableTop', [0, 1.10, 0], [1.65, 0.17, 1.12], p.base, style, 'base', 0.10);
    plate(g, 'Apron', [0, 0.94, 0], [1.28, 0.18, 0.75], p.dark, style, 'dark', 0.06);
    for (const x of [-0.65, 0.65]) for (const z of [-0.41, 0.41]) plate(g, `TableLeg${x}${z}`, [x, 0.49, z], [0.14, 0.83, 0.14], p.accent, style, 'base', 0.05);
    if (/desk|workbench/.test(target)) { plate(g, 'Drawer', [0, 0.81, -0.39], [0.58, 0.17, 0.07], p.base, style); box(g, 'DrawerPull', [0, 0.81, -0.435], [0.13, 0.035, 0.025], p.accent2, style, 'metal'); }
  }
}

function makeLantern(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const lamp = /lamp|streetlight|flashlight|torch/.test(target);
  cylinder(g, 'BaseFoot', [0, 0.16, 0], 0.38, 0.42, 0.22, p.dark, 6, [0,0,0], style, 'dark');
  if (lamp) {
    cylinder(g, 'LampPost', [0, 1.25, 0], 0.08, 0.10, 2.00, p.dark, 6, [0,0,0], style, 'dark');
    segment(g, 'LampArm', [0, 2.18, 0], [0.50, 2.24, 0], 0.10, 0.10, p.dark, style, 'dark');
    plate(g, 'LampHousing', [0.55, 2.10, 0], [0.55, 0.20, 0.38], p.accent2, style, 'metal', 0.15);
    box(g, 'LampGlow', [0.55, 1.97, 0], [0.35, 0.04, 0.22], p.glow, style, 'glow');
    return;
  }
  plate(g, 'LanternLower', [0, 0.47, 0], [0.58, 0.18, 0.58], p.accent2, style, 'metal', 0.12);
  plate(g, 'GlassChamber', [0, 0.91, 0], [0.47, 0.70, 0.47], p.glow, style, 'glow', 0.12);
  for (const x of [-0.25, 0.25]) for (const z of [-0.25, 0.25]) box(g, `LanternPost${x}${z}`, [x, 0.91, z], [0.045, 0.78, 0.045], p.dark, style, 'dark');
  plate(g, 'LanternCap', [0, 1.34, 0], [0.67, 0.16, 0.67], p.dark, style, 'dark', 0.12);
  cone(g, 'LanternCrown', [0, 1.50, 0], 0.24, 0.30, p.accent2, 4, [0,0,0], style);
  segment(g, 'LanternHandleLeft', [-0.22, 1.48, 0], [-0.17, 1.86, 0], 0.05, 0.05, p.dark, style, 'dark');
  segment(g, 'LanternHandleTop', [-0.17, 1.86, 0], [0.17, 1.86, 0], 0.05, 0.05, p.dark, style, 'dark');
  segment(g, 'LanternHandleRight', [0.17, 1.86, 0], [0.22, 1.48, 0], 0.05, 0.05, p.dark, style, 'dark');
}

function makeMushroom(g, p, prompt, style) {
  const magic = /magic|glow|fantasy|enchanted/i.test(prompt);
  cylinder(g, 'Stem', [0, 0.68, 0], 0.20, 0.28, 1.30, p.light, 6, [0,0,0], style, 'metal');
  ico(g, 'Cap', [0, 1.43, 0], 0.77, p.base, [1.16, 0.60, 1.08], 1, style);
  cylinder(g, 'GillRing', [0, 1.23, 0], 0.62, 0.62, 0.10, p.accent2, 8, [0,0,0], style, 'metal');
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ico(g, `CapSpot${i}`, [Math.cos(a) * 0.43, 1.72, Math.sin(a) * 0.40], magic ? 0.10 : 0.085, magic ? p.glow : p.light, [1,0.48,1], 0, style, magic ? 'glow' : 'metal'); }
  if (magic) for (const s of [-1, 1]) ico(g, s < 0 ? 'LeftFirefly' : 'RightFirefly', [s * 0.87, 1.52, 0], 0.065, p.glow, [1,1,1], 0, style, 'glow');
}

function makeFood(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text = String(prompt || '').toLowerCase();
  const hasExplicitColor = COLOR_MAP.some(([re]) => re.test(text));
  const natural = hex => hasExplicitColor ? p.base : hex;
  if (/\bbanana\b/.test(target)) {
    segment(g,'BananaMain',[0,0.58,0],[0.46,1.06,0],0.28,0.25,natural('#E8C94D'),style,'base');
    segment(g,'BananaTipA',[0,0.58,0],[-0.10,0.36,0],0.14,0.14,natural('#D9B844'),style,'base');
    segment(g,'BananaTipB',[0.46,1.06,0],[0.58,1.23,0],0.13,0.13,natural('#D9B844'),style,'base');
    return;
  }
  if (/\bwatermelon\b/.test(target)) {
    ico(g,'WatermelonBody',[0,0.82,0],0.67,natural('#3D8B58'),[1,0.90,1.08],1,style,'base');
    plate(g,'WatermelonCut',[0,0.82,-0.61],[0.78,0.78,0.045],natural('#D9565C'),style,'base',0.18);
    plate(g,'WatermelonRind',[0,0.82,-0.64],[0.82,0.82,0.025],natural('#2F6F47'),style,'dark',0.18);
    plate(g,'WatermelonFlesh',[0,0.82,-0.66],[0.70,0.70,0.025],natural('#D9565C'),style,'base',0.18);
    for(let i=0;i<5;i++) ico(g,`WatermelonSeed${i}`,[-0.24+i*0.12,0.79+(i%2)*0.15,-0.68],0.025,p.dark,[1,1,0.4],0,style,'dark');
    return;
  }
  if (/\b(?:orange|lemon|lime|pear|peach|plum|blueberry|grape|grapes|strawberry|cherry)\b/.test(target)) {
    const fruit = /lemon|lime/.test(target) ? '#D7CE4E' : /pear/.test(target) ? '#A6BE56' : /blueberry|plum/.test(target) ? '#555B96' : /grape/.test(target) ? '#76519B' : /strawberry|cherry/.test(target) ? '#C8494F' : /peach/.test(target) ? '#EBA06E' : '#E58B36';
    ico(g,'FruitBody',[0,0.76,0],0.62,natural(fruit),/lemon/.test(target)?[0.82,0.72,1.20]:[1,1,0.92],1,style,'base');
    segment(g,'FruitStem',[0,1.28,0],[0.04,1.43,0.02],0.06,0.06,p.dark,style,'dark');
    if(/strawberry/.test(target)) for(let i=0;i<7;i++){const x=((i%3)-1)*0.16;const y=0.55+Math.floor(i/3)*0.16;box(g,`StrawberrySeed${i}`,[x,y,-0.52],[0.025,0.035,0.015],p.light,style,'metal');}
    if(/grapes?/.test(target)) for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ico(g,`Grape${i}`,[Math.cos(a)*0.22,0.55+(i%2)*0.16,Math.sin(a)*0.20],0.23,natural(fruit),[1,1,1],0,style,'base');}
    polyPlate(g,'FruitLeaf',[0.13,1.35,0],[[0,0],[0.15,0.12],[0.28,0.04],[0.16,-0.08]],0.035,p.accent,style,'metal');
    return;
  }
  if (/\bpizza\b/.test(target)) {
    cylinder(g,'PizzaCrust',[0,0.43,0],0.72,0.72,0.17,natural('#D7A15B'),8,[0,0,0],style,'base');
    cylinder(g,'PizzaSauce',[0,0.53,0],0.66,0.66,0.035,natural('#B94B42'),8,[0,0,0],style,'base');
    cylinder(g,'PizzaCheese',[0,0.55,0],0.63,0.63,0.035,natural('#E6CE7C'),8,[0,0,0],style,'metal');
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ico(g,`Pepperoni${i}`,[Math.cos(a)*0.36,0.58,Math.sin(a)*0.36],0.12,p.accent,[1,0.35,1],0,style,'base');}
    return;
  }
  if (/\b(?:sandwich|burger|hamburger|hot dog)\b/.test(target)) {
    plate(g,'BreadTop',[0,0.91,0],[0.92,0.22,0.78],natural('#DDB36D'),style,'base',0.18);
    plate(g,'Filling',[0,0.75,0],[0.84,0.10,0.70],natural('#5F8E4F'),style,'base',0.05);
    plate(g,'Patty',[0,0.66,0],[0.82,0.12,0.68],natural('#82533E'),style,'base',0.06);
    plate(g,'BreadBottom',[0,0.53,0],[0.90,0.14,0.76],natural('#C89555'),style,'base',0.12);
    return;
  }
  if (/\b(?:cookie|donut|doughnut)\b/.test(target)) {
    cylinder(g,'DonutDough',[0,0.70,0],0.58,0.58,0.26,natural('#C89565'),8,[0,0,0],style,'base');
    if (/donut|doughnut/.test(target)) { const hole=new THREE.TorusGeometry(0.23,0.20,5,10); addMesh(g,'DonutHoleRing',hole,p.dark,[0,0.85,0],[1,1,0.65],[0,0,0],'dark',style); cylinder(g,'DonutIcing',[0,0.85,0],0.52,0.52,0.08,natural('#DB83B2'),8,[0,0,0],style,'base'); }
    else for(let i=0;i<7;i++) box(g,`CookieChip${i}`,[-0.32+(i%4)*0.21,0.84+Math.floor(i/4)*0.05,-0.43+(i%3)*0.20],[0.07,0.03,0.03],p.dark,style,'dark');
    return;
  }
  if (/cake|pie|tart/.test(target)) {
    cylinder(g, 'CakeBase', [0, 0.45, 0], 0.68, 0.68, 0.72, p.base, 8, [0,0,0], style);
    cylinder(g, 'IcingLayer', [0, 0.83, 0], 0.70, 0.70, 0.12, p.light, 8, [0,0,0], style, 'metal');
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ico(g, `Berry${i}`, [Math.cos(a)*0.34, 0.96, Math.sin(a)*0.34], 0.105, p.accent, [1,0.8,1], 0, style); }
    return;
  }
  if (/pumpkin|squash/.test(target)) {
    ico(g, 'PumpkinBody', [0, 0.75, 0], 0.75, p.base, [1.1, 0.92, 1.0], 1, style);
    cylinder(g, 'PumpkinStem', [0, 1.40, 0], 0.07, 0.10, 0.24, p.dark, 5, [0,0,0], style, 'dark');
    for (const s of [-1, 1]) plate(g, s < 0 ? 'LeftRib' : 'RightRib', [s*0.28,0.76,-0.42],[0.12,0.79,0.08],p.accent,style,'metal',0.12,[0,0,s*0.12]);
    if (/face|jack|halloween/i.test(prompt)) { for (const s of [-1,1]) polyPlate(g, s<0?'LeftEye':'RightEye',[s*0.19,0.83,-0.67],[[-0.07,0.04],[0.07,0.04],[0,-0.09]],0.03,p.dark,style,'dark'); polyPlate(g,'PumpkinMouth',[0,0.59,-0.68],[[-0.20,0.05],[-0.1,-0.02],[0,-0.06],[0.1,-0.02],[0.20,0.05]],0.025,p.dark,style,'dark'); }
    return;
  }
  ico(g, 'FoodBody', [0, 0.77, 0], 0.65, p.base, [1.0, 0.96, 0.88], 1, style);
  segment(g, 'FoodStem', [0, 1.31, 0], [0.05, 1.48, 0.03], 0.08, 0.08, p.dark, style, 'dark');
  if (/apple/.test(target)) polyPlate(g, 'Leaf', [0.14, 1.39, 0], [[0,0],[0.19,0.09],[0.30,0.01],[0.17,-0.08]],0.035,p.accent,style,'metal');
  if (/bread|loaf/.test(target)) plate(g, 'Crust', [0, 0.93, 0], [1.0, 0.56, 0.66], p.accent2, style, 'metal', 0.20);
}

function makeTool(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  if (/pickaxe|pick axe/i.test(target)) {
    plate(g, 'PickGrip', [0, 0.95, 0], [0.14, 1.38, 0.14], p.dark, style, 'dark', 0.12);
    polyPlate(g, 'PickHead', [0, 1.70, 0], [[-0.74,0.08],[-0.48,0.35],[0,0.20],[0.48,0.35],[0.74,0.08],[0.45,-0.12],[0,-0.03],[-0.45,-0.12]],0.16,p.base,style);
    plate(g, 'PickSocket', [0,1.68,-0.095],[0.28,0.26,0.035],p.accent2,style,'metal',0.12);
  } else if (/shovel|spade/i.test(target)) {
    plate(g, 'ShovelHandle', [0, 1.03, 0], [0.12, 1.64, 0.12], p.dark, style, 'dark', 0.10);
    plate(g, 'ShovelGrip', [0, 1.86, 0], [0.40, 0.12, 0.12], p.accent2, style, 'metal', 0.10);
    polyPlate(g, 'ShovelBlade', [0, 0.30, -0.01], [[-0.20,0.32],[0.20,0.32],[0.28,-0.03],[0,-0.34],[-0.28,-0.03]],0.14,p.base,style,'metal');
  } else if (/wrench|spanner/i.test(target)) {
    plate(g, 'WrenchHandle', [0, 0.79, 0], [0.15, 1.06, 0.13], p.dark, style, 'dark', 0.10);
    polyPlate(g, 'WrenchJaw', [0, 1.48, 0], [[-0.34,0.28],[-0.23,0.42],[-0.07,0.22],[0.07,0.22],[0.23,0.42],[0.34,0.28],[0.20,0.04],[-0.20,0.04]],0.15,p.metal,style,'metal');
    cylinder(g, 'WrenchHole', [0, 0.34, -0.08], 0.10, 0.10, 0.02, p.base, 6, [Math.PI/2,0,0], style);
  } else if (/\bdrill\b/.test(target)) {
    plate(g,'DrillBody',[0,1.08,0],[0.54,0.48,0.72],p.base,style,'base',0.12);
    segment(g,'DrillBarrel',[0,1.16,-0.31],[0,1.16,-0.85],0.15,0.15,p.metal,style,'metal');
    cone(g,'DrillBit',[0,1.16,-0.94],0.07,0.20,p.light,5,[Math.PI/2,0,0],style);
    plate(g,'DrillGrip',[0,0.68,0.13],[0.20,0.40,0.27],p.dark,style,'dark',0.08);
    box(g,'DrillTrigger',[0,0.87,-0.04],[0.08,0.16,0.06],p.accent2,style,'metal');
    box(g,'DrillBattery',[0,0.46,0.16],[0.36,0.16,0.36],p.dark,style,'dark');
  } else if (/\bsaw\b/.test(target)) {
    plate(g,'SawHandle',[0,1.20,0],[0.52,0.36,0.20],p.dark,style,'dark',0.16);
    polyPlate(g,'SawBlade',[0,0.63,0],[[-0.44,0.12],[0.44,0.12],[0.34,-0.28],[0.22,-0.16],[0.10,-0.28],[-0.02,-0.16],[-0.14,-0.28],[-0.26,-0.16],[-0.38,-0.28]],0.08,p.metal,style,'metal');
  } else if (/\b(?:pliers|tongs)\b/.test(target)) {
    segment(g,'PliersHandleL',[-0.07,0.94,0],[ -0.32,0.30,0],0.11,0.10,p.dark,style,'dark');
    segment(g,'PliersHandleR',[0.07,0.94,0],[0.32,0.30,0],0.11,0.10,p.dark,style,'dark');
    ico(g,'PliersJoint',[0,1.00,0],0.10,p.accent2,[1,1,0.65],0,style,'metal');
    segment(g,'PliersJawL',[-0.04,1.03,0],[-0.25,1.49,0],0.08,0.09,p.metal,style,'metal');
    segment(g,'PliersJawR',[0.04,1.03,0],[0.25,1.49,0],0.08,0.09,p.metal,style,'metal');
  } else if (/\bscrewdriver\b/.test(target)) {
    plate(g,'ScrewdriverHandle',[0,0.62,0],[0.27,0.48,0.25],p.accent,style,'base',0.12);
    segment(g,'ScrewdriverShaft',[0,0.91,0],[0,1.72,0],0.085,0.085,p.metal,style,'metal');
    polyPlate(g,'ScrewdriverTip',[0,1.79,0],[[-0.04,-0.08],[0.04,-0.08],[0.02,0.11],[-0.02,0.11]],0.06,p.light,style,'metal');
  } else {
    // Compact telescope / tool stand, chosen for unknown utility tool nouns.
    cylinder(g, 'ToolTube', [0, 1.20, 0], 0.18, 0.25, 1.00, p.base, 6, [0,0,0], style);
    cylinder(g, 'ToolLens', [0, 1.73, 0], 0.22, 0.22, 0.12, p.glow, 6, [0,0,0], style, 'glow');
    plate(g, 'ToolMount', [0, 0.63, 0], [0.35,0.22,0.35],p.dark,style,'dark');
    for (const s of [-1,1]) segment(g, `ToolTripod${s}`, [s*0.08,0.58,0],[s*0.37,0.08,s*0.18],0.07,0.07,p.accent2,style,'metal');
    if (/staff/i.test(prompt)) plate(g,'StaffGem',[0,1.92,0],[0.30,0.28,0.30],p.glow,style,'glow',0.18);
  }
}

function makeComputer(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text = String(prompt || '').toLowerCase();
  const laptop = /laptop|notebook/.test(target);
  const mobile = /\b(?:phone|smartphone|mobile phone)\b/.test(target);
  const tablet = /\btablet\b/.test(target);
  const camera = /\bcamera\b/.test(target);
  const keyboardOnly = /\bkeyboard\b/.test(target);
  const console = /\b(?:console|gaming pc|game console)\b/.test(target);
  if (mobile || tablet) {
    const width = tablet ? 1.18 : 0.68, height = tablet ? 1.55 : 1.28;
    plate(g, tablet ? 'TabletBody' : 'PhoneBody', [0, height / 2 + 0.18, 0], [width, height, 0.12], p.dark, style, 'dark', 0.10);
    plate(g, tablet ? 'TabletScreen' : 'PhoneScreen', [0, height / 2 + 0.18, -0.068], [width * 0.82, height * 0.82, 0.018], p.glow, style, 'glow', 0.05);
    box(g, tablet ? 'TabletHomeButton' : 'PhoneHomeButton', [0, 0.30, -0.082], [tablet ? 0.10 : 0.07, 0.035, 0.016], p.accent2, style, 'metal');
    cylinder(g, tablet ? 'TabletCamera' : 'PhoneCamera', [0, height + 0.19, -0.082], 0.035, 0.035, 0.018, p.accent2, 6, [Math.PI/2,0,0], style, 'metal');
    return;
  }
  if (camera) {
    plate(g, 'CameraBody', [0, 0.92, 0], [1.12, 0.78, 0.40], p.dark, style, 'dark', 0.12);
    plate(g, 'CameraGrip', [-0.39, 0.86, -0.18], [0.26, 0.56, 0.12], p.base, style, 'base', 0.08);
    cylinder(g, 'CameraLensOuter', [0.05, 0.93, -0.245], 0.34, 0.34, 0.16, p.accent2, 8, [Math.PI/2,0,0], style, 'metal');
    cylinder(g, 'CameraLensInner', [0.05, 0.93, -0.335], 0.24, 0.24, 0.06, p.dark, 8, [Math.PI/2,0,0], style, 'dark');
    cylinder(g, 'CameraGlass', [0.05, 0.93, -0.372], 0.16, 0.16, 0.02, p.glow, 8, [Math.PI/2,0,0], style, 'glow');
    box(g, 'CameraShutter', [0.37, 1.34, -0.04], [0.16, 0.08, 0.13], p.accent2, style, 'metal');
    plate(g, 'CameraViewfinder', [-0.02, 1.36, 0.05], [0.25, 0.14, 0.16], p.base, style, 'base', 0.05);
    return;
  }
  if (keyboardOnly) {
    plate(g, 'KeyboardBody', [0, 0.22, 0], [1.65, 0.12, 0.62], p.dark, style, 'dark', 0.08);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) box(g, `KeyboardKey${r}_${c}`, [-0.70 + c * 0.155, 0.293, -0.22 + r * 0.13], [0.12, 0.025, 0.09], (r === 0 && c === 9) ? p.accent2 : p.metal, style, 'metal');
    return;
  }
  if (console) {
    plate(g, 'ConsoleBody', [0, 0.48, 0], [1.40, 0.46, 0.78], p.dark, style, 'dark', 0.08);
    plate(g, 'ConsoleFace', [0, 0.49, -0.405], [1.12, 0.25, 0.035], p.base, style, 'base', 0.06);
    box(g, 'ConsoleStatus', [0.48, 0.50, -0.43], [0.09, 0.055, 0.018], p.glow, style, 'glow');
    plate(g, 'ConsoleSlot', [-0.12, 0.54, -0.43], [0.48, 0.035, 0.018], p.dark, style, 'dark', 0.02);
    for (let i=0; i<4; i++) box(g, `ConsoleVent${i}`, [-0.45 + i*0.11, 0.30, -0.414], [0.045,0.025,0.018], p.metal, style, 'metal');
    return;
  }
  if (laptop) {
    plate(g, 'LaptopBase', [0, 0.25, 0], [1.45, 0.09, 1.05], p.dark, style, 'dark', 0.10, [-0.06,0,0]);
    plate(g, 'KeyboardDeck', [0, 0.305, -0.04], [1.22, 0.025, 0.66], p.metal, style, 'metal', 0.05);
    for (let r=0;r<3;r++) for (let c=0;c<5;c++) box(g,`Key${r}${c}`,[-0.46+c*0.23,0.324,-0.22+r*0.13],[0.15,0.014,0.065],p.dark,style,'dark');
    plate(g, 'LaptopScreenShell', [0, 0.82, 0.45], [1.44, 0.94, 0.09], p.dark, style, 'dark', 0.10, [-0.10,0,0]);
    plate(g, 'LaptopScreen', [0, 0.82, 0.397], [1.20, 0.70, 0.025], p.glow, style, 'glow', 0.08, [-0.10,0,0]);
  } else {
    plate(g, 'MonitorShell', [0, 1.42, 0], [1.55, 1.02, 0.17], p.dark, style, 'dark', 0.12);
    plate(g, 'MonitorGlass', [0, 1.43, -0.095], [1.28, 0.74, 0.025], p.glow, style, 'glow', 0.08);
    plate(g, 'MonitorStand', [0, 0.79, 0.02], [0.15, 0.38, 0.15], p.metal, style, 'metal', 0.05);
    plate(g, 'MonitorFoot', [0, 0.56, -0.02], [0.65, 0.10, 0.38], p.dark, style, 'dark', 0.08);
    plate(g, 'MonitorLogo', [0, 0.96, -0.105], [0.13,0.045,0.012], p.accent2,style,'metal',0.02);
    plate(g, 'Keyboard', [0, 0.24, -0.48], [1.20, 0.08, 0.42], p.dark, style, 'dark', 0.06);
    box(g, 'Mouse', [0.80, 0.25, -0.48], [0.18, 0.12, 0.20], p.accent, style);
  }
}

function makeContainer(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text = String(prompt || '').toLowerCase();
  if (/\bvase\b/.test(target)) {
    cylinder(g, 'VaseFoot', [0,0.18,0], 0.28,0.30,0.18,p.accent2,8,[0,0,0],style,'metal');
    cylinder(g, 'VaseBody', [0,0.75,0], 0.49,0.31,1.02,p.base,8,[0,0,0],style,'base');
    cylinder(g, 'VaseNeck', [0,1.38,0], 0.23,0.31,0.35,p.accent,8,[0,0,0],style,'base');
    cylinder(g, 'VaseRim', [0,1.57,0], 0.26,0.26,0.09,p.accent2,8,[0,0,0],style,'metal');
  } else if (/\b(?:kettle|teapot)\b/.test(target)) {
    ico(g, 'KettleBody', [0,0.83,0],0.58,p.base,[1,0.90,0.90],1,style,'base');
    cylinder(g, 'KettleLid', [0,1.36,0],0.30,0.35,0.12,p.accent2,8,[0,0,0],style,'metal');
    ico(g, 'KettleKnob', [0,1.47,0],0.10,p.dark,[1,1,1],0,style,'dark');
    segment(g, 'KettleSpout', [0.42,0.94,-0.02],[0.75,1.18,-0.02],0.14,0.14,p.base,style,'base');
    const handle = new THREE.TorusGeometry(0.28,0.055,4,8);
    addMesh(g,'KettleHandle',handle,p.dark,[-0.50,0.94,0],[1,1.15,0.72],[Math.PI/2,0,0],'dark',style);
  } else if (/\b(?:bottle|flask|thermos)\b/.test(target)) {
    cylinder(g,'BottleBody',[0,0.64,0],0.34,0.40,1.10,p.base,8,[0,0,0],style,'base');
    cylinder(g,'BottleShoulder',[0,1.25,0],0.20,0.34,0.20,p.base,8,[0,0,0],style,'base');
    cylinder(g,'BottleNeck',[0,1.42,0],0.16,0.18,0.22,p.accent,8,[0,0,0],style,'base');
    cylinder(g,'BottleCap',[0,1.56,0],0.18,0.18,0.12,p.dark,8,[0,0,0],style,'dark');
    plate(g,'BottleLabel',[0,0.70,-0.37],[0.45,0.38,0.025],p.accent2,style,'metal',0.04);
  } else if (/\bjar\b/.test(target)) {
    cylinder(g,'JarBody',[0,0.67,0],0.42,0.42,1.12,p.light,8,[0,0,0],style,'base');
    cylinder(g,'JarRim',[0,1.26,0],0.30,0.32,0.12,p.accent2,8,[0,0,0],style,'metal');
    cylinder(g,'JarLid',[0,1.35,0],0.34,0.34,0.10,p.dark,8,[0,0,0],style,'dark');
    plate(g,'JarLabel',[0,0.72,-0.405],[0.48,0.31,0.025],p.accent,style,'metal',0.06);
  } else {
    // mugs and cups retain their recognizable hollow rim and handle
    cylinder(g, 'CupBody', [0, 0.84, 0], 0.49, 0.38, 1.12, p.base, 8, [0, 0, 0], style);
    cylinder(g, 'CupInterior', [0, 1.39, 0], 0.36, 0.36, 0.025, p.dark, 8, [0, 0, 0], style, 'dark');
    cylinder(g, 'CupRim', [0, 1.42, 0], 0.51, 0.51, 0.085, p.accent2, 8, [0, 0, 0], style, 'metal');
    const torus = new THREE.TorusGeometry(0.31, 0.075, 4, 8);
    addMesh(g, 'CupHandle', torus, p.dark, [0.51, 0.90, 0], [1, 1.08, 0.55], [Math.PI / 2, 0, 0], 'dark', style);
    plate(g, 'CupBadge', [0, 0.92, -0.397], [0.34, 0.30, 0.025], p.accent, style, 'metal', 0.22);
    box(g, 'CupBadgeMark', [0, 0.92, -0.414], [0.075, 0.15, 0.014], p.glow, style, 'glow');
  }
}

function makeMusicalInstrument(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text = String(prompt || '').toLowerCase();
  if (/\bpiano\b|\bkeyboard instrument\b/.test(target)) {
    plate(g,'PianoCase',[0,0.78,0],[1.60,0.42,0.66],p.dark,style,'dark',0.08);
    plate(g,'PianoTop',[0,1.02,0],[1.68,0.08,0.69],p.base,style,'base',0.05);
    for (let i=0;i<12;i++) box(g,`PianoWhiteKey${i}`,[-0.68+i*0.124,0.58,-0.36],[0.112,0.30,0.025],p.light,style,'metal');
    for (let i=0;i<11;i++) if (![2,6,9].includes(i%12)) box(g,`PianoBlackKey${i}`,[-0.62+i*0.124,0.68,-0.375],[0.065,0.18,0.025],p.dark,style,'dark');
    for (const x of [-0.62,0.62]) plate(g,`PianoLeg${x}`,[x,0.32,0.1],[0.13,0.55,0.14],p.accent2,style,'metal',0.05);
  } else if (/\bdrum(s)?\b/.test(target)) {
    cylinder(g,'DrumShell',[0,0.70,0],0.60,0.60,0.70,p.base,10,[Math.PI/2,0,0],style,'base');
    cylinder(g,'DrumHead',[0,0.70,-0.37],0.56,0.56,0.045,p.light,10,[Math.PI/2,0,0],style,'metal');
    cylinder(g,'DrumRearHead',[0,0.70,0.37],0.56,0.56,0.045,p.accent2,10,[Math.PI/2,0,0],style,'metal');
    for (let i=0;i<5;i++) { const a=i*Math.PI*2/5; box(g,`DrumLug${i}`,[Math.cos(a)*0.57,0.70+Math.sin(a)*0.57,0],[0.07,0.07,0.18],p.dark,style,'dark'); }
    if (/drum kit|drum set/i.test(target)) for (const x of [-0.68,0.68]) cylinder(g,`SideDrum${x}`,[x,1.0,0],0.28,0.28,0.32,p.accent,8,[Math.PI/2,0,0],style,'base');
  } else if (/\b(?:guitar|bass guitar)\b/.test(target)) {
    ico(g,'GuitarLowerBout',[0,0.60,0],0.47,p.base,[0.92,1.12,0.48],1,style,'base');
    ico(g,'GuitarUpperBout',[0,0.98,0],0.33,p.base,[0.88,0.82,0.44],1,style,'base');
    plate(g,'GuitarWaist',[0,0.80,0],[0.35,0.34,0.32],p.base,style,'base',0.08);
    plate(g,'GuitarPickguard',[0,0.80,-0.17],[0.25,0.34,0.025],p.accent2,style,'metal',0.06);
    segment(g,'GuitarNeck',[0,1.13,0],[0,2.12,0],0.13,0.14,p.dark,style,'dark');
    plate(g,'GuitarHeadstock',[0,2.20,0],[0.21,0.30,0.15],p.accent,style,'base',0.06);
    for (let i=0;i<5;i++) segment(g,`GuitarString${i}`,[-0.07+i*0.035,0.45,-0.19],[-0.07+i*0.035,2.30,-0.08],0.009,0.009,p.light,style,'metal');
    for (let i=0;i<4;i++) box(g,`GuitarFret${i}`,[-0.06,1.34+i*0.18,-0.084],[0.12,0.018,0.018],p.accent2,style,'metal');
  } else if (/\bviolin\b/.test(target)) {
    ico(g,'ViolinBody',[0,0.68,0],0.42,p.base,[0.63,1.10,0.38],1,style,'base');
    plate(g,'ViolinBridge',[0,0.68,-0.16],[0.22,0.06,0.03],p.accent2,style,'metal',0.02);
    segment(g,'ViolinNeck',[0,1.05,0],[0,1.95,0],0.10,0.12,p.dark,style,'dark');
    plate(g,'ViolinScroll',[0,2.03,0],[0.17,0.18,0.15],p.accent2,style,'metal',0.05);
    segment(g,'ViolinBow',[-0.46,0.55,-0.05],[-0.38,1.92,-0.05],0.035,0.035,p.dark,style,'dark');
  } else {
    // Wind/brass instrument grammar: stepped tubing, bell flare, and mouthpiece.
    segment(g,'HornMainTube',[0,0.48,0],[0,1.46,0],0.10,0.10,p.base,style,'base');
    cylinder(g,'HornBell',[0,1.55,0],0.32,0.12,0.28,p.accent2,8,[0,0,0],style,'metal');
    cylinder(g,'HornMouthpiece',[0,0.30,0],0.07,0.10,0.18,p.dark,6,[0,0,0],style,'dark');
    for (let i=0;i<3;i++) plate(g,`HornValve${i}`,[(i-1)*0.14,0.90,0.08],[0.08,0.20,0.07],p.accent,style,'metal',0.03);
    if (/\bflute\b/.test(target)) for (let i=0;i<6;i++) cylinder(g,`FluteHole${i}`,[-0.05+i*0.10,0.98,-0.055],0.025,0.025,0.015,p.dark,5,[Math.PI/2,0,0],style,'dark');
  }
}

function makeSportsEquipment(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const text = String(prompt || '').toLowerCase();
  if (/\b(?:basketball|football|soccer ball|volleyball|tennis ball)\b/.test(target)) {
    const basketball = /basketball/.test(target), soccer = /soccer/.test(target), tennis = /tennis ball/.test(target);
    ico(g, 'BallBody', [0,0.82,0], 0.65, p.base, [1,1,1], 2, style, 'base');
    if (basketball) { for (const r of [-0.38,0,0.38]) box(g,`BallSeamV${r}`,[r,0.82,-0.52],[0.025,1.0,0.025],p.dark,style,'dark',[0,0,r]); box(g,'BallSeamH',[0,0.82,-0.58],[1.0,0.025,0.025],p.dark,style,'dark'); }
    else if (soccer) { for(let i=0;i<5;i++){const a=i*Math.PI*2/5; polyPlate(g,`SoccerPanel${i}`,[Math.cos(a)*0.25,0.82+Math.sin(a)*0.22,-0.55],[[-0.12,-0.1],[0.08,-0.12],[0.14,0.04],[0,0.13],[-0.12,0.04]],0.025,p.dark,style,'dark');} }
    else if (tennis) for(let s of [-1,1]) plate(g,`TennisSeam${s}`,[s*0.26,0.82,-0.52],[0.035,0.64,0.02],p.light,style,'metal',0.01,[0,0,s*0.35]);
    return;
  }
  if (/\b(?:tennis racket|racket)\b/.test(target)) {
    const ring = new THREE.TorusGeometry(0.42,0.055,4,10);
    addMesh(g,'RacketHead',ring,p.accent,[0,1.42,0],[0.83,1.2,0.62],[Math.PI/2,0,0],'base',style);
    segment(g,'RacketHandle',[0,0.98,0],[0,0.42,0],0.10,0.10,p.dark,style,'dark');
    for(let i=-2;i<=2;i++) segment(g,`RacketStringV${i}`,[i*0.12,0.98,-0.03],[i*0.12,1.86,-0.03],0.012,0.012,p.light,style,'metal');
    for(let i=0;i<5;i++) segment(g,`RacketStringH${i}`,[ -0.34,1.08+i*0.17,-0.03],[0.34,1.08+i*0.17,-0.03],0.012,0.012,p.light,style,'metal');
  } else if (/\b(?:skateboard|surfboard)\b/.test(target)) {
    polyPlate(g,'BoardDeck',[0,0.58,0],[[-0.40,-0.95],[0.40,-0.95],[0.50,-0.65],[0.50,0.65],[0.40,0.95],[-0.40,0.95],[-0.50,0.65],[-0.50,-0.65]],0.13,p.base,style);
    for(const s of [-1,1]) { plate(g,`BoardTruck${s}`,[0,0.46,s*0.55],[0.60,0.08,0.10],p.metal,style,'metal',0.03); for(const x of [-0.37,0.37]) cylinder(g,`BoardWheel${s}_${x}`,[x,0.35,s*0.55],0.13,0.13,0.12,p.dark,6,[0,0,Math.PI/2],style,'dark'); }
    if (/surfboard/.test(target)) plate(g,'SurfboardStripe',[0,0.66,0],[0.08,0.02,1.3],p.accent2,style,'metal',0.01);
  } else {
    // Baseball/cricket bat as a tapered shaft; guard against the generic crate fallback.
    cylinder(g,'BatHandle',[0,0.52,0],0.075,0.085,0.72,p.dark,6,[0,0,0],style,'dark');
    cylinder(g,'BatBarrel',[0,1.25,0],0.12,0.20,0.95,p.base,8,[0,0,0],style,'base');
    cylinder(g,'BatKnob',[0,0.13,0],0.11,0.11,0.12,p.accent2,6,[0,0,0],style,'metal');
  }
}

function applyDetailProportions(root, prompt, variation = 0) {
  const scaleMeshes = (regex, sx, sy, sz) => root.traverse(o => { if (o.isMesh && regex.test(o.name)) { o.scale.x *= sx; o.scale.y *= sy; o.scale.z *= sz; } });
  if (/oversized head|big head|large head/i.test(prompt)) scaleMeshes(/HeadShell|Head$|DragonHead|AnimalHead|BirdHead|HelmetCrown/, 1.13, 1.12, 1.10);
  if (/long tail|extra long tail/i.test(prompt)) scaleMeshes(/Tail(Main|Mid|Root|Link|Upper|Tip|Blade)/, 1.0, 1.0, 1.18);
  if (/wide wings|huge wings|wide wing/i.test(prompt)) scaleMeshes(/Wing|Membrane|WingRib/, 1.20, 1.0, 1.0);
  if (/short legs|stubby legs/i.test(prompt)) scaleMeshes(/UpperLeg|Thigh|ShinArmor|Horse.*Leg|Dino.*Leg|Animal.*Leg/, 1.0, 0.82, 1.0);
  if (/long legs|long-legged/i.test(prompt)) scaleMeshes(/UpperLeg|Thigh|ShinArmor|Horse.*Leg|Dino.*Leg|Animal.*Leg/, 1.0, 1.18, 1.0);
  if (/bulky|chunky|heavy|tank/i.test(prompt)) scaleMeshes(/Torso|Body|Barrel|MainBody|Chest|Shell|Chassis/, 1.08, 1.0, 1.08);
  if (/sleek|slim|slender/i.test(prompt)) scaleMeshes(/Torso|Body|Barrel|MainBody|Chassis|Fuselage/, 0.90, 1.0, 1.02);
  if (variation % 4 === 1) scaleMeshes(/Tail(Main|Mid|Root|Link|Upper|Tip)/, 1.0, 1.0, 1.07);
  if (variation % 4 === 2) scaleMeshes(/Wing|Membrane|Tailplane/, 1.06, 1.0, 1.0);
  if (variation % 4 === 3) scaleMeshes(/ShoulderArmor|ChestArmor|ChestCoreFrame|HeadShell/, 1.045, 1.035, 1.0);
}


function makeBicycle(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  // Side-on X/Z wheel plane, deliberately compact and made from separated readable parts.
  for (const z of [-0.73, 0.73]) {
    cylinder(g, z < 0 ? 'FrontWheel' : 'RearWheel', [0, 0.53, z], 0.40, 0.40, 0.095, p.dark, 8, [0, 0, Math.PI / 2], style, 'dark');
    cylinder(g, z < 0 ? 'FrontHub' : 'RearHub', [0, 0.53, z < 0 ? z - 0.055 : z - 0.055], 0.10, 0.10, 0.12, p.accent2, 6, [0, 0, Math.PI / 2], style, 'metal');
  }
  const a = [0, 0.53, -0.73], b = [0, 1.05, -0.05], c = [0, 0.53, 0.73], d = [0, 0.65, 0.04];
  segment(g, 'FrameDownTube', a, d, 0.085, 0.085, p.base, style, 'metal');
  segment(g, 'FrameTopTube', d, b, 0.075, 0.075, p.base, style, 'metal');
  segment(g, 'FrameSeatStay', c, b, 0.07, 0.07, p.accent, style, 'metal');
  segment(g, 'FrameChainStay', a, c, 0.06, 0.06, p.dark, style, 'dark');
  segment(g, 'SeatPost', d, [0, 1.23, 0.04], 0.065, 0.065, p.dark, style, 'dark');
  plate(g, 'Seat', [0, 1.27, 0.08], [0.36, 0.09, 0.20], p.dark, style, 'dark', 0.12);
  segment(g, 'HandleStem', [0, 1.00, -0.05], [0, 1.23, -0.66], 0.06, 0.06, p.dark, style, 'dark');
  box(g, 'HandleBar', [0, 1.25, -0.67], [0.58, 0.07, 0.07], p.accent2, style, 'metal');
  cylinder(g, 'Crank', [0, 0.65, 0.04], 0.10, 0.10, 0.12, p.dark, 6, [Math.PI / 2, 0, 0], style, 'dark');
  segment(g, 'PedalArm', [0, 0.65, 0.04], [0, 0.52, 0.18], 0.045, 0.045, p.accent2, style, 'metal');
  box(g, 'Pedal', [0, 0.52, 0.18], [0.27, 0.05, 0.08], p.dark, style, 'dark');
}

function makeBoat(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  polyPlate(g, 'Hull', [0, 0.62, 0], [[-0.75, 0.30], [0.75, 0.30], [0.60, -0.10], [0.34, -0.38], [-0.34, -0.38], [-0.60, -0.10]], 2.0, p.base, style, 'base');
  plate(g, 'Deck', [0, 0.83, 0], [1.27, 0.12, 1.50], p.accent, style, 'base', 0.10);
  if (/sail|sailboat|pirate/i.test(prompt)) {
    cylinder(g, 'Mast', [0, 1.78, 0.12], 0.055, 0.065, 1.95, p.dark, 5, [0,0,0], style, 'dark');
    polyPlate(g, 'Sail', [0.33, 1.82, 0.12], [[-0.26,0.72],[0.32,0.54],[0.32,-0.60],[-0.26,-0.42]], 0.08, p.light, style, 'metal');
    if (/pirate/i.test(prompt)) plate(g, 'JollyEmblem', [0.35, 1.79, 0.067], [0.20,0.20,0.025],p.dark,style,'dark',0.05);
  } else {
    plate(g, 'Cabin', [0, 1.10, 0.20], [0.74, 0.48, 0.68], p.light, style, 'metal', 0.12);
    plate(g, 'CabinWindowFront', [0, 1.16, -0.15], [0.42,0.22,0.035],p.glow,style,'glow',0.05);
    for (const s of [-1,1]) plate(g, s < 0 ? 'LeftPorthole' : 'RightPorthole', [s*0.39,1.17,0.10],[0.11,0.11,0.035],p.glow,style,'glow',0.03);
  }
  cylinder(g, 'BowLight', [0, 0.94, -0.86], 0.065,0.065,0.04,p.accent2,5,[Math.PI/2,0,0],style,'glow');
}

function makeBackpack(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  plate(g, 'PackBody', [0, 1.03, 0.15], [1.02, 1.40, 0.52], p.base, style, 'base', 0.18);
  plate(g, 'PackFrontPocket', [0, 0.88, -0.16], [0.72, 0.57, 0.12], p.accent, style, 'base', 0.14);
  plate(g, 'PocketFlap', [0, 1.21, -0.24], [0.76, 0.20, 0.06], p.dark, style, 'dark', 0.10);
  plate(g, 'PackLatch', [0, 1.12, -0.285], [0.16, 0.13, 0.025], p.accent2, style, 'metal');
  for (const x of [-0.39,0.39]) { segment(g, `PackStrap${x}`, [x,1.54,0.31], [x*0.9,0.52,0.30],0.10,0.05,p.dark,style,'dark'); box(g,`PackSidePocket${x}`,[x*1.18,0.78,0.13],[0.16,0.43,0.29],p.accent,style); }
  if (/hiking|explorer|adventure/i.test(prompt)) plate(g,'SleepingRoll',[0,1.70,0.34],[0.80,0.23,0.22],p.light,style,'metal',0.10);
}

function makeRing(g, p, prompt, style) {
  const text = String(prompt || '').toLowerCase();
  const radius = /oversized|giant|statement/i.test(text) ? 0.72 : 0.58;
  const band = new THREE.TorusGeometry(radius, 0.105, 5, 12);
  addMesh(g, 'RingBand', band, p.base, [0, 0.88, 0], [1, 1, 0.72], [0, 0, 0], 'base', style);
  const set = /diamond|gem|crystal|jewel|ruby|sapphire|emerald/i.test(text);
  plate(g, 'RingSetting', [0, 0.88 + radius * 0.89, -0.02], [0.34, 0.18, 0.15], p.accent2, style, 'metal', 0.08);
  if (set) {
    const gem = /ruby|red/i.test(text) ? '#D64E5B' : /emerald|green/i.test(text) ? '#46B987' : /sapphire|blue/i.test(text) ? '#4B8BE8' : p.glow;
    polyPlate(g, 'RingGem', [0, 0.88 + radius + 0.08, -0.105], [[-0.10,0],[0,0.13],[0.10,0],[0.07,-0.09],[-0.07,-0.09]], 0.075, gem, style, 'glow');
  } else {
    ico(g, 'RingCrest', [0, 0.88 + radius + 0.055, -0.09], 0.11, p.accent, [1, 0.76, 0.45], 0, style, 'metal');
  }
  if (/royal|ornate|engraved|ancient/i.test(text)) {
    for (const side of [-1, 1]) box(g, `RingEngraving${side}`, [side * radius * 0.75, 0.88, -0.078], [0.04, 0.13, 0.015], p.light, style, 'metal');
  }
}

function makeFountain(g, p, prompt, style) {
  cylinder(g, 'FountainPlinth', [0, 0.18, 0], 0.94, 0.86, 0.22, p.dark, 8, [0,0,0], style, 'dark');
  cylinder(g, 'FountainBasinOuter', [0, 0.43, 0], 0.93, 0.82, 0.28, p.base, 8, [0,0,0], style, 'base');
  cylinder(g, 'FountainWater', [0, 0.585, 0], 0.77, 0.77, 0.035, p.glow, 10, [0,0,0], style, 'glow');
  cylinder(g, 'FountainColumn', [0, 0.94, 0], 0.20, 0.15, 0.65, p.accent, 6, [0,0,0], style, 'base');
  cylinder(g, 'FountainUpperBowl', [0, 1.34, 0], 0.55, 0.22, 0.20, p.accent2, 8, [0,0,0], style, 'metal');
  cylinder(g, 'FountainUpperWater', [0, 1.455, 0], 0.41, 0.41, 0.025, p.glow, 8, [0,0,0], style, 'glow');
  cylinder(g, 'FountainFinialStem', [0, 1.61, 0], 0.075, 0.10, 0.22, p.dark, 5, [0,0,0], style, 'dark');
  ico(g, 'FountainFinial', [0, 1.77, 0], 0.14, p.accent2, [0.9,1.1,0.9], 0, style, 'metal');
  if (/ornate|royal|medieval/i.test(prompt)) for (let i=0;i<4;i++) { const a=i*Math.PI/2; box(g,`FountainRimAccent${i}`,[Math.cos(a)*0.83,0.57,Math.sin(a)*0.83],[0.14,0.10,0.08],p.accent2,style,'metal',[0,-a,0]); }
}

function makeCarousel(g, p, prompt, style) {
  cylinder(g, 'CarouselBaseLower', [0,0.16,0], 1.05, 0.94, 0.20, p.dark, 10, [0,0,0], style, 'dark');
  cylinder(g, 'CarouselBaseTrim', [0,0.29,0], 0.97, 0.97, 0.08, p.accent2, 10, [0,0,0], style, 'metal');
  cylinder(g, 'CarouselDeck', [0,0.38,0], 0.92, 0.88, 0.14, p.base, 10, [0,0,0], style, 'base');
  cylinder(g, 'CarouselMast', [0,1.42,0], 0.095, 0.12, 2.05, p.dark, 6, [0,0,0], style, 'dark');
  cylinder(g, 'CarouselRoofRim', [0,2.40,0], 1.04, 1.04, 0.11, p.accent2, 10, [0,0,0], style, 'metal');
  cone(g, 'CarouselCanopy', [0,2.69,0], 1.00, 0.50, p.base, 8, [0,0,0], style);
  cylinder(g, 'CarouselCrown', [0,2.99,0], 0.19, 0.19, 0.12, p.accent2, 6, [0,0,0], style, 'metal');
  const count = /simple|minimal/i.test(prompt) ? 4 : 4;
  for (let i=0;i<count;i++) {
    const a=i*Math.PI*2/count, x=Math.sin(a)*0.62, z=Math.cos(a)*0.62;
    cylinder(g,`CarouselPole${i}`,[x,1.30,z],0.035,0.04,1.72,p.metal,5,[0,0,0],style,'metal');
    plate(g,`CarouselHorseBody${i}`,[x,0.92,z],[0.42,0.30,0.20],i%2?p.accent:p.light,style,'base',0.09,[0,-a,0]);
    plate(g,`CarouselHorseHead${i}`,[x,1.12,z-0.08],[0.17,0.24,0.17],i%2?p.light:p.accent,style,'base',0.07,[0,-a,0]);
    for (const s of [-1,1]) segment(g,`CarouselHorseLeg${i}_${s}`,[x+s*0.10,0.84,z],[x+s*0.10,0.60,z],0.035,0.04,p.dark,style,'dark');
  }
}

function makeDevice(g, p, prompt, style) {
  const text = String(prompt || '').toLowerCase();
  const handheld = /handheld|portable|grip|scanner|analyzer|detector/i.test(text);
  polyPlate(g, 'DeviceChassis', [0,0.91,0], [[-0.48,-0.45],[0.39,-0.45],[0.52,-0.27],[0.52,0.32],[0.38,0.47],[-0.38,0.47],[-0.52,0.30],[-0.52,-0.30]], 0.56, p.base, style, 'base');
  plate(g, 'DeviceFaceFrame', [0,1.00,-0.295], [0.70,0.53,0.07], p.dark, style, 'dark', 0.08);
  plate(g, 'DeviceDisplay', [0,1.03,-0.337], [0.52,0.33,0.025], p.glow, style, 'glow', 0.04);
  for (let i=0;i<3;i++) box(g,`DeviceStatus${i}`,[-0.28+i*0.12,0.66,-0.31],[0.055,0.045,0.02],i===0?p.accent2:p.metal,style,'metal');
  plate(g, 'DeviceTopModule', [0,1.49,0.02], [0.40,0.18,0.38], p.accent, style, 'base', 0.07);
  for (const side of [-1,1]) {
    plate(g,`DeviceSidePod${side}`,[side*0.49,0.90,0.03],[0.16,0.43,0.34],p.dark,style,'dark',0.06);
    if (/sensor|prong|probe|analyzer|scanner/i.test(text)) segment(g,`DeviceSensorProng${side}`,[side*0.30,1.44,-0.03],[side*0.40,1.82,-0.03],0.055,0.055,p.metal,style,'metal');
  }
  if (handheld) {
    plate(g,'DeviceGrip',[0,0.37,0.20],[0.25,0.47,0.32],p.dark,style,'dark',0.08,[0.16,0,0]);
    plate(g,'DeviceGripInset',[0,0.37,0.02],[0.12,0.29,0.025],p.accent2,style,'metal',0.02);
  }
  for(let i=0;i<3;i++) box(g,`DeviceVent${i}`,[-0.19+i*0.19,1.32,0.293],[0.10,0.025,0.02],p.accent2,style,'metal');
}

function makeSpool(g, p, prompt, style) {
  cylinder(g, 'SpoolCore', [0,0.97,0], 0.32,0.32,1.28,p.base,8,[0,0,0],style,'base');
  cylinder(g, 'SpoolLowerFlange', [0,0.39,0], 0.69,0.69,0.16,p.dark,8,[0,0,0],style,'dark');
  cylinder(g, 'SpoolUpperFlange', [0,1.57,0], 0.69,0.69,0.16,p.accent,8,[0,0,0],style,'base');
  for(let i=0;i<5;i++) { const a=i*Math.PI*2/5; segment(g,`SpoolWinding${i}`,[Math.cos(a)*0.34,0.60,Math.sin(a)*0.34],[Math.cos(a)*0.34,1.33,Math.sin(a)*0.34],0.045,0.045,p.accent2,style,'metal'); }
  cylinder(g, 'SpoolAxle', [0,1.73,0], 0.11,0.11,0.22,p.metal,6,[0,0,0],style,'metal');
}

function makeTransportPod(g, p, prompt, style) {
  ico(g,'PodHull',[0,0.99,0],0.79,p.base,[1.22,0.86,1.48],1,style,'base');
  plate(g,'PodNose',[0,0.96,-0.72],[0.78,0.46,0.22],p.accent,style,'base',0.14);
  plate(g,'PodCanopy',[0,1.21,-0.60],[0.58,0.36,0.12],p.glow,style,'glow',0.10);
  for(const side of [-1,1]) {
    cylinder(g,`PodThruster${side}`,[side*0.65,0.72,0.43],0.17,0.20,0.48,p.dark,6,[Math.PI/2,0,0],style,'dark');
    cylinder(g,`PodEngineGlow${side}`,[side*0.65,0.72,0.68],0.10,0.12,0.06,p.glow,6,[Math.PI/2,0,0],style,'glow');
    plate(g,`PodSidePanel${side}`,[side*0.67,0.94,0.02],[0.08,0.35,0.54],p.accent2,style,'metal',0.04);
  }
  plate(g,'PodHatch',[0,0.85,0.48],[0.44,0.48,0.08],p.dark,style,'dark',0.08);
  cylinder(g,'PodDockingPort',[0,0.52,-0.65],0.15,0.18,0.24,p.metal,6,[Math.PI/2,0,0],style,'metal');
}

function makeCustomObject(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  if (/\b(?:analyzer|scanner|detector|device|machine|generator|processor|fabricator|controller|terminal|instrument)\b/i.test(target)) return makeDevice(g,p,prompt,style);
  if (/\b(?:spool|coil|reel)\b/i.test(target)) return makeSpool(g,p,prompt,style);
  if (/\b(?:transport pod|pod|capsule|drone|probe|orbital module)\b/i.test(target)) return makeTransportPod(g,p,prompt,style);
  // Safer universal fallback: a designed faceted module with layered face, side
  // components and support geometry, never the old repetitive crate preset.
  const hash = [...target].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
  const wide = 0.82 + (hash % 4) * 0.08;
  const tall = 0.78 + ((hash >>> 3) % 4) * 0.08;
  const deep = 0.55 + ((hash >>> 6) % 3) * 0.10;
  polyPlate(g,'CustomMainHull',[0,0.96,0],[[-wide,-0.42],[wide,-0.42],[wide+0.08,-0.22],[wide+0.08,0.28],[wide-0.08,0.46],[-wide+0.08,0.46],[-wide-0.08,0.28],[-wide-0.08,-0.22]],deep,p.base,style,'base');
  plate(g,'CustomFrontArmor',[0,1.00,-deep*0.52],[wide*1.27,0.60,0.06],p.accent,style,'base',0.10);
  plate(g,'CustomFrontInset',[0,1.00,-deep*0.52-0.04],[wide*0.65,0.32,0.025],p.dark,style,'dark',0.06);
  box(g,'CustomCoreLight',[0,1.00,-deep*0.52-0.06],[wide*0.29,0.10,0.018],p.glow,style,'glow');
  for(const side of [-1,1]) {
    plate(g,`CustomSidePod${side}`,[side*(wide+0.10),0.93,0],[0.18,0.48,deep*0.72],p.dark,style,'dark',0.06);
    box(g,`CustomSideAccent${side}`,[side*(wide+0.10),0.95,-deep*0.38],[0.04,0.22,0.02],p.accent2,style,'metal');
    plate(g,`CustomSupport${side}`,[side*wide*0.65,0.35,0.12],[0.22,0.22,0.24],p.dark,style,'dark',0.05);
  }
  plate(g,'CustomTopModule',[0,1.52,0.02],[0.47,0.20,0.39],p.accent2,style,'metal',0.07);
  if (/sensor|antenna|signal|radio|wireless/i.test(String(prompt))) for(const side of [-1,1]) segment(g,`CustomAntenna${side}`,[side*0.25,1.60,0.02],[side*0.32,1.97,0.02],0.035,0.035,p.metal,style,'metal');
}

function makeProp(g, p, prompt, style) {
  const target = primaryTerm(prompt) || String(prompt || '').toLowerCase();
  const term = (...terms) => terms.some(word => new RegExp(`(?:^|\\b)${word.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?:\\b|$)`, 'i').test(target));
  // Route with whole terms, not substrings. The word "car" inside "carousel" must not create a car.
  if (term('rocket launcher','missile launcher','shield','sword','blade','dagger','katana','rapier','saber','sabre','axe','battleaxe','hatchet','hammer','mace','warhammer','pickaxe','pick axe','bow','crossbow','gun','pistol','rifle','blaster','laser gun','shotgun','magic staff','wizard staff','staff','wand','shield','buckler')) return makeWeapon(g,p,prompt,style);
  if (term('spaceship','space ship','starship','spacecraft','fighter ship','ufo','flying saucer','saucer','flying disc')) return makeSpacecraft(g,p,prompt,style);
  if (term('rocket','missile')) return makeSpacecraft(g,p,prompt,style);
  if (term('airplane','aeroplane','plane','jet aircraft','fighter jet','aircraft','helicopter','heli')) return makeAircraft(g,p,prompt,style);
  if (term('castle','fortress','keep','house','cottage','cabin','hut','building','home','shop','store','temple','church','barn','shed','bridge','windmill','tower','lighthouse')) return makeBuilding(g,p,prompt,style);
  if (term('table','desk','workbench','bookshelf','shelf','chair','seat','throne','stool','bench','bed','crib','sofa','couch','loveseat')) return makeFurniture(g,p,prompt,style);
  if (term('lantern','lamp','streetlight','flashlight','torch')) return makeLantern(g,p,prompt,style);
  if (term('mushroom','toadstool')) return makeMushroom(g,p,prompt,style);
  if (term('carousel','merry-go-round')) return makeCarousel(g,p,prompt,style);
  if (term('fountain','water fountain')) return makeFountain(g,p,prompt,style);
  if (term('ring','wedding band','signet ring')) return makeRing(g,p,prompt,style);
  if (term('cake','pie','tart','donut','doughnut','pumpkin','squash','apple','fruit','banana','orange','lemon','lime','pear','peach','plum','blueberry','grape','strawberry','cherry','watermelon','bread','loaf','cookie','pizza','sandwich','burger','hamburger','hot dog','food')) return makeFood(g,p,prompt,style);
  if (term('pickaxe','pick axe','shovel','spade','wrench','spanner','telescope','tool','drill','saw','pliers','tongs','screwdriver')) return makeTool(g,p,prompt,style);
  if (term('computer','monitor','laptop','notebook computer','terminal','gaming pc','keyboard','tablet','phone','smartphone','camera','console')) return makeComputer(g,p,prompt,style);
  if (term('guitar','bass guitar','piano','drum','violin','flute','trumpet','saxophone','instrument')) return makeMusicalInstrument(g,p,prompt,style);
  if (term('basketball','football','soccer ball','volleyball','tennis ball','tennis racket','racket','baseball bat','cricket bat','skateboard','surfboard')) return makeSportsEquipment(g,p,prompt,style);
  if (term('mug','cup','tankard','pot','kettle','teapot','bottle','flask','thermos','vase','jar')) return makeContainer(g,p,prompt,style);
  if (term('backpack','rucksack','jetpack','bag','suitcase')) return makeBackpack(g,p,prompt,style);
  if (term('bicycle','bike','mountain bike','motorcycle','motorbike','scooter')) return makeBicycle(g,p,prompt,style);
  if (term('boat','sailboat','ship','canoe','yacht','submarine')) return makeBoat(g,p,prompt,style);
  if (term('car','kart','truck','van','vehicle','sports car','race car','racecar','bus','ambulance','tractor','tank','train','locomotive','railcar','tram')) return makeCar(g,p,prompt,style);
  if (/tree|pine|fir|plant|bush|oak|palm|flower|rose|cactus|fern/i.test(target)) {
    if (!/\b(?:palm|cactus|flower|rose)\b/i.test(target)) cylinder(g, 'Trunk', [0, 0.72, 0], 0.14, 0.20, 1.42, p.dark, 5, [0, 0, 0], style, 'dark');
    if (/\bpalm\b/i.test(target)) {
      cylinder(g, 'PalmTrunk', [0,1.30,0], 0.12,0.22,2.55,p.dark,6,[0,0,0],style,'dark');
      for (let i=0;i<6;i++) { const a=i*Math.PI/3; const end=[Math.sin(a)*0.92,2.55-Math.abs(Math.cos(a))*0.16,Math.cos(a)*0.92]; segment(g,`PalmFrond${i}`,[0,2.52,0],end,0.13,0.10,p.base,style,'base'); segment(g,`PalmLeafTip${i}`,end,[end[0]*1.16,end[1]-0.25,end[2]*1.16],0.08,0.07,p.accent,style,'base'); }
    } else if (/\bcactus\b/i.test(target)) {
      cylinder(g,'CactusBody',[0,1.0,0],0.28,0.30,1.8,p.base,7,[0,0,0],style,'base');
      segment(g,'CactusArmL',[-0.22,0.80,0],[-0.48,0.80,0],0.14,0.14,p.base,style,'base'); segment(g,'CactusArmUpL',[-0.48,0.80,0],[-0.48,1.20,0],0.14,0.14,p.base,style,'base');
      segment(g,'CactusArmR',[0.22,1.02,0],[0.47,1.02,0],0.14,0.14,p.base,style,'base'); segment(g,'CactusArmUpR',[0.47,1.02,0],[0.47,1.34,0],0.14,0.14,p.base,style,'base');
    } else if (/\b(?:flower|rose)\b/i.test(target)) {
      segment(g,'FlowerStem',[0,0.90,0],[0,1.75,0],0.08,0.08,p.base,style,'base');
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5; ico(g,`FlowerPetal${i}`,[Math.cos(a)*0.20,1.90+Math.sin(a)*0.20,0],0.18,p.accent,[1,0.8,0.55],0,style,'base');}
      ico(g,'FlowerCenter',[0,1.90,-0.04],0.12,p.accent2,[1,1,0.5],0,style,'metal');
      plate(g,'FlowerLeafL',[-0.18,1.20,0],[0.30,0.10,0.14],p.accent,style,'base',0.04,[0,0,0.30]);
    } else if (/\bpine|\bfir/i.test(target)) {
      cone(g, 'CanopyLower', [0, 1.58, 0], 0.92, 1.22, p.base, 5, [0, 0, 0], style);
      cone(g, 'CanopyMiddle', [0, 2.15, 0], 0.70, 1.13, p.accent, 5, [0, 0, 0], style);
      cone(g, 'CanopyTop', [0, 2.68, 0], 0.47, 0.94, p.base, 5, [0, 0, 0], style);
    } else {
      ico(g, 'CanopyMain', [0, 1.93, 0], 0.80, p.base, [1, 1, 1], 1, style);
      ico(g, 'CanopySide', [0.36, 2.20, 0.04], 0.48, p.accent, [1, 1, 1], 0, style);
      ico(g, 'CanopyTop', [-0.20, 2.42, -0.02], 0.42, p.base, [1, 1, 1], 0, style);
    }
  } else if (/\b(?:mug|cup|tankard|pot)\b/i.test(target)) {
    return makeContainer(g, p, prompt, style);
  } else if (/\b(?:chair|seat|throne)\b/i.test(target)) {
    plate(g, 'SeatCushion', [0, 1.03, 0.02], [1.32, 0.20, 1.10], p.base, style, 'base', 0.14);
    plate(g, 'SeatInset', [0, 1.145, -0.01], [0.96, 0.035, 0.76], p.accent, style, 'metal', 0.14);
    plate(g, 'BackRest', [0, 1.78, 0.49], [1.30, 1.26, 0.20], p.base, style, 'base', 0.15, [0.08, 0, 0]);
    plate(g, 'BackPanel', [0, 1.82, 0.375], [0.82, 0.78, 0.045], p.dark, style, 'dark', 0.16);
    plate(g, 'BackEmblem', [0, 1.85, 0.345], [0.25, 0.32, 0.035], p.accent2, style, 'metal');
    for (const x of [-0.53, 0.53]) for (const z of [-0.34, 0.42]) plate(g, `ChairLeg${x}${z}`, [x, 0.52, z], [0.16, 0.88, 0.16], p.dark, style, 'dark', 0.10);
    if (/throne|royal/i.test(prompt)) {
      for (const x of [-0.56, 0.56]) cone(g, `ThroneFinial${x}`, [x, 2.51, 0.48], 0.09, 0.30, p.accent2, 4, [0, 0, 0], style);
    }
  } else if (/\bflag\b|\bbanner\b/i.test(target)) {
    cylinder(g, 'FlagPole', [0, 1.52, 0], 0.045, 0.055, 3.05, p.dark, 6, [0, 0, 0], style, 'dark');
    plate(g, 'FlagField', [0.43, 2.52, 0], [0.92, 0.66, 0.07], p.base, style, 'base', 0.06);
    box(g, 'FlagStripe', [0.43, 2.52, -0.043], [0.83, 0.13, 0.025], p.accent2, style, 'metal');
    plate(g, 'FlagEmblem', [0.43, 2.52, -0.06], [0.20, 0.22, 0.02], p.accent, style, 'metal');
    plate(g, 'PoleFoot', [0, 0.10, 0], [0.36, 0.20, 0.36], p.dark, style, 'dark');
  } else if (/\bsign\b|\bbillboard\b/i.test(target)) {
    plate(g,'SignPost',[0,0.96,0],[0.13,1.82,0.14],p.dark,style,'dark',0.05);
    plate(g,'SignBoard',[0,1.72,-0.02],[1.48,0.88,0.16],p.base,style,'base',0.08);
    plate(g,'SignInset',[0,1.72,-0.11],[1.20,0.61,0.035],p.dark,style,'dark',0.05);
    plate(g,'SignMessage',[0,1.72,-0.135],[0.72,0.15,0.025],p.accent2,style,'metal',0.03);
    for(const side of [-1,1]) box(g,`SignBolt${side}`,[side*0.62,1.98,-0.135],[0.05,0.05,0.02],p.metal,style,'metal');
  } else if (/\b(?:crate|box|chest|supply|loot)\b/i.test(target)) {
    plate(g, 'CrateBody', [0, 0.86, 0], [1.25, 1.12, 1.05], p.base, style, 'base', 0.12);
    plate(g, 'CrateLid', [0, 1.47, 0], [1.34, 0.18, 1.12], p.dark, style, 'dark', 0.10);
    plate(g, 'FrontInset', [0, 0.89, -0.535], [0.79, 0.56, 0.035], p.dark, style, 'dark', 0.13);
    plate(g, 'LockPlate', [0, 0.91, -0.563], [0.20, 0.29, 0.035], p.accent2, style, 'metal');
    box(g, 'LockGlow', [0, 0.91, -0.586], [0.06, 0.11, 0.016], p.glow, style, 'glow');
    for (const s of [-1, 1]) {
      box(g, `CornerBrace${s}`, [s * 0.52, 0.87, -0.546], [0.06, 0.89, 0.035], p.accent2, style, 'metal');
      box(g, `LidRivet${s}`, [s * 0.50, 1.49, -0.57], [0.06, 0.06, 0.025], p.light, style, 'metal');
    }
  } else if (/\b(?:rock|crystal|ore|gem)\b/i.test(target)) {
    ico(g, 'RockCore', [0, 0.84, 0], 0.78, p.base, [1.0, 0.90, 0.88], 0, style);
    polyPlate(g, 'CrystalFacetA', [0, 1.18, -0.25], [[-0.30, -0.10], [-0.18, 0.42], [0.02, 0.66], [0.26, 0.32], [0.30, -0.10]], 0.18, p.accent, style, 'metal');
    if (/crystal|gem/i.test(target)) {
      polyPlate(g, 'CrystalPoint', [0, 1.72, -0.25], [[-0.16, -0.04], [0, 0.43], [0.16, -0.04]], 0.16, p.glow, style, 'glow');
      for (const s of [-1, 1]) polyPlate(g, `SideShard${s}`, [s * 0.33, 1.21, -0.08], [[-0.12, -0.12], [0, 0.25], [0.13, -0.06]], 0.12, p.accent2, style, 'metal');
    }
  } else {
    makeCustomObject(g,p,prompt,style);
  }
}

// Resolve the *main noun*, not any object mentioned later as a prop or reference.
// This prevents a research snippet such as "flags were used by..." from turning
// a requested human into a flag. Earlier positive subject mentions win; negated
// mentions ("not a flag", "without a sword") are ignored.
const SUBJECT_RULES = [
  { subject: 'robot', category: 'character', re: /\b(?:humanoid\s+robot|robot|robots|mech|mecha|android|droid|automaton|cyborg|robotic\s+character)\b/gi },
  { subject: 'human', category: 'character', re: /\b(?:human\s+being|human|people|person|persons|man|men|woman|women|boy|boys|girl|girls|child|children|kid|kids|adult|teenager|teen|guy|lady|gentleman|villager|civilian|merchant|scientist|doctor|nurse|pilot|astronaut|explorer|pirate|barbarian|samurai|knight|ninja|warrior|soldier|police\s+officer|firefighter|avatar|npc|humanoid|character|figure|doll|mannequin|hero|wizard|mage|witch|archer|farmer|chef|cook|builder|ranger|monk|goblin|orc|elf|dwarf|zombie|skeleton|vampire|angel|demon|alien)\b/gi },
  { subject: 'spaceship', category: 'prop', re: /\b(?:spaceship|space\s+ship|starship|spacecraft|fighter\s+ship|ufo|flying\s+saucer)\b/gi },
  { subject: 'rocket launcher', category: 'weapon', re: /\b(?:rocket launcher|missile launcher)\b/gi },
  { subject: 'rocket', category: 'prop', re: /\b(?:rocket|missile)\b/gi },
  { subject: 'airplane', category: 'prop', re: /\b(?:airplane|aeroplane|plane|jet\s+aircraft|fighter\s+jet|aircraft)\b/gi },
  { subject: 'helicopter', category: 'prop', re: /\b(?:helicopter|heli)\b/gi },
  { subject: 'castle', category: 'prop', re: /\b(?:castle|fortress|keep)\b/gi },
  { subject: 'house', category: 'prop', re: /\b(?:house|cottage|cabin|hut|building|home|shop|store|temple|church|barn|shed|bridge|windmill)\b/gi },
  { subject: 'tower', category: 'prop', re: /\b(?:tower|lighthouse|windmill)\b/gi },
  { subject: 'dinosaur', category: 'creature', re: /\b(?:dinosaur|dino|t\s*[- ]?rex|tyrannosaurus|triceratops|stegosaurus|ankylosaurus|brachiosaurus|parasaurolophus|velociraptor|deinonychus|raptor|pterodactyl|pteranodon)\b/gi },
  { subject: 'dragon', category: 'creature', re: /\b(?:dragon|wyvern)\b/gi },
  { subject: 'cat', category: 'creature', re: /\b(?:cat|kitten|tiger|lion|lynx|panther|leopard)\b/gi },
  { subject: 'dog', category: 'creature', re: /\b(?:dog|puppy|wolf|fox|canine|corgi|shiba|husky|raccoon|bear)\b/gi },
  { subject: 'bird', category: 'creature', re: /\b(?:bird|owl|eagle|hawk|penguin|parrot|raven|duck|chicken|crow|phoenix)\b/gi },
  { subject: 'horse', category: 'creature', re: /\b(?:horse|unicorn|pony|donkey|zebra)\b/gi },
  { subject: 'shark', category: 'creature', re: /\b(?:shark)\b/gi },
  { subject: 'whale', category: 'creature', re: /\b(?:whale|dolphin)\b/gi },
  { subject: 'fish', category: 'creature', re: /\b(?:fish|koi|goldfish)\b/gi },
  { subject: 'octopus', category: 'creature', re: /\b(?:octopus|squid)\b/gi },
  { subject: 'frog', category: 'creature', re: /\b(?:frog|toad)\b/gi },
  { subject: 'monster', category: 'creature', re: /\b(?:monster|beast|troll|ogre|golem|gargoyle|slime|ghost|spirit|elemental)\b/gi },
  { subject: 'rabbit', category: 'creature', re: /\b(?:rabbit|bunny|hare)\b/gi },
  { subject: 'frog', category: 'creature', re: /\b(?:frog|toad)\b/gi },
  { subject: 'reptile', category: 'creature', re: /\b(?:snake|serpent|python|cobra|turtle|tortoise|lizard|gecko|crocodile|alligator)\b/gi },
  { subject: 'spider', category: 'creature', re: /\b(?:spider|scorpion|insect|beetle|butterfly|moth|bee|wasp)\b/gi },
  { subject: 'large mammal', category: 'creature', re: /\b(?:elephant|cow|bull|ox|buffalo|goat|sheep|ram|pig|boar|giraffe|bear|panda|koala|deer|moose|camel|hippo|rhinoceros|rhino|monkey|gorilla|chimpanzee|kangaroo|otter|beaver)\b/gi },
  { subject: 'sword', category: 'weapon', re: /\b(?:sword|blade|dagger|katana|rapier|saber|sabre)\b/gi },
  { subject: 'axe', category: 'weapon', re: /\b(?:axe|battleaxe|hatchet)\b/gi },
  { subject: 'hammer', category: 'weapon', re: /\b(?:hammer|mace|warhammer)\b/gi },
  { subject: 'pickaxe', category: 'weapon', re: /\b(?:pickaxe|pick\s+axe)\b/gi },
  { subject: 'bow', category: 'weapon', re: /\b(?:bow|crossbow)\b/gi },
  { subject: 'gun', category: 'weapon', re: /\b(?:gun|pistol|rifle|blaster|laser\s+gun|shotgun)\b/gi },
  { subject: 'staff', category: 'weapon', re: /\b(?:magic staff|wizard staff|staff|wand)\b/gi },
  { subject: 'shield', category: 'weapon', re: /\b(?:shield|buckler|kite shield|tower shield)\b/gi },
  { subject: 'car', category: 'prop', re: /\b(?:car|kart|truck|van|vehicle|sports\s+car|race\s+car|bus|ambulance|tractor|tank)\b/gi },
  { subject: 'bicycle', category: 'prop', re: /\b(?:bicycle|bike|mountain\s+bike|motorcycle|motorbike|scooter)\b/gi },
  { subject: 'boat', category: 'prop', re: /\b(?:boat|sailboat|ship|canoe|yacht|submarine)\b/gi },
  { subject: 'train', category: 'prop', re: /\b(?:train|locomotive|railcar|tram)\b/gi },
  { subject: 'computer', category: 'prop', re: /\b(?:computer|monitor|laptop|notebook\s+computer|terminal|gaming\s+pc|keyboard|tablet|phone|smartphone|camera|console)\b/gi },
  { subject: 'backpack', category: 'prop', re: /\b(?:backpack|rucksack|jetpack|bag|suitcase)\b/gi },
  { subject: 'table', category: 'prop', re: /\b(?:table|desk|workbench|bookshelf|shelf)\b/gi },
  { subject: 'chair', category: 'prop', re: /\b(?:chair|seat|throne|stool|bench)\b/gi },
  { subject: 'bed', category: 'prop', re: /\b(?:bed|bunk\s+bed|crib)\b/gi },
  { subject: 'sofa', category: 'prop', re: /\b(?:sofa|couch|loveseat)\b/gi },
  { subject: 'lantern', category: 'prop', re: /\b(?:lantern|lamp|streetlight|flashlight|torch)\b/gi },
  { subject: 'mushroom', category: 'prop', re: /\b(?:mushroom|toadstool)\b/gi },
  { subject: 'tree', category: 'prop', re: /\b(?:tree|pine|fir|oak|palm|plant|bush|flower|rose|cactus|fern)\b/gi },
  { subject: 'crystal', category: 'prop', re: /\b(?:crystal|gem|ore|diamond)\b/gi },
  { subject: 'rock', category: 'prop', re: /\b(?:rock|boulder|stone|pebble)\b/gi },
  { subject: 'ring', category: 'prop', re: /\b(?:ring|wedding band|signet ring)\b/gi },
  { subject: 'fountain', category: 'prop', re: /\b(?:fountain|water fountain)\b/gi },
  { subject: 'carousel', category: 'prop', re: /\b(?:carousel|merry-go-round)\b/gi },
  { subject: 'crate', category: 'prop', re: /\b(?:crate|chest|loot\s+box|supply\s+box|box|container)\b/gi },
  { subject: 'mug', category: 'prop', re: /\b(?:mug|cup|tankard|pot|kettle|bottle|vase|jar)\b/gi },
  { subject: 'cake', category: 'prop', re: /\b(?:cake|pie|tart|donut|doughnut|bread|loaf|cookie|pizza|sandwich|burger|hamburger|hot dog)\b/gi },
  { subject: 'pumpkin', category: 'prop', re: /\b(?:pumpkin|squash)\b/gi },
  { subject: 'apple', category: 'prop', re: /\b(?:apple|fruit|banana|pear|orange|lemon|lime|peach|plum|blueberry|grape|grapes|strawberry|cherry|watermelon)\b/gi },
  { subject: 'tool', category: 'prop', re: /\b(?:wrench|spanner|shovel|spade|telescope|tool|drill|saw|pliers|screwdriver)\b/gi },
  { subject: 'flag', category: 'prop', re: /\b(?:flag|banner)\b/gi },
  { subject: 'sign', category: 'prop', re: /\b(?:sign|billboard)\b/gi },
  { subject: 'musical instrument', category: 'prop', re: /\b(?:guitar|piano|drum|violin|flute|trumpet|saxophone|instrument)\b/gi },
  { subject: 'sports equipment', category: 'prop', re: /\b(?:basketball|football|soccer\s+ball|tennis\s+racket|baseball\s+bat|skateboard|surfboard)\b/gi }
];

export function detectPrimarySubject(prompt) {
  const text = String(prompt || '').toLowerCase().trim();
  const allCandidates = [];
  for (const rule of SUBJECT_RULES) {
    rule.re.lastIndex = 0;
    for (const match of text.matchAll(rule.re)) {
      const index = match.index ?? 0;
      const prefix = text.slice(Math.max(0, index - 38), index);
      const modifierTail = text.slice(index + match[0].length, index + match[0].length + 30);
      const followingWord = modifierTail.match(/^\s+([a-z-]+)/i)?.[1] || '';
      // Material words are not the object when immediately describing furniture or props:
      // "oak desk" is a desk, not a tree; "pine bookshelf" is a bookshelf.
      if (/^(?:oak|pine|fir|stone|wooden|metal|metallic|iron|steel|bronze|copper|gold|golden|silver|glass|ceramic|leather|plastic)$/i.test(match[0]) && /^(?:desk|table|chair|shelf|bookshelf|workbench|bed|cabinet|door|floor|chest|crate|sign|sword|bow|staff|bench|stool|ring|shield|mug|vase|bottle|fountain|carousel|car|boat|ship|sword|axe|hammer|tool)$/i.test(followingWord)) continue;
      // Role/style words modify a following object in compounds such as "pirate ship".
      if (/^(?:pirate|fisherman|captain|naval|merchant|royal)$/i.test(match[0]) && /^(?:ship|boat|vessel|sailboat|flag|banner)$/i.test(followingWord)) continue;
      // In compounds like "flag-bearing knight" and "human-shaped flag", the
      // first noun acts as a modifier, not as the generated asset.
      if (/^-(?:shaped|themed|inspired|style|like|headed|faced|wielding|bearing|holding|carrying|wearing|using|slaying|hunting|riding|sized)\b/i.test(modifierTail)) continue;
      if (/\b(?:not|no|without|avoid|exclude|excluding|instead of)\s+(?:(?:a|an|the)\s+)?(?:\w+\s+){0,1}$/i.test(prefix)) continue;
      allCandidates.push({ subject: rule.subject, category: rule.category, index, length: match[0].length, matchedText: match[0] });
    }
  }

  // For command-style prompts, lock onto the first requested noun phrase before
  // relations/accessories. That keeps "make a car with a flag logo" a car, but
  // "make a flag with a car logo" a flag. This also protects novel nouns from
  // later known accessories stealing the route.
  const command = /\b(?:build|make|create|generate|design|model|render|produce|draw)\s+(?:me\s+)?(?:(?:a|an|the|new|simple|detailed|realistic|stylized|stylised|cartoon|cartoony|low[- ]poly|3d|premium|cute|small|tiny|giant|big|large|little|very|highly|clean|polished|angular|minimal|minimalist|game|roblox|beautiful|cool|high[- ]quality|low[- ]poly)\s+)*/i.exec(text);
  if (command) {
    const phraseStart = command.index + command[0].length;
    const tail = text.slice(phraseStart);
    const relation = /\b(?:with|holding|carrying|wearing|wielding|using|featuring|decorated\s+with|that\s+has|that\s+is|beside|next\s+to|alongside|in\s+front\s+of|standing\s+on|sitting\s+on|riding|mounted\s+on|surrounded\s+by|and\s+holding|with\s+a|with\s+an)\b|[,;.!?]/i.exec(tail);
    const phraseEnd = relation ? phraseStart + relation.index : text.length;
    const lead = allCandidates.filter(candidate => candidate.index >= phraseStart && candidate.index < phraseEnd)
      .sort((a, b) => a.index - b.index || b.length - a.length);
    if (lead.length) return lead[0];

    const rawPhrase = text.slice(phraseStart, phraseEnd).replace(/^(?:the|a|an)\s+/, '').trim();
    if (rawPhrase) {
      const words = rawPhrase.split(/\s+/).filter(Boolean);
      const adjectives = new Set(['a','an','the','very','really','super','highly','detailed','realistic','stylized','stylised','cartoon','cartoony','low-poly','lowpoly','3d','premium','cute','small','tiny','giant','big','large','little','beautiful','cool','high-quality','wooden','metal','metallic','plastic','stone','medieval','futuristic','fantasy','scifi','sci-fi','roblox','game','asset','model']);
      const nouns = words.filter(word => !adjectives.has(word));
      const label = nouns.slice(-3).join(' ') || words.slice(-2).join(' ');
      return { subject: 'custom prop', category: 'prop', index: phraseStart, length: rawPhrase.length, matchedText: label };
    }
  }

  // Non-command prompts still use a bounded leading noun phrase. This is critical
  // for unfamiliar objects: a known accessory later in the sentence must not
  // replace a novel main noun that the curated catalog does not know yet.
  const politePrefix = /^(?:(?:please|i\s+want|i\s+need|can\s+you|could\s+you)\s+)?/i.exec(text)?.[0] || '';
  const article = /^(?:a|an|the|my|your|some|one)\s+/i.exec(text.slice(politePrefix.length));
  const phraseStart = politePrefix.length + (article?.[0].length || 0);
  const leadTail = text.slice(phraseStart);
  const leadRelation = /\b(?:with|holding|carrying|wearing|wielding|using|featuring|decorated\s+with|that\s+has|that\s+is|beside|next\s+to|alongside|in\s+front\s+of|standing\s+on|sitting\s+on|riding|mounted\s+on|surrounded\s+by|and\s+holding)\b|[,;.!?]/i.exec(leadTail);
  const leadEnd = leadRelation ? phraseStart + leadRelation.index : text.length;
  const leadCandidates = allCandidates.filter(candidate => candidate.index >= phraseStart && candidate.index < leadEnd)
    .sort((a, b) => a.index - b.index || b.length - a.length);
  if (leadCandidates.length) return leadCandidates[0];

  const leadingPhrase = text.slice(phraseStart, leadEnd).replace(/^[\s,:;.!?-]+|[\s,:;.!?-]+$/g, '').trim();
  if (leadingPhrase && leadingPhrase.split(/\s+/).length <= 9) {
    const adjectives = new Set(['a','an','the','my','your','some','one','very','really','super','highly','detailed','realistic','stylized','stylised','cartoon','cartoony','low-poly','lowpoly','3d','premium','cute','small','tiny','giant','big','large','little','beautiful','cool','high-quality','wooden','metal','metallic','plastic','stone','medieval','futuristic','fantasy','scifi','sci-fi','roblox','game','asset','model','handheld','portable','compact','modern','old','ancient','bright','dark','red','blue','green','purple','black','white','silver','gold','golden']);
    const nouns = leadingPhrase.split(/\s+/).filter(word => !adjectives.has(word));
    const label = nouns.slice(-4).join(' ') || leadingPhrase.split(/\s+/).slice(-3).join(' ');
    if (label && !/^(?:please|make|build|create|generate|design|model|render|draw|produce|show)$/i.test(label)) {
      return { subject: 'custom prop', category: 'prop', index: phraseStart, length: leadingPhrase.length, matchedText: label };
    }
  }

  if (!allCandidates.length) return null;
  return allCandidates.sort((a, b) => a.index - b.index || b.length - a.length)[0];
}
export function classifyPrompt(prompt, requested = 'auto') {
  const primary = detectPrimarySubject(prompt);
  // The concrete object named by the user outranks a broad UI category selector.
  // The selector is a fallback only for prompts with no recognized primary noun.
  if (primary) return primary.category;
  if (requested !== 'auto') return requested;
  return 'prop';
}

function trianglesInMesh(mesh) {
  const geom = mesh.geometry;
  const count = geom.drawRange.count === Infinity ? (geom.index ? geom.index.count : (geom.getAttribute('position')?.count || 0)) : geom.drawRange.count;
  return Math.floor(count / 3);
}

const DETAIL_PRIORITY = [
  /HumanButton|HumanHairSpike|HumanMouth|HumanBrow|HumanNose|Rune|Etch|Vent|Stripe|Seam|Rivet|BadgeMark|Glint|Emblem|Gill/,
  /EyeSocket|Eye$|Core$|Membrane|Rib|Claw|Toe|BootToe|ShinStripe|ForearmStripe/,
  /HumanFringe|HumanHairLock|HumanBackHair|Inset|Facet|Brow|Bumper|Finial|Bridle|Barding|ChestLowerLine|ShoulderInset/,
  /Crest|Horn|Spine|Antenna|Ear|Handle|Hub|Joint|Tip|Hoof|Foot|Hand/,
  /Shoulder|UpperArm|Forearm|Thigh|Shin|UpperLeg|Lower|WingFold/,
  /ChestArmor|ChestScute|HeadShell|Head$|BladeFacet|Panel|HelmetCrown|Boot$/
];

function matchingMirrorName(name) {
  let match = name.match(/^(.*?)(Left|Right)(.+)$/);
  if (match) return `${match[1]}${match[2] === 'Left' ? 'Right' : 'Left'}${match[3]}`;
  match = name.match(/^(Dragon)(L|R)(F|B)(.+)$/);
  if (match) return `${match[1]}${match[2] === 'L' ? 'R' : 'L'}${match[3]}${match[4]}`;
  match = name.match(/^(Horse)(L|R)(F|B)(.+)$/);
  if (match) return `${match[1]}${match[2] === 'L' ? 'R' : 'L'}${match[3]}${match[4]}`;
  return null;
}

function enforceBudget(root, budget) {
  let stats = getMeshStats(root);
  // Procedural families use curated name-priority rules; AI compositions use
  // the modeler's explicit primary/secondary/accent importance labels instead.
  if (!root.userData?.aiAuthoredGeometry) for (const pattern of DETAIL_PRIORITY) {
    if (stats.triangles <= budget) break;
    const candidates = [];
    root.traverse(o => { if (o.isMesh && pattern.test(o.name)) candidates.push(o); });
    for (const mesh of candidates) {
      if (stats.triangles <= budget) break;
      if (!mesh.parent) continue;
      const pairName = matchingMirrorName(mesh.name);
      let counterpart = null;
      if (pairName) root.traverse(o => { if (!counterpart && o.isMesh && o.name === pairName) counterpart = o; });
      const remove = [mesh, counterpart].filter((o, i, a) => o?.parent && a.indexOf(o) === i);
      for (const item of remove) {
        item.parent.remove(item);
        stats.triangles -= trianglesInMesh(item);
        stats.vertices -= item.geometry.getAttribute('position')?.count || 0;
        stats.parts--;
      }
    }
  }
  if (stats.triangles > budget) {
    const protectedNames = /Torso|Body|Barrel|Mantle|MainBody|Head$|HeadShell|HumanHead|HumanNeck|HumanPelvis|Blade$|DragonTorso|CreatureTorso|CupBody|CrateBody|Chassis|Hull|Fuselage|Foundation|Central|Primary|Core|Frame|Main/i;
    const candidates = [];
    root.traverse(o => { if (o.isMesh && !protectedNames.test(o.name)) candidates.push(o); });
    const priorityRank = { accent: 0, secondary: 1, primary: 2 };
    candidates.sort((a, b) => (priorityRank[a.userData.designPriority] ?? 1) - (priorityRank[b.userData.designPriority] ?? 1) || trianglesInMesh(b) - trianglesInMesh(a));
    for (const mesh of candidates) {
      if (stats.triangles <= budget) break;
      if (!mesh.parent) continue;
      const pairName = matchingMirrorName(mesh.name);
      let counterpart = null;
      if (pairName) root.traverse(o => { if (!counterpart && o.isMesh && o.name === pairName) counterpart = o; });
      const remove = [mesh, counterpart].filter((o, i, a) => o?.parent && a.indexOf(o) === i);
      for (const item of remove) {
        item.parent.remove(item);
        stats.triangles -= trianglesInMesh(item);
        stats.vertices -= item.geometry.getAttribute('position')?.count || 0;
        stats.parts--;
      }
    }
  }
  // Absolute final pass: even if a malformed plan labels every part as primary,
  // the advertised triangle cap must remain a hard invariant.
  stats = getMeshStats(root);
  if (stats.triangles > budget) {
    const remaining = [];
    root.traverse(o => { if (o.isMesh) remaining.push(o); });
    const priorityRank = { accent: 0, secondary: 1, primary: 2 };
    remaining.sort((a, b) => (priorityRank[a.userData.designPriority] ?? 1) - (priorityRank[b.userData.designPriority] ?? 1) || trianglesInMesh(b) - trianglesInMesh(a));
    for (const mesh of remaining) {
      stats = getMeshStats(root);
      if (stats.triangles <= budget) break;
      if (!mesh.parent) continue;
      const pairName = matchingMirrorName(mesh.name);
      let counterpart = null;
      if (pairName) root.traverse(o => { if (!counterpart && o.isMesh && o.name === pairName) counterpart = o; });
      const remove = [mesh, counterpart].filter((o, i, a) => o?.parent && a.indexOf(o) === i);
      for (const item of remove) item.parent.remove(item);
    }
  }
  return getMeshStats(root);
}

function applyBlueprintPalette(p, blueprint, prompt, imageColor) {
  if (imageColor || !Array.isArray(blueprint?.palette) || !blueprint.palette.length) return;
  // Explicit user color instructions win; otherwise the design brain's palette is used.
  if (COLOR_MAP.some(([pattern]) => pattern.test(String(prompt || '')))) return;
  const names = {
    ivory: '#D9D2BF', cream: '#D9D2BF', copper: '#B8754D', bronze: '#A87343', brass: '#C3A058', silver: '#ADB8C0', steel: '#7A8B98', navy: '#35486D', turquoise: '#43B8B0', aqua: '#52D9D1', lime: '#A9CF4E', beige: '#BBA98A', tan: '#A98B67', coral: '#DA7868', maroon: '#783D4A', lavender: '#A99AD5'
  };
  const resolve = (value, fallback) => {
    const name = String(value || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/i.test(name)) return name;
    if (names[name]) return names[name];
    for (const [pattern, hex] of COLOR_MAP) if (pattern.test(name)) return hex;
    return fallback;
  };
  p.base = resolve(blueprint.palette[0], p.base);
  if (blueprint.palette[1]) p.accent = resolve(blueprint.palette[1], p.accent);
  if (blueprint.palette[2]) p.accent2 = resolve(blueprint.palette[2], p.accent2);
  if (blueprint.palette[3]) p.glow = resolve(blueprint.palette[3], p.glow);
}

function safeBlueprintNumber(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
}

function safeBlueprintString(value, fallback = '') {
  return String(value ?? fallback).replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 42) || fallback;
}

function blueprintRoleColor(role, p, hint = '') {
  const label = `${role || ''} ${hint || ''}`.toLowerCase();
  if (/glow|emissive|light|eye|glass|screen/.test(label)) return { color: p.glow, role: 'glow' };
  if (/metal|steel|chrome|brass|gold|silver/.test(label)) return { color: p.accent2, role: 'metal' };
  if (/dark|shadow|black|rubber|grip|underside/.test(label)) return { color: p.dark, role: 'dark' };
  if (/accent|trim|stripe|secondary|decoration|ornament/.test(label)) return { color: p.accent, role: 'metal' };
  return { color: p.base, role: 'base' };
}

function blueprintPriority(part, name = '') {
  const explicit = String(part?.priority || part?.level || '').toLowerCase();
  if (['primary','secondary','accent'].includes(explicit)) return explicit;
  const role = String(part?.role || '').toLowerCase();
  if (role === 'glow' || role === 'accent') return 'accent';
  const label = `${name} ${part?.name || ''} ${part?.kind || ''}`.toLowerCase();
  if (/rivet|badge|trim|stripe|seam|button|status|glow|light|screen|tiny|accent|decoration|ornament|inset/.test(label)) return 'accent';
  if (/main|central|core|body|chassis|hull|foundation|base|frame|torso|head|cab|fuselage|primary/.test(label)) return 'primary';
  return 'secondary';
}

function makeBlueprintComposition(g, p, blueprint, style) {
  // Unknown objects can be described as a constrained mesh plan by a local
  // language/vision model. Validate every numeric input and geometry primitive
  // before using it; an untrusted model response must never create unbounded meshes.
  const raw = Array.isArray(blueprint?.parts) ? blueprint.parts.slice(0, 28) : [];
  const parts = raw.map((part, index) => {
    if (!part || typeof part !== 'object') return null;
    const shape = String(part.shape || 'plate').toLowerCase();
    if (!['box','plate','sphere','icosphere','cylinder','cone','wedge','rod','ring'].includes(shape)) return null;
    const vector = (value, defaults, low, high) => defaults.map((fallback, i) => safeBlueprintNumber(Array.isArray(value) ? value[i] : fallback, fallback, low, high));
    const position = vector(part.position, [0, 0.7 + index * 0.04, 0], [-2.5, -0.25, -2.5], [2.5, 4.5, 2.5]);
    const size = vector(part.size, [0.55, 0.35, 0.45], [0.06, 0.06, 0.06], [1.9, 2.8, 1.9]);
    const rotation = vector(part.rotation, [0, 0, 0], [-Math.PI, -Math.PI, -Math.PI], [Math.PI, Math.PI, Math.PI]);
    return { part, shape, position, size, rotation, index };
  }).filter(Boolean);
  // A partial/poor model response should fall back to a curated procedural model.
  if (parts.length < 5) return false;

  const partName = (value, index) => `${safeBlueprintString(value, `AIForm${index + 1}`).replace(/\s+/g, '_')}_${index + 1}`;
  for (const item of parts) {
    const { part, shape, position: pos, size, rotation: rot, index } = item;
    const mirrored = /^(both|mirror|bilateral)$/i.test(String(part.symmetry || ''));
    const rawLabel = safeBlueprintString(part.name || part.label || part.kind, `AIForm${index + 1}`).replace(/^(left|right|mirror|both)[ _-]*/i, '');
    const name = partName(mirrored ? `Left_${rawLabel}` : rawLabel, index);
    const roleInfo = blueprintRoleColor(part.role || part.material || part.colorRole, p, part.color);
    const color = roleInfo.color;
    const [w, h, d] = size;
    const drawPos = mirrored ? [-Math.max(Math.abs(pos[0]), w * 0.32), pos[1], pos[2]] : pos;
    let generatedMesh = null;
    if (shape === 'box') generatedMesh = box(g, name, drawPos, size, color, style, roleInfo.role, rot);
    else if (shape === 'plate') generatedMesh = plate(g, name, drawPos, size, color, style, roleInfo.role, 0.14, rot);
    else if (shape === 'sphere' || shape === 'icosphere') generatedMesh = ico(g, name, drawPos, 0.5, color, [w, h, d], 0, style, roleInfo.role);
    else if (shape === 'cylinder') generatedMesh = cylinder(g, name, drawPos, Math.max(0.04, Math.min(w, d) / 2), Math.max(0.04, Math.min(w, d) / 2), h, color, 6, rot, style, roleInfo.role);
    else if (shape === 'cone') generatedMesh = cone(g, name, drawPos, Math.max(0.04, Math.min(w, d) / 2), h, color, 5, rot, style);
    else if (shape === 'rod') generatedMesh = cylinder(g, name, drawPos, Math.max(0.035, Math.min(w, d) / 2), Math.max(0.035, Math.min(w, d) / 2), h, color, 5, rot, style, roleInfo.role);
    else if (shape === 'wedge') generatedMesh = polyPlate(g, name, drawPos, [[-w * 0.50, -h * 0.42], [w * 0.34, -h * 0.42], [w * 0.50, h * 0.18], [0, h * 0.50], [-w * 0.28, h * 0.22]], d, color, style, roleInfo.role, rot);
    else if (shape === 'ring') {
      const radius = Math.max(0.08, Math.min(w, h) * 0.43);
      const thickness = Math.max(0.025, Math.min(w, h, d) * 0.10);
      generatedMesh = addMesh(g, name, new THREE.TorusGeometry(radius, thickness, 4, 8), color, drawPos, [1, 1, Math.max(0.5, d / Math.max(w, h))], rot, roleInfo.role, style);
    }
    if (generatedMesh) { generatedMesh.userData.designPriority = blueprintPriority(part, rawLabel); generatedMesh.userData.aiBlueprintPart = true; }
    // Explicit mirror instructions let the model request bilateral elements
    // without requiring a second guessed part. Position x is mirrored safely.
    if (mirrored) {
      const mirroredName = partName(`Right_${rawLabel}`, index);
      const mirrorPos = [-drawPos[0], drawPos[1], drawPos[2]];
      if (shape === 'box') box(g, mirroredName, mirrorPos, size, color, style, roleInfo.role, [rot[0], -rot[1], -rot[2]]);
      else if (shape === 'plate') plate(g, mirroredName, mirrorPos, size, color, style, roleInfo.role, 0.14, [rot[0], -rot[1], -rot[2]]);
      else if (shape === 'sphere' || shape === 'icosphere') ico(g, mirroredName, mirrorPos, 0.5, color, [w, h, d], 0, style, roleInfo.role);
      else if (shape === 'cylinder') cylinder(g, mirroredName, mirrorPos, Math.max(0.04, Math.min(w, d) / 2), Math.max(0.04, Math.min(w, d) / 2), h, color, 6, [rot[0], -rot[1], -rot[2]], style, roleInfo.role);
      else if (shape === 'cone') cone(g, mirroredName, mirrorPos, Math.max(0.04, Math.min(w, d) / 2), h, color, 5, [rot[0], -rot[1], -rot[2]], style);
      else if (shape === 'rod') cylinder(g, mirroredName, mirrorPos, Math.max(0.035, Math.min(w, d) / 2), Math.max(0.035, Math.min(w, d) / 2), h, color, 5, [rot[0], -rot[1], -rot[2]], style, roleInfo.role);
      else if (shape === 'wedge') polyPlate(g, mirroredName, mirrorPos, [[-w * 0.50, -h * 0.42], [w * 0.34, -h * 0.42], [w * 0.50, h * 0.18], [0, h * 0.50], [-w * 0.28, h * 0.22]], d, color, style, roleInfo.role, [rot[0], -rot[1], -rot[2]]);
      else if (shape === 'ring') {
        const radius = Math.max(0.08, Math.min(w, h) * 0.43), thickness = Math.max(0.025, Math.min(w, h, d) * 0.10);
        addMesh(g, mirroredName, new THREE.TorusGeometry(radius, thickness, 4, 8), color, mirrorPos, [1, 1, Math.max(0.5, d / Math.max(w, h))], [rot[0], -rot[1], -rot[2]], roleInfo.role, style);
      }
      g.traverse(o => { if (o.isMesh && o.name === mirroredName) { o.userData.designPriority = blueprintPriority(part, rawLabel); o.userData.aiBlueprintPart = true; } });
    }
  }
  return true;
}

function applyBlueprintProportions(group, blueprint) {
  const values = blueprint?.proportions;
  if (!values || typeof values !== 'object') return;
  const head = safeBlueprintNumber(values.headScale, 1, 0.72, 1.38);
  const body = safeBlueprintNumber(values.bodyWidth, 1, 0.72, 1.38);
  const limbs = safeBlueprintNumber(values.limbLength, 1, 0.72, 1.38);
  const tail = safeBlueprintNumber(values.tailLength, 1, 0.72, 1.45);
  group.traverse(o => {
    if (!o.isMesh) return;
    if (/Head|HelmetCrown|FaceShell|AnimalHead|DragonHead|BirdHead/i.test(o.name)) { o.scale.x *= head; o.scale.y *= head; o.scale.z *= head; }
    if (/Torso|Body|Chassis|MainBody|Fuselage|Barrel/i.test(o.name)) o.scale.x *= body;
    if (/Arm|Leg|Shin|Thigh|Limb/i.test(o.name)) o.scale.y *= limbs;
    if (/Tail/i.test(o.name)) o.scale.z *= tail;
  });
}

export function hasDedicatedGeometry(prompt, type = 'auto') {
  if (['character', 'creature', 'weapon'].includes(type) || ['character', 'creature', 'weapon'].includes(classifyPrompt(prompt, 'auto'))) return true;
  const primary = detectPrimarySubject(prompt);
  if (primary?.subject === 'custom prop') return false;
  const subject = primary?.matchedText || String(prompt || '');
  return /spaceship|space ship|starship|rocket|ufo|saucer|flying disc|airplane|aeroplane|\bplane\b|jet|helicopter|\bheli\b|castle|fortress|house|cottage|building|lighthouse|tower|temple|shop|table|desk|bed|sofa|couch|bookshelf|lantern|lamp|streetlight|mushroom|toadstool|cake|pie|tart|pumpkin|squash|apple|bread|loaf|food|pickaxe|pick axe|shovel|spade|wrench|spanner|telescope|utility tool|computer|monitor|laptop|notebook computer|terminal|gaming pc|backpack|rucksack|jetpack|bicycle|bike|mountain bike|motorcycle|motorbike|scooter|boat|sailboat|ship|canoe|yacht|train|locomotive|railcar|tram|car|kart|truck|van|vehicle|sports car|bus|ambulance|tractor|tank|tree|pine|fir|oak|palm|plant|bush|flower|rose|cactus|fern|mug|cup|tankard|pot|kettle|bottle|vase|jar|chair|seat|throne|flag|banner|sign|crate|box|chest|supply|loot|rock|crystal|ore|gem|guitar|piano|drum|violin|flute|trumpet|saxophone|basketball|football|soccer ball|tennis racket|baseball bat|skateboard|surfboard|phone|smartphone|tablet|camera|console|keyboard|drill|saw|pliers|screwdriver|staff|wand/i.test(subject);
}

function applyPromptScale(group, prompt) {
  let x = 1, y = 1, z = 1;
  if (/\b(tiny|mini|miniature|small|pocket)\b/i.test(prompt)) { x *= 0.88; y *= 0.86; z *= 0.88; }
  if (/\b(giant|huge|massive|boss)\b/i.test(prompt)) { x *= 1.18; y *= 1.16; z *= 1.18; }
  if (/\b(tall|slender|slim|sleek)\b/i.test(prompt)) { x *= 0.91; y *= 1.12; z *= 0.94; }
  if (/\b(bulky|heavy|chunky|tank)\b/i.test(prompt)) { x *= 1.12; y *= 0.98; z *= 1.12; }
  group.scale.set(x, y, z);
  group.userData.scaleProfile = { x, y, z };
}

function isBlueprintCompatible(prompt, blueprint) {
  if (!blueprint || !Array.isArray(blueprint.parts) || !blueprint.parts.length) return true;
  const requested = detectPrimarySubject(prompt);
  if (!requested || requested.subject === 'custom prop') return true; // Novel nouns may legitimately rely on a local AI part plan.
  const declaredText = String(blueprint.subject || blueprint.object || blueprint.name || '');
  const declared = detectPrimarySubject(declaredText);
  if (declared) return requested.category === declared.category && requested.subject === declared.subject;
  // If the AI omitted the subject field, only reject an obvious family conflict
  // in its part list. For a recognized subject, an empty subject declaration is
  // otherwise acceptable because some local models only produce part names.
  const partNouns = blueprint.parts.map(part => String(part?.name || '')).join(' ');
  const partSubject = detectPrimarySubject(partNouns);
  if (partSubject && partSubject.category !== requested.category) return false;
  if (requested.category === 'character' && /flag\s*(?:pole|cloth|field)|banner|billboard/i.test(partNouns) && !/human|person|head|torso|arm|leg|robot|mech/i.test(partNouns)) return false;
  return true;
}

export function createModel({ prompt = 'minimal robot character', type = 'auto', imageColor = null, shapeStyle = 'premium', triangleBudget = 500, variation = 0, designHints = '', blueprint = null } = {}) {
  const userPrompt = String(prompt || 'minimal robot character').slice(0, 700);
  // Research/design notes may mention other nouns; they must never override the user's subject.
  const cleanPrompt = `${userPrompt} ${String(designHints || '').slice(0, 700)}`.trim();
  const category = classifyPrompt(userPrompt, type);
  const blueprintCompatible = isBlueprintCompatible(userPrompt, blueprint);
  const acceptedBlueprint = blueprintCompatible ? blueprint : null;
  const p = paletteFor(userPrompt, imageColor);
  applyBlueprintPalette(p, acceptedBlueprint, userPrompt, imageColor);
  const group = new THREE.Group();
  group.name = cleanPrompt.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 42) || 'forge3d_asset';
  const safeStyle = ['premium', 'minimal', 'faceted', 'soft'].includes(shapeStyle) ? shapeStyle : 'premium';
  const limit = clamp(Number(triangleBudget) || 500, 100, 500);
  group.userData = {
    prompt: userPrompt, category, shapeStyle: safeStyle, triangleBudget: limit, palette: p,
    designRules: ['silhouette-first', 'primary-secondary-tertiary detail hierarchy', 'hard planar faces', 'layered surfaces do not share depth', 'grounded contact points', 'restrained accent palette', 'bilateral symmetry audit', 'proportion audit before detail pass'],
    variation: Number(variation) || 0, designHints: String(designHints || '')
  };
  const aiAuthoredGeometry = makeBlueprintComposition(group, p, acceptedBlueprint, safeStyle);
  if (!aiAuthoredGeometry) {
    if (category === 'character') {
      if (detectPrimarySubject(userPrompt)?.subject === 'robot') makeHumanoid(group, p, userPrompt, safeStyle);
      else makeHuman(group, p, userPrompt, safeStyle);
    } else if (category === 'creature') makeQuadruped(group, p, userPrompt, safeStyle);
    else if (category === 'weapon') makeWeapon(group, p, userPrompt, safeStyle);
    else makeProp(group, p, userPrompt, safeStyle);
  }

  if (safeStyle === 'faceted') group.traverse(o => { if (o.isMesh) o.material.flatShading = true; });
  if (safeStyle === 'soft') group.traverse(o => { if (o.isMesh) o.material.roughness = 0.95; });
  applyPromptScale(group, userPrompt);
  applyDetailProportions(group, userPrompt, Number(variation) || 0);
  applyBlueprintProportions(group, acceptedBlueprint);
  if (aiAuthoredGeometry) {
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    if (Number.isFinite(bounds.min.y)) group.position.y -= bounds.min.y;
  }
  group.userData.aiAuthoredGeometry = aiAuthoredGeometry;
  group.userData.blueprintRejected = Boolean(blueprint && !blueprintCompatible);
  if (blueprint && !blueprintCompatible) group.userData.designWarnings = ['Local-AI plan subject did not match the requested main object; rebuilt using the matching procedural grammar.'];
  const stats = enforceBudget(group, limit);
  group.updateMatrixWorld(true);
  group.userData.stats = stats;
  return { group, category, palette: p, stats, name: group.name };
}

export function auditModel(root, triangleBudget = 500) {
  root.updateMatrixWorld(true);
  const stats = getMeshStats(root);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  let invalidVertices = 0, emptyMeshes = 0;
  const names = new Set(); let duplicateNames = 0;
  root.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.getAttribute('position')?.count) emptyMeshes++;
    const pos = o.geometry.getAttribute('position');
    if (pos?.array) for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i])) invalidVertices++;
    if (names.has(o.name)) duplicateNames++; else names.add(o.name);
  });
  const dims = [size.x, size.y, size.z];
  const warnings = [];
  if (!stats.triangles) warnings.push('No renderable triangles were generated.');
  if (stats.triangles > triangleBudget) warnings.push(`Triangle budget exceeded (${stats.triangles}/${triangleBudget}).`);
  if (invalidVertices) warnings.push(`${invalidVertices} non-finite vertex positions found.`);
  if (emptyMeshes) warnings.push(`${emptyMeshes} empty mesh objects found.`);
  if (dims.some(v => !Number.isFinite(v) || v <= 0)) warnings.push('Bounding dimensions are invalid.');
  if (duplicateNames) warnings.push(`${duplicateNames} duplicate mesh names found.`);
  if (Math.max(...dims) / Math.max(0.0001, Math.min(...dims)) > 12) warnings.push('Extreme aspect ratio; confirm the prompt intended a very long or very tall asset.');
  if (stats.parts < 3) warnings.push('Very few parts; the asset may be too simple for a finished game prop.');
  return { ...stats, bounds: { x: +size.x.toFixed(3), y: +size.y.toFixed(3), z: +size.z.toFixed(3) }, invalidVertices, emptyMeshes, duplicateNames, warnings, passed: warnings.filter(w => /budget exceeded|non-finite|empty mesh|dimensions are invalid/i.test(w)).length === 0 };
}

export function getMeshStats(root) {
  let triangles = 0, vertices = 0, parts = 0;
  root.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    parts++;
    const pos = o.geometry.getAttribute('position');
    if (pos) vertices += pos.count;
    const idx = o.geometry.index;
    const drawCount = o.geometry.drawRange.count === Infinity ? (idx ? idx.count : (pos ? pos.count : 0)) : o.geometry.drawRange.count;
    triangles += Math.floor(drawCount / 3);
  });
  return { triangles, vertices, parts };
}
