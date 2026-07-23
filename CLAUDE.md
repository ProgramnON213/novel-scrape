# Project: Novel Search (novel-scrape)

A sleek, dark-themed static web app for browsing and downloading a personal light novel / web novel library. Built with vanilla HTML, CSS, and JavaScript, bundled by Vite, and deployed automatically to GitHub Pages.

## Tech Stack
- Frontend: HTML5, Vanilla CSS, Vanilla JavaScript (ES modules)
- Tooling: Vite (v8+), npm
- Libraries: `jsqr` (client-side QR code parsing), `qrious` (QR code generation)
- Cloud Storage / Sync: Supabase API (`SECURITY DEFINER` RPC endpoints)
- Encryption: Client-side AES-GCM (Web Crypto API)
- Testing: Playwright (located in `browser-test/`)

## Commands
- Dev Server: `npm run dev`
- Production Build: `npm run build`
- Preview Build: `npm run preview`
- CLI Control Panel: `npm run cli`
- DB Sync Dry-Run: `npm run sync` or `node scripts/sync-novels.js [custom-path]`
- DB Sync Merge: `npm run sync:merge` or `node scripts/sync-novels.js [custom-path] --merge`
- DB Clean Dry-Run: `npm run clean` (optional: `--check-links`)
- DB Clean Write: `npm run clean:write` (optional: `--check-links`)
- Run Clean Tests: `node scripts/clean-data.test.js`
- Browser Test: `cd browser-test && npm install && node test.js`

## Documentation & Architecture Decision Records (ADRs)
- [User Guide](file:///d:/Download/novel-scrape/docs/user-guide.md) — Comprehensive end-user guide for search, tags, sync, and backups.
- [Data Maintenance Guide](file:///d:/Download/novel-scrape/docs/data-maintenance-guide.md) — Script operations, database cleansing, multi-source syncing, and CLI panel.
- [Architecture Guide](file:///d:/Download/novel-scrape/docs/architecture.md) — Technical map, event delegation, and performance architecture for AI agents.
- [ADR Index](file:///d:/Download/novel-scrape/docs/decisions/):
  - [ADR-001: Framework-less Single Module Architecture](file:///d:/Download/novel-scrape/docs/decisions/0001-frameworkless-single-module-architecture.md)
  - [ADR-002: Zero-Knowledge AES-GCM Encryption with Supabase Sync](file:///d:/Download/novel-scrape/docs/decisions/0002-zero-knowledge-aes-gcm-supabase-sync.md)
  - [ADR-003: Id-Keyed Progress Tracking Schema](file:///d:/Download/novel-scrape/docs/decisions/0003-id-keyed-progress-tracking-schema.md)
  - [ADR-004: Genre Schema Normalization & Multi-Source Sync Pipeline](file:///d:/Download/novel-scrape/docs/decisions/0004-genre-schema-and-multi-source-sync.md)
- [Changelog](file:///d:/Download/novel-scrape/CHANGELOG.md) — Semantic versioning and version history.
- [Contributing Guide](file:///d:/Download/novel-scrape/CONTRIBUTING.md) — Branching, conventional commits, and verification workflow.

## Code Conventions
- **Single Module Architecture**: `main.js` is a single file module containing state, modal rendering, events, and sync engine. Avoid splitting `main.js` unless requested.
- **Vanilla CSS**: Do not use utility-first frameworks like Tailwind. Use custom properties, HSL colors, flexbox/grid, and transition properties in `style.css`.
- **CSS Variable Themes**: Themes are set via body classes (e.g., `.theme-sakura`, `.theme-cyberpunk`). The default theme (Midnight Abyss) resides directly on `:root`. Adding a body class overrides these variables.
- **State Management**: App state is stored in module-level variables (`novelsData`, `tagStates`, `activeLibFilter`) and local storage (`settings` object under `novel_settings`).
- **Id-Keyed Progress**: Library favorites and volume read progress are tracked by novel `id` to survive data updates.
- **Tag Casing and Normalization**: Use standardized tag names matching `scripts/sync-novels.js`. The tag selection UI is generated dynamically from unique genres in `data.json`.

## Boundaries & Constraints
- **Zero-Knowledge Privacy**: Decryption keys (`syncKey`) stay on the client device and are never sent to Supabase. Keep payload encryption/decryption robust.
- **No Cover fallback**: If a cover is missing or fails to load, track it in `settings.brokenCovers` and show the `https://placehold.co/...` placeholder.
- **Environment variables**: Use `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`.

## Example Snippet (Event Handling & Settings Update)
```javascript
function setLibEntry(novelId, patch) {
  const current = getLibEntry(novelId);
  const updatedPatch = { ...patch };
  if ('favorite' in patch && patch.favorite !== current.favorite) {
    updatedPatch.favoriteUpdatedAt = Date.now();
  }
  if ('status' in patch && patch.status !== current.status) {
    updatedPatch.statusUpdatedAt = Date.now();
  }
  settings.library[novelId] = { ...current, ...updatedPatch };
  saveSettings();
}
```
