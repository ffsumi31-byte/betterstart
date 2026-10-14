# Forge3D Studio — 8-pass low-poly designer

Forge3D is a browser-first game-asset workbench. It now runs each request through an explicit design process rather than immediately stamping out a preset:

1. **Inspect the prompt** — identify the object, role, style, scale, palette and requested features.
2. **Research references** — optionally fetch public Wikipedia and Wikimedia Commons search results, with source links and Commons attribution metadata.
3. **Cartoon concept** — make a category-aware SVG silhouette study before geometry.
4. **Blockout** — build the primary masses at a reduced triangle budget.
5. **Inspect** — audit finite vertex data, bounds, component count and budget.
6. **Detail pass** — use specialist modeling grammar for secondary and tertiary shapes.
7. **Clean rebuild** — rebuild the final asset from a clean scene rather than exporting the temporary blockout.
8. **Final QA** — audit the actual model shown in the viewport and report the triangle cap and warnings.

## Model design

The full design policy is documented in [`DESIGNER_PLAYBOOK.md`](./DESIGNER_PLAYBOOK.md), including silhouette-first composition, quad-like planar shapes, negative space, detail budgeting, local-AI part-plan constraints, feedback memory, and the final release checklist.

Dedicated silhouettes are provided for humanoid characters, dragons, horses, fish/sharks, octopuses, dinosaurs, cats/dogs/wolves, birds, spaceships, rockets, airplanes, helicopters, cars, bicycles, boats, buildings/castles/towers, tables/desks/beds/sofas, lanterns/streetlights, mushrooms, food props, tools, computers/laptops, backpacks, trees, crates, mugs, chairs, crystals and weapons. Unknown prompt types no longer silently become robots: with local AI enabled, the designer can build an unfamiliar object from its generated 8–18-part plan. The plan is restricted to a safe shape vocabulary, bounded transforms, a 500-triangle budget and grounding normalization; if the plan is incomplete, Forge3D falls back to a coherent game-prop profile.

The grammar emphasizes readable outline, broad planar faces, clipped/chamfered corners, controlled depth layers, matched left/right details, functional secondary parts, contact points and restrained accent colors. When Ollama is disabled, unsupported nouns are called out in the pipeline instead of being misrepresented as a specifically understood design. Geometry stays under the user's 100–500 triangle budget, with non-silhouette accents removed before major forms.


## Prompt routing repair (1.4.2)

The generator now selects geometry from the **main requested object** first. Secondary nouns are treated as features or accessories: `human holding a flag` builds a human, while `flag with a human emblem` builds a flag. The dropdown category is only a fallback when the prompt cannot identify a main object. Research snippets and saved style preferences are not allowed to replace that subject.

This release expands the regression suite to cover 34 varied prompts across humanoids, robots, creatures, vehicles, weapons, architecture, furniture, electronics, food, and unfamiliar devices. Each case checks category, a family-specific geometry marker, and the hard 500-triangle limit. Run `npm test` to repeat the checks.

## Google Gemini AI brain (1.5.0)

Forge3D can now use the **Gemini API** for the AI steps, with a model picker for each job:

| Job | What it does | Default model |
| --- | --- | --- |
| Prompt understanding | Finds the real main subject, style and features of your prompt | `gemini-3.5-flash-lite` |
| Image understanding | Reads your reference image (skipped when no image is attached) | `gemini-3.8-flash` |
| Building (part plan) | Writes the part-by-part blueprint that Forge3D turns into geometry | `gemini-3.8-flash` |

Setup:

1. Create a key at <https://aistudio.google.com/apikey>.
2. Open **Teach the model → Connect Google Gemini**, paste the key, optionally tick *Remember the key on this device*, and click **Load my models** (this lists exactly the models your key can use) or **Test Gemini**.
3. In the **Create** tab set **AI brain → Google Gemini** and choose a model for each of the three jobs. Pick **Custom model ID…** to type any other Gemini model name. Your choices are remembered.

How it behaves:

