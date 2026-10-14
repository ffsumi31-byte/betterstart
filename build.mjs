import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['index.html', 'src', 'public']) {
  const source = path.join(root, name);
  try { await stat(source); await cp(source, path.join(out, name), { recursive: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
// Bundle Three.js with the static output. The deployed site no longer relies on a CDN.
const threeSource = path.join(root, 'node_modules', 'three');
try {
  await stat(threeSource);
  const vendor = path.join(out, 'vendor', 'three');
  await mkdir(path.join(vendor, 'build'), { recursive: true });
  await mkdir(path.join(vendor, 'examples', 'jsm'), { recursive: true });
  await cp(path.join(threeSource, 'build'), path.join(vendor, 'build'), { recursive: true });
  await cp(path.join(threeSource, 'examples', 'jsm'), path.join(vendor, 'examples', 'jsm'), { recursive: true });
  await cp(path.join(threeSource, 'LICENSE'), path.join(vendor, 'LICENSE'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  throw new Error('Three.js dependency is missing. Run npm install before building.');
}
await writeFile(path.join(out, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
console.log('Forge3D built to dist/ with bundled Three.js (static browser app; AI calls go from the browser to your own Gemini or Ollama).');
