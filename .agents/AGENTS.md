# Project Rules: Novel Search (novel-scrape)

These rules apply to AI agents working on the novel-scrape project.

## Technology Guidelines
- **Zero Runtime Frameworks**: Keep the application framework-less (no React, Vue, Svelte, Tailwind CSS, etc.). Stick to vanilla HTML5, CSS3, and ES Module JavaScript (see [ADR-001](file:///d:/Download/novel-scrape/docs/decisions/0001-frameworkless-single-module-architecture.md)).
- **Single File JS**: Avoid introducing new files or code splitting in the frontend logic. All core features (UI interaction, local settings, encryption, Supabase synchronization) must be kept in [main.js](file:///d:/Download/novel-scrape/main.js).
- **CSS Architecture**: Keep styles clean, modern, and structured in [style.css](file:///d:/Download/novel-scrape/style.css). Do not use inline styles unless generating dynamic placements. Use CSS variables for colors, spacing, and transitions to ensure theme switches work correctly.

## Data & Database Sync Guidelines
- **Genre Schema**: Keep tag names clean and standard. When adding/merging new entries, always run [sync-novels.js](file:///d:/Download/novel-scrape/scripts/sync-novels.js) via `npm run sync:merge` (see [ADR-004](file:///d:/Download/novel-scrape/docs/decisions/0004-genre-schema-and-multi-source-sync.md)).
- **Database Modifiers**: Avoid manually modifying `public/data.json` without standardizing keys (e.g., lowercase key formatting, lowercase comma-separated `genre` strings with standard casing).
- **Backups**: Ensure backups are created by sync scripts automatically in `backup/` before database writes.

## Local Storage & Sync Guidelines
- **Offline First**: All user settings, reading statuses, and volume progress must be saved locally (see [ADR-003](file:///d:/Download/novel-scrape/docs/decisions/0003-id-keyed-progress-tracking-schema.md)). If sync fails, the client should continue working offline seamlessly.
- **Crypto Privacy**: Client-side AES-GCM encryption with SHA-256 key hashing must remain intact (see [ADR-002](file:///d:/Download/novel-scrape/docs/decisions/0002-zero-knowledge-aes-gcm-supabase-sync.md)). Do not leak the key used for cryptographic data encryption.

## Documentation & Versioning Guidelines
- **Documentation**: Refer to [User Guide](file:///d:/Download/novel-scrape/docs/user-guide.md), [Data Maintenance Guide](file:///d:/Download/novel-scrape/docs/data-maintenance-guide.md), and [Architecture Guide](file:///d:/Download/novel-scrape/docs/architecture.md).
- **Changelog & Versioning**: Update [CHANGELOG.md](file:///d:/Download/novel-scrape/CHANGELOG.md) following Semantic Versioning whenever shipping user-visible changes or new features.
- **Contributing**: Follow the workflow described in [CONTRIBUTING.md](file:///d:/Download/novel-scrape/CONTRIBUTING.md).

## Verification
- Run `npm run build` to verify the Vite bundle completes without issues.
- Run `node scripts/clean-data.test.js` to verify data cleansing test assertions pass.
- Verify changes visually or run tests in `browser-test/test.js` using Playwright.
