# Building assets

Original, stylized sci-fi architecture created for Stellar Clash. Generated locally; no external model pack is required.

## Files

- `building-factory.js`: editable Three.js model constructors, PBR material/texture generation, articulated parts and static-mesh batching.
- `glb/`: reusable, self-contained GLB copies in neutral static poses, with embedded color/identification textures.
- `model-manifest.json`: exact triangle counts, mesh-batch counts, byte sizes and GLB round-trip results.
- `../model-gallery.html`: interactive preview of the live model constructors.

| File | Structure |
|---|---|
| command.glb | Command Center |
| extractor.glb | Crystal Extractor |
| reactor.glb | Fusion Reactor |
| solar.glb | Solar Array |
| drill.glb | Deep Drill |
| storage.glb | Storage Vault |
| wall.glb | Defense Wall |
| turret.glb | Laser Turret |
| pulse.glb | Pulse Tower |
| missile.glb | Missile Battery |
| cannon.glb | Plasma Cannon |
| tesla.glb | Tesla Coil |
| sniper.glb | Railgun |
| shield.glb | Shield Projector |
| barracks.glb | Barracks |
| starport.glb | Starport |
| habitat.glb | Crew Habitat |

## Usage

Serve the project over HTTP as documented in the main README. No model downloads or runtime npm packages are required. The game creates its animated building meshes synchronously from the factory module. The GLB copies can be imported separately into compatible editors or loaded with the included GLTFLoader.

GLB copies preserve meshes, component transforms, PBR colors, embedded color textures and applicable clearcoat/emissive/unlit extensions. They use scalar roughness approximations instead of the live factory's separate brushed roughness map. Renderer-specific bloom, shadows, procedural animation and game logic are not embedded in GLB files. Enable shadow casting on imported meshes in your renderer if needed.

Model roots use Y-up, with ground level at Y=0. Dynamic assemblies remain separate nodes; callbacks and game metadata live in the JavaScript factory, not in exported files. Shared procedural textures are cached; per-building materials/geometry can be safely disposed by the game without destroying other models' textures.

These GLB reference assets contain only the 17 original base-level buildings. The live game now uses `../enhancements/buildings.js` for five-tier fittings and camp/workshop variants. Backgrounds are original procedural panoramas in `../assets/original/`; no downloaded background GLBs are needed.
