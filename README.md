# Fort Collins · Alternate Worlds

[Live explorer](https://fort-collins.mattvildibill.com) · [Matt Vildibill’s portfolio](https://mattvildibill.com)

I love Fort Collins. This is a way to explore its downtown and try a few “what if” versions of the same place. It uses bundled Three.js, public geospatial data, photo-guided landmarks, and a local scenario interpreter. Production is static `dist/`; no API key or installation is needed to use the hosted explorer.

## Geographic base

- 1,712 City of Fort Collins / Esri Community Maps footprints, CC BY 4.0: https://www.arcgis.com/home/item.html?id=f8720e8e65534e09a8f0e7a134970229
- 1,094 road/path segments, 66 parking polygons, street objects, railway and plaza geometry: © OpenStreetMap contributors, ODbL, https://www.openstreetmap.org/copyright
- USGS/USDA NAIP aerial imagery exported at 4096 × 3498 pixels.
- 1,176 robust roof-height estimates and a 257 × 257 ground grid from USGS South Platte River Lot 2a, **2013 capture**, sampled from Microsoft Planetary Computer COPC assets. This is dated evidence, not a current survey.
- Architectural photograph credits, dates, visual notes and dataset references: `dist/data/references.json`. Per-building roof evidence: `dist/data/height-evidence.json` and `city.json`.
- Local origin -105.0768°, 40.5877°; extent [-105.088, 40.580, -105.068, 40.593].

All source footprint and road coordinates are preserved. The detailed core has individual storefronts and windows, landmark features, mapped street furniture, a restored Old Town Square polygon, filtered canopy heights and intersection-aware paving. Façade geometry and secondary architectural details remain estimates, rather than photographic facade scans.

## Scenario preservation

`dist/scenario.js` interprets supported changes locally: transportation, canopy, parking-to-park conversions, roofs, building massing, seasons, weather and lighting. Footprints, alignments and landmark positions remain fixed. The 96 protected Old Town/landmark buildings also retain their height and material identity; growth applies outside this core. Historic worlds are explicitly historic-inspired. No unrestricted AI generator, construction model, traffic solver or disaster physics is claimed.

## Reproducibility and checks

`npm run dev` serves the local project. The Places selector works on every screen; Green streets is a one-click starting point. The scenario editor starts closed so the city stays in view. Compare has a separate, keyboard-accessible divider. `?preset=green` opens that preset directly, and `?view=map` opens the lightweight aerial edition. `npm run build` validates data, source syntax, normals, scenarios and immutable core geometry, plus UI state, repeated toggles, hidden-panel recovery and inline prompt validation. `qa/REVIEW.md` records the critical review, inspected viewpoints, remaining limitations and the distinction between native geometric rendering and browser WebGL verification. Browser checks cover the aerial edition and responsive controls. A separate 1280 × 800 browser pass rendered the 3D baseline and Green streets comparison using Chromium’s software WebGL renderer. Hardware frame rates, Safari/iOS and physical-device behavior remain unverified.

Data workflow: `prepare_data.py` establishes the original compact geographic base; `refine_data.py` adds photograph-informed architecture and mapped objects from a supplied OSM XML extract; `derive_lidar.py` consumes spatially cropped COPC point arrays; `supplement_geometry.py` restores relation-based plaza and rail geometry; `refine_roofs.py` and `refine_paving.py` create explicitly inferred roof and pavement details. Python processing uses NumPy, SciPy, Shapely, pyproj, laspy and Pillow. These are authoring dependencies only, not runtime requirements.

Native inspection requires `@napi-rs/canvas` (set `QA_NODE_ROOT` to its install directory), pyrender, modern PyOpenGL, NumPy, and Pillow. Exported geometry is temporary; reviewed images are retained under `qa/results/`. No generated assets or source data depend on a live third-party request during exploration.

### Browser regression checks

With the local server running, `python scripts/check-browser.py --url http://127.0.0.1:5176` exercises portrait, compact-height and landscape layouts, pointer/keyboard comparison, places, scenario negation, dialogs and error recovery. It requires Python Playwright and Chromium. These tests explicitly exercise the map edition with WebGL disabled; they do not establish GPU fidelity or real-device frame rates. The regression also verifies that the map path does not request Three.js, terrain or the full-size aerial image and stops scheduling animation frames while idle.
