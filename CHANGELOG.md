# 📜 Changelog

All notable changes to the **Novel Search (novel-scrape)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
