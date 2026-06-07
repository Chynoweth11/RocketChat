# CLAUDE.md

Guidance for working in this repository.

## What this is

**SubShield** — a business-insurance command center for contractors. Track
policies, renewals, certificates (COIs), documents, and partner-routed savings
in one place. React 19 + Vite 6, frontend-only with `localStorage` persistence.

> SubShield does not sell, quote, bind, or issue insurance. It organizes,
> tracks, and routes users to licensed partners.

## Commands

```bash
npm install
npm run dev       # Vite dev server on :5173
npm run build     # production build
npm run preview   # serve the build on :4173
npm run lint      # eslint
npm test          # vitest (run once)
npm run test:watch
npm run deploy:check   # lint + build
```

Node `>=20.19.0` (see `.nvmrc`). CI runs lint + test + build on push/PR to
`main` (`.github/workflows/ci.yml`).

## Architecture

- `src/main.jsx` → `src/App.jsx` (wraps app in `ErrorBoundary`) →
  `src/subshield/SubShieldComplete.jsx`.
- **`SubShieldComplete.jsx`** is the single stateful container: it owns all
  app data, derives memoized values, and holds every mutation handler
  (add/renew policy, send COI, request quote, settings, etc.). Views and modals
  are presentational and receive props/callbacks.
- The Dashboard view loads eagerly; **all other views and modals are
  `React.lazy` code-split** to keep the initial bundle small. Keep this pattern
  when adding new views/modals.
- **Routing:** top-level views are hash-routed (`#/policies`, etc.) via the
  `VIEWS` list + `viewFromHash()` in `SubShieldComplete.jsx`. Add new views to
  `VIEWS` so they're deep-linkable and back/forward works.
- **Heavy deps load on demand:** `pdfjs-dist` (in `pdfText.js` / `pdfExtraction.js`)
  and `tesseract.js` (OCR) are dynamically `import()`-ed only when a PDF is
  actually processed — never in a view's initial chunk. Preserve this.
- **PWA:** configured via `vite-plugin-pwa` in `vite.config.js` (manifest +
  Workbox service worker, auto-update). The heavy pdf chunks are excluded from
  precache to keep installs lean.
- **`src/subshield/utils.js`** holds all pure logic (no React/DOM beyond
  storage/clipboard): normalization, scoring, compliance matching, formatting,
  and `localStorage` read/write. Prefer adding pure helpers here and unit-test
  them.
- PDF handling lives in `pdfText.js` (extraction) + `insuranceParser.js`
  (parsing) + `pdfExtraction.js`; pulled in only by lazy modals so `pdfjs-dist`
  / `tesseract.js` never land in the initial bundle.

## Data

- Storage key: `subshield.complete.v6` (bump the suffix in `utils.js` when the
  shape changes incompatibly — it invalidates old cached data).
- `data.js` = **`initialData`**: a brand-new account is empty except for
  *platform* config (licensed `partners`, default roles, settings defaults).
- `sampleData.js` = a realistic populated dataset for demos/testing, loaded via
  the "Load demo data" control. **Demo/sample data is intentionally kept** while
  the app runs frontend-only; it will be replaced once the backend is wired up.
- `readStoredData` normalizes everything on load, so reducers can assume a
  consistent shape.

## Conventions

- CSS is one file: `src/subshield/styles.css`, all classes prefixed `ss-`.
- Icons come from `lucide-react`.
- `eslint` enforces `no-unused-vars` (warn). Keep imports at the top of files.
- Tests live in `src/subshield/__tests__`. `src/test/setup.js` installs an
  in-memory `localStorage` (Node's experimental global otherwise shadows
  jsdom's). Add coverage for new `utils.js` logic.
