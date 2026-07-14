# Implementation Plan: data.json Cleansing

## Overview
A Node.js script to clean, normalize, deduplicate, and prune `public/data.json`. Supports standard Preview/Dry-run mode by default and Write mode when `--write` or `--merge` is passed.

## Architecture Decisions
- Run in standard Node.js without runtime frameworks or heavy external libraries.
- Automate a timestamped backup in `backup/` before modifying `public/data.json` when run in Write mode.
- Restrict mojibake regex matching to non-ASCII character runs of length >= 5 to avoid corrupting valid Japanese/Unicode text.
- Match duplicates loosely by comparing normalized versions of titles/alternatives, keeping the entry with the higher count of non-empty `link1`/`link2` URLs.
- Prune entries if and only if they have no volumes AND no `sourceUrl`.

## Task List

### Phase 1: Cleansing & Normalization
- [ ] Task 1: Create script boilerplate, load JSON, argument checking (`--write` or `--merge`), and implement automatic backups.
- [ ] Task 2: Implement title mojibake healing using tested restricted character class regex.
- [ ] Task 3: Implement genre tag normalization reusing the existing project rules.

### Checkpoint: Cleansing
- [ ] Verify script performs title healing and tag sorting on dummy data correctly.

### Phase 2: Deduplication & Pruning
- [ ] Task 4: Implement crossover loose matching for deduplication and link completeness comparison.
- [ ] Task 5: Implement pruning of empty volumes/linkless entries (no vol AND no sourceUrl).
- [ ] Task 6: Save the cleaned array back to `public/data.json` when write is enabled, and print execution stats.
- [ ] Task 7: Integrate scripts into `package.json`.

### Checkpoint: Validation
- [ ] Cleaned database passes Vite build step.
- [ ] Playwright tests in `browser-test/` execute successfully.
