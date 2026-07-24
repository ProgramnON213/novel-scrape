# 📜 Changelog

All notable changes to the **Novel Search (novel-scrape)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.3] - 2026-07-24

### Added
- **Custom Cache File CLI Flag (`--cache-file <path>`)**: Added `--cache-file` support to `clean-data.js` and `sync-novels.js` to allow custom cache file paths.

### Fixed
- **Test Link Cache Isolation**: Updated test suites (`clean-data.test.js` & `sync-novels.test.js`) to pass `--cache-file` pointing to isolated temporary cache files (`temp-test-*.json`) that are unlinked on teardown. Test runs now preserve production `public/link-cache.json` completely intact.

## [1.0.2] - 2026-07-24

### Added
- **Unified Backup Helper (`createBackup`)**: Added centralized `createBackup()` in `scripts/utils.js` supporting `--backup-dir <path>` custom output directories and `--no-backup` flag.
- **Backup Cleanup Tool (`clean-backups.js`)**: Added `scripts/clean-backups.js` and `npm run clean:backups` to detect and safely purge leftover test backup artifacts (<50KB).

### Fixed
- **Test Backup Isolation**: Refactored `clean-data.js`, `sync-novels.js`, and `sync-animestuff.js` to use `createBackup()`. Updated test suites (`clean-data.test.js` & `sync-novels.test.js`) to route backups to isolated temporary folders and clean them up on teardown, preventing future test clutter in `backup/`.

## [1.0.1] - 2026-07-24

### Fixed
- **Local Novel Sync Cache Integration**: Integrated `link-cache.json` support (`loadLinkCache`, `saveLinkCache`, `isUrlCachedAndValid`) into `scripts/sync-novels.js`. Network validation for new and updated cover/sourceUrl links now populates the local link cache to eliminate duplicate network calls on subsequent sync runs.
- **Sync Script Test Suite**: Added `scripts/sync-novels.test.js` to systematically verify link validation and cache persistence during local JSON synchronization.

## [1.0.0] - 2026-07-23

### Added
- **Tag Filter Engine**: Three-state genre tag filtering (Neutral → Include ✓ → Exclude ✕) with real-time grid updates.
- **Full-text Search**: Instant client-side search across titles, alternative titles, authors, publishers, translation groups, and genres.
- **Reading Progress Tracking**: Per-volume read checkboxes, progress counters (`X/Y read`), and library category badges (*Reading*, *Plan to Read*, *Completed*, *Dropped*).
- **Favorites & Priority Sorting**: Bookmark novels with ❤️ and automatically sort active *Reading* novels to the top of the grid.
- **Zero-Knowledge Cloud Synchronization**: Client-side AES-GCM 256-bit encryption with SHA-256 key hashing and Supabase `SECURITY DEFINER` RPC integration (`get_sync_data` / `set_sync_data`).
- **QR Code Pairing**: Offline local QR code generation via `qrious` and camera/image parsing via `jsQR`.
- **Local Backup System**: Export and import complete library state, favorites, reading progress, and theme choices via portable `.json` files.
- **Themes**: Built-in *Midnight Abyss*, *Sakura Cozy*, and *Cyberpunk Neon* CSS variable themes.
- **Database Maintenance Tooling**: Automated multi-source sync (`sync-novels.js`, `sync-animestuff.js`), link verification with 7-day TTL cache (`link-cache.json`), data cleansing (`clean-data.js`), and interactive terminal CLI (`cli.js`).
- **Architecture Documentation & ADRs**: Comprehensive documentation suite including ADR-001 through ADR-004, User Guide, Data Maintenance Guide, Architecture Guide, and Contributing guidelines.

### Changed
- Standardized genre tag casing and deduplication across all dataset entries.
- Consolidated single-module event delegation to eliminate listener leaks and improve grid re-rendering performance.

### Security
- Revoked all direct Supabase table permissions for `anon` and `authenticated` roles, enforcing narrow `SECURITY DEFINER` RPC function access.
- Implemented robust URI sanitization blocking malicious protocol schemes (`javascript:`, `data:`, `vbscript:`).
