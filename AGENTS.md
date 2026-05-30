# skpxr - Pixi.js to Skia CanvasKit Wrapper

## Project Structure
- **Main package**: `src/` → builds to `dist/` via Vite
- **Example app**: `example/` (depends on main via `file:..`)
- **Vendor dependency**: `vendor/canvaskit-wasm/` (vendored CanvasKit WASM, not npm installed)

## Build & Verification
```bash
npm run build      # Vite + postbuild.js (copies WASM to dist/canvaskit/)
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint on src/**/*.ts
npm run test:run   # Vitest (no tests exist yet; jsdom environment)
```

`npm run lint:fix` and `npm run format` available.

## Vendor Setup
CanvasKit WebAssembly is vendored locally. The `build` script requires `vendor/canvaskit-wasm/canvaskit.wasm` to exist. If missing, it will error during build.

## Key Path Aliases
- `canvaskit-wasm` → `./vendor/canvaskit-wasm/index.js` (Vite and tsconfig)
- `@/*` → `src/*`

## Git Hooks
- `lint-staged` runs on `src/*.{ts,tsx}` (eslint --fix + prettier)
- `commitlint` enforces conventional commits

## Example App
Use `npm run dev:example`, `npm run build:example`, `npm run preview:example` from root.

### Example Structure
Examples in `example/src/examples/` implement `Example` interface:
- Each example renders via Pixi.js legacy AND Skia backend side-by-side
- `BaseExample` provides common setup: dual canvases, FPS tracking, shared scene
- Examples use `SceneFactory.createRandomGraphicsNoEvents()` / `createRandomSpriteNoEvents()` for shapes without pointer events
- Drawer UI in `index.html` lists examples; `ExamplesController` handles switching