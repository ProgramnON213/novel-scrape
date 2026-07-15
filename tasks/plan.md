# Implementation Plan: Synopsis HTML Cleaning

## Overview
A task to add synopsis HTML cleaning to `scripts/clean-data.js` to convert `<p>` tags into `<br/>` spacing.

## Architecture Decisions
- Parse and process `synopsis` within the existing cleansing pipeline.
- Target `<p>` tags with regex to replace them with double `<br/>` breaks for paragraph separation.
- Enforce cleanup rules: collapse 3+ consecutive `<br/>` tags, standardize tag case/slashes, and trim leading/trailing HTML breaks.

## Task List

### Phase 1: Implementation
- [ ] Task 1: Add `cleanSynopsis` helper function to `scripts/clean-data.js`.
- [ ] Task 2: Integrate synopsis cleaning into the `run()` mapping function and track statistics.

### Phase 2: Verification
- [ ] Task 3: Run dry-run to verify corrected synopsis outputs.
- [ ] Task 4: Execute clean write and verify build/tests pass.
