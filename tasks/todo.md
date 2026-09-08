# Task List: Branding Icon, Footer Source Attribution & 90-Day Cache TTL

- [x] Task 1: Update cache TTL to 90 days in `scripts/utils.js`, `scripts/clean-data.js`, `scripts/sync-novels.js`, and `scripts/sync-animestuff.js`
  - Acceptance: `CACHE_EXPIRY_MS` and default parameter in `isUrlCachedAndValid` use `90 * 24 * 60 * 60 * 1000` (90 days).
  - Verification: Grep for `CACHE_EXPIRY_MS` across `scripts/` to confirm all are 90 days.
  - Files: `scripts/utils.js`, `scripts/clean-data.js`, `scripts/sync-novels.js`, `scripts/sync-animestuff.js`

- [x] Task 2: Update unit test assertions in `scripts/utils.test.js` to match 90-day TTL
  - Acceptance: Expiry test assertions test 90-day expiration window (`NINETY_DAYS_MS`).
  - Verification: Run `node scripts/utils.test.js`.
  - Files: `scripts/utils.test.js`

- [x] Task 3: Create modern SVG book icon in `public/icon.svg`
  - Acceptance: Clean, aesthetic vector graphic representing an illuminated novel/book suitable as a favicon and brand mark.
  - Verification: File exists, valid SVG syntax.
  - Files: `public/icon.svg`

- [x] Task 4: Link favicon in `<head>` and brand icon in `<header>` of `index.html`
  - Acceptance: `<link rel="icon" type="image/svg+xml" href="/icon.svg">` is in `<head>`, and icon is integrated with `<h1>Novel Search</h1>`.
  - Verification: Inspect `index.html` markup and styling.
  - Files: `index.html`, `style.css`

- [x] Task 5: Add source attribution footer in `index.html` and style in `style.css`
  - Acceptance: Footer links to `https://esnovels.github.io/EsNovels1/index.html` and `https://animestuff.me/` with safe attributes (`target="_blank" rel="noopener noreferrer"`), styled with theme CSS variables.
  - Verification: Inspect `index.html` and `style.css`.
  - Files: `index.html`, `style.css`

- [x] Task 6: Run full verification suite and update documentation
  - Acceptance: `node scripts/utils.test.js`, `node scripts/clean-data.test.js`, and `npm run build` pass; `CHANGELOG.md` updated.
  - Verification: Run commands in shell.
  - Files: `CHANGELOG.md`
