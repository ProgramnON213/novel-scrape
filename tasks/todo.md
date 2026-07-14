# Task List: Database Cleansing

- [ ] Task 1: Create script boilerplate, load JSON, argument checking (`--write` or `--merge`), and implement automatic backups.
  - Acceptance: Script runs, reads `public/data.json`, and successfully writes a copy to `backup/data-clean-backup-[timestamp].json` only when `--write` or `--merge` is passed.
  - Verify: Run script, check for new backup file in `backup/`.
  - Files: `scripts/clean-data.js`

- [ ] Task 2: Implement title mojibake healing.
  - Acceptance: Restored version of titles replaces double/triple nested mojibake with standard quotes, apostrophes, and ellipses.
  - Verify: Verify on test string inside script.
  - Files: `scripts/clean-data.js`

- [ ] Task 3: Implement genre tag normalization.
  - Acceptance: Genre strings are split, standard mappings are applied (like in `sync-novels.js`), values are deduplicated and sorted alphabetically.
  - Verify: Verify on sample list of tags.
  - Files: `scripts/clean-data.js`

- [ ] Task 4: Implement crossover loose matching for deduplication.
  - Acceptance: Identifies duplicates by comparing normalized title/alternative combinations. Compares total links count (`link1` + `link2`) across all volumes to choose which entry to keep.
  - Verify: Run script on a test array containing synthetic duplicates.
  - Files: `scripts/clean-data.js`

- [ ] Task 5: Implement pruning of empty/linkless entries.
  - Acceptance: Removes entries with no volumes AND no `sourceUrl`.
  - Verify: Verify count of pruned entries matches expected.
  - Files: `scripts/clean-data.js`

- [ ] Task 6: Save back and print stats.
  - Acceptance: Cleaned database saved back to `public/data.json` if write is enabled and prints summary stats (total read, cleaned, deduped, pruned, saved).
  - Verify: Check `public/data.json` exists and parses as valid JSON.
  - Files: `scripts/clean-data.js`

- [ ] Task 7: Integrate scripts into `package.json`.
  - Acceptance: `npm run clean` runs in dry-run, `npm run clean:write` runs in write mode.
  - Verify: Run both npm scripts and confirm they behave as expected.
  - Files: `package.json`
