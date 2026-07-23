# 🛠️ Novel Search Data Maintenance & Scripting Guide

This guide covers database maintenance, data cleansing, sync operations, and command-line tooling for `novel-scrape` administrators, maintainers, and AI agents.

---

## 🗃️ Database File Structure

- **Primary Database**: [`public/data.json`](file:///d:/Download/novel-scrape/public/data.json) — Served statically by Vite and read by `main.js`.
- **Backups Directory**: `backup/` — Automatic timestamped snapshots (`data-backup-YYYY-MM-DD-THH-MM-SS.json`) created before any write operation.
- **Link Verification Cache**: [`public/link-cache.json`](file:///d:/Download/novel-scrape/public/link-cache.json) — 7-day TTL cache for network-checked cover image URLs and source page links.

---

## 💻 Database Commands Overview

All commands are defined in [`package.json`](file:///d:/Download/novel-scrape/package.json):

| Command | Script Target | Description |
|---|---|---|
| `npm run cli` | `scripts/cli.js` | Interactive menu-driven CLI control panel |
| `npm run sync` | `scripts/sync-novels.js` | Dry-run comparison with root `new-data.json` |
| `npm run sync:merge` | `scripts/sync-novels.js --merge` | Merge updates into `public/data.json` with backup |
| `npm run sync:animestuff` | `scripts/sync-animestuff.js` | Dry-run comparison with animeStuff catalogue |
| `npm run sync:animestuff:merge` | `scripts/sync-animestuff.js --merge` | Merge animeStuff entries with backup |
| `npm run sync:animestuff:fetch` | `scripts/sync-animestuff.js --fetch` | Fetch remote animeStuff catalogue & dry-run |
| `npm run sync:animestuff:fetch:merge` | `scripts/sync-animestuff.js --fetch --merge` | Fetch remote catalogue & merge into `data.json` |
| `npm run clean` | `scripts/clean-data.js` | Dry-run database cleansing & genre tag normalization |
| `npm run clean:write` | `scripts/clean-data.js --write` | Execute database cleansing with backup |

---

## 🔄 Merging External Data

### 1. Merging Standard Novel Schemas (`sync-novels.js`)
To merge a JSON payload containing novel objects or updated volume links:
```bash
# Compare custom file (dry-run)
node scripts/sync-novels.js path/to/external-data.json

# Execute merge with automatic backup creation
node scripts/sync-novels.js path/to/external-data.json --merge
```

### 2. Merging animeStuff Catalogues (`sync-animestuff.js`)
To import or update entries from an animeStuff catalogue format:
```bash
# Fetch remote catalogue and merge automatically
npm run sync:animestuff:fetch:merge
```
- Existing entries matched by title will inherit updated `sourceUrl` and validated `cover` links.
- New entries receive sequential string IDs (`"0000XXX"`) and are prepended to the dataset.
- Modified records receive `newUpdate: "yes"`.

---

## 🧹 Database Cleansing (`clean-data.js`)

`scripts/clean-data.js` standardizes database formatting across four distinct phases:
1. **Title & Synopsis Cleanup**: Strips double spaces, normalizes HTML `<p>` tags into `<br/>` breaks, collapses redundant line breaks.
2. **Genre Normalization**: Capitalizes and standardizes genre strings into clean comma-separated lists.
3. **Duplicate Detection & Inheritance**: Merges duplicate records by title, ensuring surviving entries inherit missing volume links or `sourceUrl` references.
4. **Pruning Empty Entries**: Removes entries lacking both volumes and synopsis.

### Executing Cleansing
```bash
# Preview changes without modifying files
npm run clean

# Apply changes and generate timestamped backup in backup/
npm run clean:write

# Execute with network link verification for covers and source URLs
npm run clean:write -- --check-links
```

---

## 🖥️ Interactive CLI Control Panel (`cli.js`)

Launch the terminal control panel for interactive maintenance:
```bash
npm run cli
```
Features:
- Menu selection for all sync, fetch, merge, and clean commands.
- Interactive prompts to toggle link verification (`--check-links`).
- Instant status logging and backup confirmation.
