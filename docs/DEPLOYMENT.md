# Vercel deployment

Production domain: https://fort-collins.mattvildibill.com
Source: https://github.com/mattvildibill/fort-collins-worlds
Production branch: `main`.

`vercel.json` records the framework, build and output settings. This repository is connected to its own Vercel project; retain that Git connection. Vercel builds each push to `main`; other branches receive previews. No manual asset copy or Sites publishing is needed. The production branch is `main`. Migration was completed on September 29, 2026; Vercel reported successful deployments for all seven repositories.

Use Node.js 24. Run `npm ci` when a lockfile is present, then `npm run build`. No application secrets or database are required. Never commit `.env` files or Vercel credentials.

The portfolio links to each application in its own browser tab. Each project owns its runtime and assets. The optional embed bridge accepts only the portfolio origin and does not affect standalone navigation. Source attributions and model boundaries are retained.

Legacy hosted copies have not been deleted or redirected; existing shared links remain independent. New updates should be made in these GitHub repositories and deployed by Vercel; the legacy copies are retained for compatibility. If redirects are later installed on old hosts, preserve paths and query parameters.

## Assets

`asset-bundles/` stores lossless, SHA-256-verified assets recovered from the original source. `npm run assets:restore` restores them to their original paths; the build runs it automatically. Text source remains directly editable. Restore refuses to overwrite a modified local asset. To replace an asset, update and repack the bundles with `python scripts/pack-assets.py`; commit the resulting bundles and manifest.

## Browser editions and entry links

The startup entry checks WebGL capability before importing the 3D renderer. `?view=map` opens the Canvas map directly, without Three.js, terrain meshes or full-size aerial imagery. `?preset=green` applies the same Green streets preset as the visible button; combine both parameters when useful. The map renders on demand.

`dist/data/aerial-map.webp` is a 1280-pixel derivative of the unchanged source aerial JPG for the lightweight map. Regenerate with Pillow using `thumbnail((1280, 1280))` and WebP quality 80, method 6. Geographic bounds and credits are unchanged. No map view requests external tiles.
