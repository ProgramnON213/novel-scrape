# ADR-004: Genre Schema Normalization and Multi-Source Merging Pipeline

## Status
Accepted

## Date
2026-07-23

## Context
Novel data originates from multiple sources (e.g., manual entry, EsNovels catalogue, animeStuff catalogue). Differences in genre tag casing, duplicate titles, broken cover links, and HTML paragraph formatting lead to inconsistent filtering UI and degraded user experience.

Requirements:
- Ensure consistent tag names across all database records so the 3-state tag filter engine functions cleanly.
- Support multi-source merging without losing volume links or `sourceUrl` references.
- Validate network cover images and source page links with intelligent caching to avoid network spamming.
- Automatically safeguard against data loss during batch database updates.

## Decision
We implement a **Standardized Cleansing, Link Verification, and Backup Sync Pipeline**:
1. **Genre Schema Standardization**:
   - Genre strings are stored as standardized, comma-separated title-cased tags (e.g. `"Action, Drama, Sci-Fi"`).
   - Duplicate tags within an entry are deduplicated, and obsolete synonyms are mapped automatically during sync/cleansing.
2. **Intelligent Duplicate Merging & Field Inheritance**:
   - When merging incoming records (`sync-novels.js` or `sync-animestuff.js`), existing novels matched by normalized title inherit missing metadata (such as `sourceUrl` or valid cover image URLs).
   - `newUpdate: "yes"` flags are appended to modified records so the UI highlights updated titles.
3. **Automated Database Backups**:
   - Every execution of `clean-data.js --write` or `sync-novels.js --merge` automatically writes a timestamped snapshot of `public/data.json` to `backup/data-backup-YYYY-MM-DD-THH-MM-SS.json`.
4. **Shared Link Cache with 7-Day Expiration**:
   - Network verification (`--check-links`) caches tested HTTP HEAD/GET responses in `public/link-cache.json`.
   - Verified valid links are cached for 7 days, eliminating redundant network traffic across CLI executions.

## Alternatives Considered

### Direct In-Place Database Editing without Validation
- **Pros**: Quick edits.
- **Cons**: Risks corrupted JSON syntax, broken image URLs, duplicate tags, and catastrophic data loss with no rollback path.
- **Rejected**: Scripted pipeline with automatic backups guarantees safety.

## Consequences
- **Clean Tag UI**: The dynamic genre pill system operates on clean, standardized tags without duplicate or malformed pills.
- **Data Safety**: Backups created in `backup/` ensure instant recovery if any sync introduces unintended changes.
- **Efficient Network Checks**: The local link cache prevents rate limits and speeds up repeated cleansing runs.