- The browser calls `generativelanguage.googleapis.com` directly with the visitor's own key, sent in the `x-goog-api-key` header. There is no Forge3D server in between, and the key is never put in the source code or the URL. Without *Remember*, the key lives in `sessionStorage` and is forgotten when the tab closes.
- If the prompt and building model are the same, the separate understanding call is skipped to save quota. Reference images are downscaled to 1280px before upload.
- If Gemini fails (bad key, quota, a model that doesn't exist for your key), generation continues with the built-in modeling rules and the pipeline shows why. If only the image or prompt step fails, the build step still runs.
- Gemini returns a bounded part plan; Forge3D validates it, builds the geometry itself, enforces the triangle budget and audits the result. It is not a neural text-to-3D mesh generator.
- Ollama still works. The **AI brain** menu switches between Built-in rules, Gemini and Ollama.
- Model names change over time. The built-in list is only a starting point; **Load my models** is the source of truth.

Tests: `npm test` now includes `tests/gemini.test.js` (mocked API: model selection, header key, image handling, retries, error messages, graceful fallback).

## Optional real local AI (no paid API key)

The website can connect to an Ollama model on the user's own PC and use it to inspect prompts or reference images and return a structured design blueprint. This is actual local model inference, not a claim that Forge3D retrains the model or that a text LLM directly generates arbitrary mesh topology.

1. Install Ollama from <https://ollama.com/>.
2. For text planning, run `ollama pull qwen2.5:3b`. For image understanding, run `ollama pull qwen2.5vl:3b` and enter that model name in the app.
3. Open **Teach the model → Connect a local AI brain**, set endpoint `http://localhost:11434`, enter the model name, click **Test connection**, then turn on **Use local AI during generation** and save.
4. For the hosted website, this connection still targets the visitor's own PC; Render/Vercel only host the frontend. To authorize a deployed origin, run `ALLOW_OLLAMA_ORIGIN_WINDOWS.bat`, enter your exact site origin such as `https://your-app.onrender.com`, fully quit Ollama from the system tray, and reopen it. For the localhost site, Ollama's normal local-origin defaults are usually sufficient. Only authorize origins you trust; avoid `OLLAMA_ORIGINS=*` on shared computers or networks.

The browser sends the prompt and optional image directly to the configured local Ollama endpoint. Forge3D does not send them to a Forge3D server. On unfamiliar subjects, the AI now returns a bounded part-by-part mesh plan (primitive type, placement, size, rotation, material role and optional symmetry); Forge3D validates it, builds actual geometry, creates a concept drawing from those parts, enforces the triangle budget and audits the result. Specialist assets use curated topology rules because these are more dependable than raw LLM coordinates. This is a genuine local AI-assisted modeling system, but not a trained 3D diffusion/foundation model and not a guarantee of watertight/animation-ready topology for every prompt.

## Internet research

The Research stage uses public MediaWiki/Wikimedia Commons endpoints without an API key. Availability and CORS may vary by browser/network. If lookup fails, the app records an offline fallback and still generates from its local modeling grammar. Wikimedia thumbnails link to their file pages; each image's license must be checked before reuse.

## Deploy on Render

The project files must be in the repository root: `package.json`, `index.html`, `build.mjs`, `server.mjs`, `src/` and `public/`.

- Build command: `npm install`
- Start command: `npm start`

`npm start` builds `dist/` and launches the Node static server on Render's `PORT`.

## Deploy on Vercel

Import the repository. The included `vercel.json` installs dependencies, runs the build and publishes `dist/`.

## Run and test locally

Requires Node.js 20+:

```bash
npm install
npm test
npm start
```

Then open `http://localhost:5173`. On Windows, `START_LOCAL_WINDOWS.bat` is a shortcut.

## Honest limitations

The default engine is a detailed procedural modeling system; it does not have a trained foundation model for arbitrary text-to-3D generation. Ollama adds real language/vision reasoning, can author bounded part layouts for unfamiliar nouns, and public internet reference search grounds the design process, but the result still uses a constrained primitive vocabulary rather than a learned 3D diffusion field. For general image-to-3D reconstruction with learned geometry, add a separate GPU inference service/model runtime. For example, Microsoft's TRELLIS requires a Linux environment and a GPU with at least 16 GB VRAM in its official setup; Tencent's Hunyuan3D-2.1 documents around 10 GB VRAM for shape and 29 GB for its full shape+texture pipeline. Those are not realistic to run inside a standard Render/Vercel static web deployment.
