# Reconstruction review — September 2026

The previous city preserved useful planimetric data but reduced almost all buildings to two generic height classes, with five repeating window textures, flat roofs, sphere trees and arbitrary pole rows. Northern Hotel was only 7.6 m high. Old Town Square's pedestrian multipolygon was omitted. Sidewalk ribbons crossed road junctions. Scenario height scaling and color tinting changed historic landmarks indiscriminately.

The revised city retains **all 1,712 building footprint coordinate arrays and all 1,094 road/path alignments** without modification. The main fidelity changes are:

- 1,176 dominant-roof height estimates derived from the public 2013 USGS South Platte River LiDAR flight, with per-building sample counts/spread. Later conflicting mapped structures keep their newer height information.
- A 257 × 257 ground-classified terrain surface instead of 65 × 65 samples, and 4096 × 3498 USGS/USDA imagery exported in four georeferenced tiles.
- Four explicit landmark silhouettes: Northern Hotel, the Linden/Loomis corner, 1 Old Town Square, and Armstrong Hotel. References guide floor counts, painted/brick material families, projecting bays, roof features, cornices, awnings and blade signs. Dimensions and secondary details remain approximate.
- 746 detailed exposed facade edges; 11,798 separate upper-window assemblies/panels; 2,576 small ground-floor storefront bays. Shared party walls are filtered. Business names come from mapped records; frontage positions are inferred.
- 408 inferred pitched residential roofs for suitably rectangular low-rise footprints outside the core.
- 573 mapped street-object records, rendered benches, racks, lamps, bins, traffic signals and marked crossings; real Mason Street rail alignment; the missing Old Town Square pedestrian area and its holes.
- Sidewalk polygons carved around road and building boundaries to prevent concrete strips traversing intersections.
- 1,653 canopy candidates retained after LiDAR checks, with measured-return height estimates, forked trunks and layered leaf cutouts. Street shadows use a camera-centered extent.
- 96 Old Town/landmark buildings preserve height and material identity in every scenario, including the Canvas fallback. Changes outside the core remain visual massing, not modeled construction or zoning.

## Verification

`npm run build` checks source data shape, finite elevations and model coordinates, scenario composition/negation/unsupported input, upward road normals, bundled assets and source syntax. The geometry test inspects more than a million protected vertices and confirms no displacement at maximum 3× growth. A separate source comparison confirmed every footprint and road/path alignment remains unchanged.

Browser checks exercised initialization, Reality / Scenario / Compare, landmark navigation, walking controls, data disclosure, and unsupported requests. The available preview browser disables WebGL. Consequently browser GPU shader appearance, frame rate and actual browser 3D movement could not be visually verified. The clearly labeled aerial fallback was exercised instead.

The images in `results/` are **native geometry inspection renders**, not browser screenshots. `export-scene.mjs` executes the same JavaScript scene-building functions and exports their actual meshes and textures; `render-scene.py` uses a separate EGL PBR renderer. Cameras cover Northern Hotel, Linden/Walnut, Old Town Square, Armstrong/College and an aerial overview. Before/after street views use the preceding source revision and the revised geometry. Lighting differs from Three.js; these images verify geometry and visible detail, not final browser shading. The native renderer was adapted for alpha-cutout foliage and NumPy 2 compatibility.

## Remaining limitations

This remains a procedural reconstruction, not photogrammetry. Detailed secondary facade styles, window counts, roof forms, awnings, storefront dimensions and furniture orientation are estimates. Road widths are class-based. The LiDAR is from 2013, and later construction is only as complete as the available newer mapped tags. NAIP imagery has baked-in shadows, cars and canopy and can blur at eye level. Background terrain outside the modeled downtown remains simplified. The natural-language system is deliberately local and rule-based; disaster physics, arbitrary reconstruction, zoning and historical accuracy are not simulated. This update materially improves scale, recognizability and detail, but does not claim photorealism or a current survey.
