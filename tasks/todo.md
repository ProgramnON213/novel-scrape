# Task List: Synopsis HTML Cleaning

- [ ] Task 1: Add `cleanSynopsis` helper function to `scripts/clean-data.js`.
  - Acceptance: `cleanSynopsis` correctly strips `<p>` tags, transforms `</p>` to paragraph breaks, standardizes `<br/>`, and handles collapsing.
  - Verify: Test function against custom inputs inside the script.
  - Files: `scripts/clean-data.js`

- [ ] Task 2: Integrate synopsis cleaning into the `run()` function.
  - Acceptance: Every entry's synopsis is processed, changes are logged, and total synopsis modifications are tracked.
  - Verify: Run dry run and see how many entries are modified.
  - Files: `scripts/clean-data.js`

- [ ] Task 3: Run dry-run to verify corrected synopsis outputs.
  - Acceptance: Run `npm run clean` and check the console logs for correctness.
  - Verify: Run `npm run clean`.
  - Files: `scripts/clean-data.js`

- [ ] Task 4: Execute clean write and verify build/tests pass.
  - Acceptance: Run `npm run clean:write` and verify results. Run `npm run build` and Playwright tests to ensure nothing is broken.
  - Verify: Check `public/data.json` for cleaned synopses, run Playwright test suite.
  - Files: `public/data.json`
