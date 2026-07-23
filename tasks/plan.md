# Implementation Plan: Repository Cleanup & Code Simplification

## Overview
Decompose and execute the audit cleanup tasks: removing leftover log and scratch files, updating `tasks/` documents, pruning legacy unused novel schema properties, and consolidating shared script utilities into `scripts/utils.js`.

## Architecture Decisions
- **Safe Data Pruning**: Legacy flags (`recommended`, `newUpdate`, `addToFav`) are pruned during `npm run clean:write`, which automatically generates a timestamped backup in `backup/`.
- **Utility Centralization**: Common string normalization and JSON formatting helpers are centralized in `scripts/utils.js` for both `sync-novels.js` and `sync-animestuff.js`.

## Task List

### Phase 1: Repository Cleanup & Artifact Removal
- [ ] Task 1: Remove leftover `scraping_log.txt` and `scratch_processed_urls.json`.
- [ ] Task 2: Create task tracking documents in `tasks/plan.md` and `tasks/todo.md`.

### Phase 2: Schema Pruning & Data Cleansing
- [ ] Task 3: Add legacy flag pruning to `scripts/clean-data.js` and execute `npm run clean:write`.

### Phase 3: Script Deduplication & Refactoring
- [ ] Task 4: Centralize shared normalization helpers in `scripts/utils.js` and refactor `scripts/sync-animestuff.js`.

### Checkpoint: Verification
- [ ] Run `npm run build`
- [ ] Run `node scripts/clean-data.test.js`
- [ ] Run `cd browser-test && node test.js`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Unintended schema property deletion | Low | Automatic timestamped backup saved in `backup/` before clean write |
| Refactoring break in sync script | Medium | Run unit test suite and dry-run comparisons before committing |
