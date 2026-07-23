# Task List: Repository Cleanup & Code Simplification

- [ ] Task 1: Delete leftover `scraping_log.txt` and `scratch_processed_urls.json`
  - Acceptance: `scraping_log.txt` and `scratch_processed_urls.json` are deleted from workspace.
  - Verification: `git status` shows files removed.
  - Files: `scraping_log.txt`, `scratch_processed_urls.json`

- [ ] Task 2: Create task tracking documents in `tasks/`
  - Acceptance: `tasks/plan.md` and `tasks/todo.md` accurately document current tasks.
  - Verification: View files in `tasks/`.
  - Files: `tasks/plan.md`, `tasks/todo.md`

- [ ] Task 3: Add legacy flag pruning to `scripts/clean-data.js` and execute clean write
  - Acceptance: Legacy flags (`recommended`, `newUpdate`, `addToFav`) are removed from entries in `public/data.json`; backup is created in `backup/`.
  - Verification: Check `public/data.json` entry keys; run `node scripts/clean-data.test.js`.
  - Files: `scripts/clean-data.js`, `public/data.json`

- [ ] Task 4: Centralize shared normalization helpers in `scripts/utils.js` and refactor `scripts/sync-animestuff.js`
  - Acceptance: Shared functions in `scripts/sync-animestuff.js` import from `scripts/utils.js` without code duplication.
  - Verification: Run `npm run sync:animestuff` dry-run.
  - Files: `scripts/utils.js`, `scripts/sync-animestuff.js`

- [ ] Task 5: Run full project verification
  - Acceptance: Vite build compiles without error, test suite passes cleanly.
  - Verification: `npm run build` and `node scripts/clean-data.test.js`.
  - Files: Entire repository
