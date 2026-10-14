# Forge3D Studio — verification status (1.4.2)

## Completed logic checks

- **33/33 automated tests passed** across prompt analysis, primary-subject routing, local AI blueprint handling, mesh budgets, geometry audits and deployment configuration.
- A **34-prompt cross-category stress suite** passed; each prompt produced the expected category, its expected geometry marker, and no more than 500 triangles.
- JavaScript syntax checks passed for `src/main.js`, `src/brain.js`, `src/modeler.js`, `build.mjs` and `server.mjs`.
- Added a pipeline regression check ensuring the user's main noun controls the generation category before the UI dropdown is considered.

## Important qualification

The environment could not resolve the npm registry (`EAI_AGAIN` for `registry.npmjs.org`). Pure modeler logic tests ran against a temporary Three.js-compatible test shim. That shim is **not included** in the release ZIP. The project declares the official `three` package in `package.json`; Render/Vercel must install it with `npm install`. As a result, these tests verify routing/modeler logic, not a full production Three.js browser render, GLB visual quality, or a live Render deployment.

## Model capability

Forge3D combines curated procedural geometry grammars with optional local Ollama text/vision planning and a bounded part-plan builder. It is not a trained general-purpose neural text-to-3D/image-to-3D diffusion model. Without Ollama, unfamiliar nouns receive a distinctive generic procedural fallback; with compatible local AI enabled, the app can ask for a custom part plan and validate that it does not contradict a recognized main object.

## 1.5.0 — Gemini AI brain
- `node --test tests/deploy.test.js tests/gemini.test.js`: 14/14 passed.
- Browser smoke test (Chromium, mocked Gemini endpoint, stubbed Three.js/modeler): 21/21 passed — model list loading, per-role model selection, call order vision → prompt → build, header-only key, persistence, remember-key, bad-key fallback, provider switching.
- NOT verified here: a live call to the real Gemini API (no key/network from the build sandbox), and `modeler`/`brain` suites + production build (npm registry unreachable, so Three.js could not be installed). Run `npm install && npm test` on your machine.
