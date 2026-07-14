# Project Rules: Novel Search (novel-scrape)

These rules apply to AI agents working on the novel-scrape project.

## Technology Guidelines
- **Zero Runtime Frameworks**: Keep the application framework-less (no React, Vue, Svelte, Tailwind CSS, etc.). Stick to vanilla HTML5, CSS3, and ES Module JavaScript.
- **Single File JS**: Avoid introducing new files or code splitting in the frontend logic. All core features (UI interaction, local settings, encryption, Supabase synchronization) must be kept in [main.js](file:///d:/Download/novel-scrape/main.js).
- **CSS Architecture**: Keep styles clean, modern, and structured in [style.css](file:///d:/Download/novel-scrape/style.css). Do not use inline styles unless generating dynamic placements. Use CSS variables for colors, spacing, and transitions to ensure theme switches work correctly.

## Data & Database Sync Guidelines
- **Genre Schema**: Keep tag names clean and standard. When adding/merging new entries, always run [sync-novels.js](file:///d:/Download/novel-scrape/scripts/sync-novels.js) via `npm run sync:merge`.
- **Database Modifiers**: Avoid manually modifying `public/data.json` without standardizing keys (e.g., lowercase key formatting, lowercase comma-separated `genre` strings with standard casing).
- **Backups**: Ensure backups are created by sync scripts automatically before database writes.

## Local Storage & Sync Guidelines
- **Offline First**: All user settings, reading statuses, and volume progress must be saved locally. If sync fails, the client should continue working offline seamlessly.
- **Crypto Privacy**: Do not leak the key used for cryptographic AES-GCM data encryption.

## Verification
- Run `npm run build` to verify the Vite bundle completes without issues.
- Verify changes visually or write tests in `browser-test/test.js` using Playwright.
