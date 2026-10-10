# Current release QA

Environment: headless Chromium/software WebGL, desktop 1440×900 and mobile 390×844 viewports. Reduced-motion and normal-motion paths were checked. This is not a benchmark/certification for every device, browser or long-running session.

## Passing release checks

- `storage-service.cjs`: snapshot roundtrip, malformed/missing data, old sky preference migration, mute/volume settings and blocked storage.
- `browser-cruise.cjs`: forward-moving dust/asteroids, unchanged HQ world coordinates and saved building records, travel stopped/hidden with reduced motion.
- `browser-sky-storage-asteroids.cjs`: both actual licensed GLBs load without fallback; correct CORE panorama material; safe rapid switching; 24 finite cratered asteroid LODs with no hoops/sprites; persisted sky/mute/volume after reload; accessible credit link and mobile credit page.
- `browser-regression.cjs`: placement, income, training, save/load, invalid-save protection, raid/edit locks, cleanup, assault/retreat and desktop/mobile UI states.
- `browser-enhancements.cjs`: 95 model/tier combinations, camp/workshop/busy-builder limits, mixed troop classes and unlocks, save compatibility, invalid troops, hangar previews/dismissal, combat and mobile overflow. No JS/shader/HTTP failures observed.
- `browser-edge-cases.cjs`: all building factories, decorative reduced motion, upgrade/demolition and HQ defeat recovery.
- `browser-models.cjs`: all 19 live models have finite geometry, attached targeting nodes and a working inspect camera.
- `browser-optimized-assets.cjs`: the separate optional pack's three GLBs parse with their compressed textures; finite geometry/bounds; the mech's clip plays with finite skinning matrices.

JSON results are included in `test-artifacts/`. Screenshots were captured and visually inspected during development but excluded from the lightweight download. Optional asset validation results are also inside the separate optional pack.

## Visual inspection

Inspected restored DEEP/CORE GLBs, close-up cratered asteroid, normal cruise base/underbase, desktop/mobile settings with Credits, credit-page typography and earlier retained hangar/build/info/combat/gallery states. Background images retain 4096×2048 resolution. Texture encoding is lossy for colors and optional textures are resized; no assertion of zero quality loss is made.

## Source/data guards

Only `storage/browser-storage.js` accesses localStorage. Snapshot validation and shared configuration have no browser/rendering imports. Corrupt saves are rejected before replacing a base. Version/key compatibility is retained.

The GLB optimizer compares all non-image buffer bytes and mesh/node/accessor/skin/animation definitions against source data. Source files were not overwritten. Optional models are not loaded by the game's startup or combat. The standard-licensed Fire Planet is not redistributed.

## Re-running checks

Serve the game locally over HTTP. Developer tests need Node/Playwright and an installed browser; set `CHROMIUM_PATH` when needed. They are not game/runtime dependencies. Set `OPTIONAL_ASSETS_DIR` to the extracted optional-pack folder for model validation. Tests inject temporary state hooks; the shipped game exposes no debug controller.

Travel is presentation-only, not an actual arrival mission or backend feature. The local adapter is synchronous; a future asynchronous backend will require awaiting the save/load service and server-side authority/validation. No backend was created.

## Quaternius fleet edition

- Browser gameplay regression: four troop types, capacity/unlocks/costs, dismissal, mixed-fleet save/load, legacy saves, assault/retreat, raid cleanup, tiers and mobile hangar passed. Browser save-service tests passed.
- `tests/browser-quaternius.cjs`: all four designs finite, three imported hulls active, original Sentinel retained; complete GLBs exported and reloaded with local embedded textures; missing Striker asset falls back to original model. Expected abort error in the deliberate fallback test is excluded from normal-load errors.
- Source mesh/node/accessor definitions and every non-image bufferView byte range match the three uploaded glTF sources. Textures/materials are intentionally changed. See `test-artifacts/quaternius-geometry-validation.json`.
- Visual inspection: desktop/mobile fleet atelier, hangar, credits and settings; roof-mounted vent and dock/workshop crates. Camera auto-fits model bounds to prevent narrow-screen clipping. Fitting geometry is batched by material.
- No CDN or external asset requests at runtime. CC0 creator/source/license notices visible in credits. Existing CC BY background attribution retained.
- Synthetic Chromium/SwiftShader tests are not a benchmark for every GPU, phone or browser. The assembled fleet GLBs are static models; engine scale animations and game behavior are runtime code, not embedded animation clips.
