# STELLAR CLASH — Space Base Builder

A Clash-of-Clans-style base builder set in deep space, rendered in 3D with three.js. Fully offline — every asset is served locally.

## Play

Serve the folder with any static server and open it in a browser:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Features

- **Base building** on a 21×21 orbital pad — resource, defense and army structures with ghost preview, placement grid and deploy animations.
- **Defense raids** — waves of enemy drones attack your base; turrets, Tesla coils, railguns and shield projectors fight back.
- **Attack mode** — train interceptors at Barracks/Starport and send your fleet to raid an AI outpost for loot.
- **Upgrades & economy** — 5 levels per building, resource capacity, income ticks, save/load/reset via localStorage.
- **Nebula sky domes** — real glTF skyboxes loaded from `3dmodels/` (switch between DEEP / CORE in ⚙ Settings).
- **Crystal asteroid field** — procedurally deformed planetoids with glowing crystal veins, auras and debris rings.
- **Image-based lighting** — HDRI environment + UnrealBloom post-processing.

## Project layout

```
index.html            HUD / UI (resource tubes, build tray, settings)
main.js               game logic (three.js scene, raid/attack AI, effects)
libs/                 vendored three.js r160 + addons (GLTFLoader, RGBELoader, OrbitControls, postprocessing)
3dmodels/             GLB nebula skyboxes
assets/hdri.hdr       environment lighting
images/               nebula / planet / station textures
```
