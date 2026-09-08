# Implementation Plan: Branding Icon, Footer Source Attribution & 90-Day Cache TTL

## Overview
Implement branding improvements and operational optimizations:
1. Add an application icon (favicon and header icon) alongside the title "Novel Search".
2. Add a footer attributing novel sources to [EsNovels](https://esnovels.github.io/EsNovels1/index.html) and [Animestuff](https://animestuff.me/).
3. Extend the link validation cache TTL from 7 days to 90 days across scripts (`utils.js`, `clean-data.js`, `sync-novels.js`, `sync-animestuff.js`) and update tests and documentation accordingly.

## Architecture Decisions
- **Zero Runtime Dependencies**: Use a lightweight, clean SVG icon (`public/icon.svg`) and reference it via `<link rel="icon" type="image/svg+xml" href="/icon.svg">` and inline in the `<header>` next to the title.
- **Theme-Aware Styling**: Style the footer with semantic HTML (`<footer>`), CSS variables (`--text-secondary`, `--accent`, `--border-subtle`), and clean flexbox/grid layout so it harmonizes seamlessly with all three themes (Midnight, Sakura, Neon).
- **Cache TTL Extension**: Set `CACHE_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000` (90 days) across `scripts/utils.js`, `scripts/clean-data.js`, `scripts/sync-novels.js`, and `scripts/sync-animestuff.js` to avoid re-verifying working links unnecessarily.

## Task List

### Phase 1: Cache TTL Update (Foundation & Scripts)
- [x] Task 1: Update cache TTL to 90 days in `scripts/utils.js`, `scripts/clean-data.js`, `scripts/sync-novels.js`, and `scripts/sync-animestuff.js`.
- [x] Task 2: Update unit test assertions in `scripts/utils.test.js` to match 90-day TTL.
- [x] Task 3: Run `node scripts/utils.test.js` and `node scripts/clean-data.test.js` to ensure script tests pass.

### Phase 2: Frontend Icon & Branding
- [x] Task 4: Create a sleek, modern novel/book SVG icon in `public/icon.svg`.
- [x] Task 5: Link `icon.svg` as favicon in `index.html` and embed the brand icon in the header next to `<h1>Novel Search</h1>`.

### Phase 3: Footer Source Attribution
- [x] Task 6: Add a semantic `<footer>` in `index.html` with links to EsNovels and Animestuff.
- [x] Task 7: Style `.app-footer` in `style.css` using theme CSS variables, hover effects, and responsive layout.

### Phase 4: Verification & Documentation
- [x] Task 8: Update `CHANGELOG.md` with the new version and changes.
- [x] Task 9: Run `npm run build` to verify Vite bundle succeeds.

## Checkpoint: Verification
- [x] Unit tests pass: `node scripts/utils.test.js && node scripts/clean-data.test.js`
- [x] Vite build succeeds: `npm run build`
- [x] Visual verification of favicon, header icon, and footer links
