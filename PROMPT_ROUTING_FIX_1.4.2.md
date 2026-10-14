# Prompt routing fix — 1.4.2

## What changed

- The original user prompt alone chooses the main subject; research snippets no longer influence subject routing.
- The generation pipeline uses `classifyPrompt(prompt, selectedType)` instead of blindly following a possibly stale dropdown selection.
- Prompt modifiers, accessories, logos, emblems and nearby objects are separated from the main noun. Examples: `human carrying a flag` → human with accessory; `flag with a human emblem` → flag; `chair with sword embroidery` → chair; `laptop with phone sticker` → laptop.
- Expanded dedicated families for velociraptors and other dinosaurs, shields, rocket launchers, rings, fountains, carousels, plus custom device, spool and transport-pod fallback grammars.
- Added an unknown-object fallback that preserves the lead noun and builds a designed multi-part prop rather than silently selecting a later known noun. A local Ollama part plan can supply a more semantic custom shape for unfamiliar objects.
- Added a 34-case route regression test that intentionally selects the wrong UI category and asserts the named object still wins.

## Verification

Run `npm test`. Current session result: 33/33 logic tests passed and the 34-prompt route stress suite passed. The full production dependency/browser build was not verified in this environment because npm registry DNS lookup failed.
