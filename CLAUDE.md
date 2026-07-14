# Project: Novel Search (novel-scrape)

A sleek, dark-themed static web app for browsing and downloading a personal light novel / web novel library. Built with vanilla HTML, CSS, and JavaScript, bundled by Vite, and deployed automatically to GitHub Pages.

## Tech Stack
- Frontend: HTML5, Vanilla CSS, Vanilla JavaScript (ES modules)
- Tooling: Vite (v8+), npm
- Libraries: `jsqr` (client-side QR code parsing)
- Cloud Storage / Sync: Supabase API (REST endpoints)
- Encryption: Client-side AES-GCM (Web Crypto API)
- Testing: Playwright (located in `browser-test/`)

## Commands
- Dev Server: `npm run dev`
- Production Build: `npm run build`
- Preview Build: `npm run preview`
- DB Sync Dry-Run: `npm run sync` or `node scripts/sync-novels.js [custom-path]`
- DB Sync Merge: `npm run sync:merge` or `node scripts/sync-novels.js [custom-path] --merge`
- Browser Test: `cd browser-test && npm install && node test.js`

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
