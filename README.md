# STELLAR CLASH — Licensed Skyboxes / Modular Saves Edition

Standalone Three.js game, with no backend or build step. All runtime assets and libraries are local. This release restores the two uploaded Jungle Jim backgrounds under their verified, listed CC BY 4.0 licenses and includes visible attribution.

## Run on Windows

Extract into a **new folder**, open `stellar-clash`, run `start-game.bat` with Python installed, and visit **http://localhost:8000**. Alternatively run `py -m http.server 8000` or `python -m http.server 8000`. Keep the server window open. Do not double-click `index.html`: browser ES modules and GLB fetches need HTTP. Hard refresh if reusing the previous server address. On another port, use that port in the address.

## Backgrounds and credits

- **DEEP** uses Alien Space Nebula 2 (Skybox); **CORE** uses Alien Space Nebula 1 (Skybox), by **Jungle Jim (@jungle_jim)**, listed as **CC BY 4.0** on their source pages.
- Optimized GLBs are included in `assets/skyboxes/`. Panorama resolution stays **4096×2048**. JPEG encoding is lossy, at high quality; source files were not overwritten. The unused CORE PBR channel was removed from its material binding.
- Original geometry/layer transforms remain. Runtime normalization selects color/emissive maps, not the packed roughness image, strips embedded lights/cameras and uses opaque unlit interior materials. This avoids the prior wrong-material/blank-background failure.
- Both skies load on demand and are cached. Token-based switching prevents a slower previous request from replacing the latest choice. Original procedural skies remain as backups if a GLB cannot load; a message identifies fallback use.
- Settings → **ASSET CREDITS** opens `credits.html`. Keep this page, `ASSET-CREDITS.md` and the license/source links when distributing. No creator endorsement is implied. CC BY 4.0 permits commercial use/modification with credit, a license link and change notice; it does not require contacting the creator or give a universal IP warranty.

## Separate client-side persistence

All browser storage is isolated under `storage/`:

```text
storage/
  browser-storage.js  # guarded read/write adapter; the only localStorage access
  save-state.js       # snapshot serialization, validation, versions, preferences
```

`main.js` contains only the manual save/load buttons and application of validated data to the live scene. No storage API calls or JSON save serialization remain there. The adapter can later be replaced without coupling browser persistence to the rendering modules.

- SAVE BASE preserves energy, crystal, wave, building type/cell/level/HP, troop type/home/HP.
- `stellar-clash` and version 3 remain unchanged; legacy version 1/2 interceptor saves still load. Invalid data is rejected **before** clearing the current base.
- Sky selection, mute and volume are immediately persisted separately in `stellar-preferences`. The previous `stellar-sky` preference is migrated when new preferences are absent.
- This is local browser storage, **not a backend/cloud account**, and manual saves are not autosaves. Clearing browser site data can erase saves. A different browser/profile/server origin (including port) has separate saves.
- RESET BASE resets the active base/fleet but does not delete a saved snapshot. Preferences are independent of a base snapshot. No battle or temporary visual-effect state is saved.

## Reworked asteroids

`enhancements/asteroids.js` replaces the old neon-shard/ring planetoids:

- Seeded, elongated, asymmetric boulders, with three real crater depressions/rims per rock.
- Original basalt, iron-rich and granite-like multiscale surface/relief textures.
- Small inset mineral specks rather than large glowing crystal cones; no billboard halos or orbital hoops.
- Sparse rubble clusters drawn using instancing, and near/far geometry LOD for each boulder.
- Slow drift/spin; decorative motion obeys reduced-motion settings.

Editable texture generator: `tools/generate-rock-textures.py` (optional developer dependency NumPy/Pillow; no runtime dependency).

## Retained gameplay

19 live structure types have five visual tiers. Fleet Camp capacity, Builder Workshop availability, Interceptor/Siege Bomber/Sentinel Drone/Strike Cruiser training, the 3D hangar, dismissal, defense/offense and legacy saves remain supported. Camps do not train troops; Barracks/Starports unlock troop classes at levels 1/2/3/4. Troops cost 1/2/3/5 camp space respectively. Max camp space is 160; max builders is 12. Construction uses a short deployment animation; training and upgrades are instant. Dismissal has no refund.

`model-gallery.html` previews the 19 live models and tiers. `models/glb/` contains the original 17 base-level building exports only.

## Other uploaded GLBs

A **separate optional pack**, not loaded in this game's startup or battles, contains optimized CC BY 4.0 copies of the supplied Catfish Mech, Cool Alien Spaceship and Sci-Fi Materials GLB. Texture resolution is capped at 2048; color maps are JPEG-compressed; resized data/normal maps use lossless WebP encoding. Geometry, skinning and animation byte ranges are retained. It requires a loader with `EXT_texture_webp` support, which the included GLTFLoader and modern Chromium support. Close-up textures can differ from the original 4K maps; this is not a claim of zero quality loss or mesh decimation.

The **Fire Planet** uses **Free Standard**, not CC BY. It is not redistributed as a raw model here because the standard license restricts stand-alone redistribution/extraction; the game's original procedural planets remain. The separately sold full material pack is not included.

The spaceship creator asks for a project link for public/commercial uses. Sending one is recommended as a courtesy, though CC BY itself does not require notification. See `ASSET-CREDITS.md` for source links and changes.

## QA and developer tools

See `QA.md`, `tests/`, and JSON results in `test-artifacts/`. Browser tests require Node/Playwright and a local server; they are not runtime dependencies. Use `CHROMIUM_PATH` for your installed browser. To validate the separate asset pack, set `OPTIONAL_ASSETS_DIR` to its extracted folder before running `tests/browser-optimized-assets.cjs`.

`tools/optimize-glb.py` documents the reproducible texture-first optimization. It asserts unchanged non-image buffer bytes and mesh/node/accessor/skin/animation definitions. The source uploads remain untouched. No external CDN/font/icon/audio dependency is used. Three.js remains MIT licensed; retain `libs/LICENSE.txt`. No project-wide license change was made.

## Forward-cruise presentation and future backend boundary

The base now feels like it is cruising toward an outbound waypoint. `enhancements/cruise.js` supplies passing dust, restrained star streaks, a distant navigation light and subtle underbase drive plumes. The asteroids drift through safe outer lanes. Decorative travel stops in reduced-motion mode.

**The simulation does not translate the base or building cells.** Travel is a presentation effect, so saved placement coordinates and combat distances stay stable. It does not add a backend, navigation mission or actual destination arrival mechanic.

Pure configuration and snapshot validation are separated from rendering:

```text
config/
  game-rules.js       # grid, placement bounds and building definitions
  unit-rules.js       # troop costs, HP, unlocks and combat stats
storage/
  browser-storage.js # browser-specific read/write adapter
  snapshot-schema.js # pure versioned save validation; no DOM/Three.js/storage
  save-state.js      # capture, serialization, migration and preference service
```

A future server can import the pure rules/schema without loading Three.js. The current adapter/service is synchronous because localStorage is synchronous. An asynchronous HTTP/IndexedDB adapter will also need `await` in the thin save/load UI handlers; it is not a drop-in synchronous network implementation. No endpoint/authentication/session system has been created. A real backend should be authoritative and validate purchases/combat, not blindly trust a browser snapshot.
