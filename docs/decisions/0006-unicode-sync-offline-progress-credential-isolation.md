# ADR-006: Unicode-Aware Sync Normalization, Offline Progress Tracking, and Credential Isolation

## Status
Accepted

## Date
2026-10-25

## Context
As the novel database and user library features expanded in v1.0.x, several resilience and security challenges emerged across multi-device sync, data maintenance scripts, and the frontend client:
1. **ASCII-Only Title Normalization**: Sync scripts (`sync-novels.js`, `sync-animestuff.js`, `utils.js`) used `[^a-z0-9]` to normalize novel titles for duplicate checking and volume matching. Non-ASCII titles (e.g. Japanese kanji/kana, accented romanizations, or titles composed primarily of punctuation) collapsed into empty strings `""`, creating false collision risks in hash maps or silently failing volume merges.
2. **Union-Only Cloud Progress Sync**: When synchronizing volume progress across devices via Supabase, volume arrays were merged using a naive set union (`Array.from(new Set([...local, ...remote]))`). As a result, if a user unchecked a previously read volume on one device, the cloud sync routine immediately re-added it on the next sync cycle. While ADR-003 specified a timestamped schema (`{ readVolumes, updatedAt }`), the client implementation had drifted to store bare arrays in certain paths.
3. **Sensitive Credential Exposure in Backups**: `exportBackup()` serialized the entire in-memory `settings` object directly into `novel-search-backup.json`. This inadvertently included client-side sync secrets (`syncKey`, `customSupabaseUrl`, `customSupabaseAnonKey`), exposing private encryption keys if users shared or archived their library files.
4. **Offline Resilience for Missing Covers**: Missing or broken novel covers previously attempted to load from an external placeholder service (`placehold.co`). When devices operated offline or in restricted network environments, image fallbacks failed to load and risked infinite `onerror` handler loops.
5. **Call-Stack Overflow on Cryptographic Encoding**: Encrypted cloud payloads converted `ArrayBuffer` to Base64 via `String.fromCharCode.apply(null, uint8Array)`. On large library states, this exceeded JavaScript engine argument limits, throwing `RangeError: Maximum call stack size exceeded`.

## Decision

We adopt the following architectural updates across frontend and sync scripts:

### 1. Unicode-Aware Normalization & Map Collisions
- Standardize `normalizeString()` in `scripts/utils.js` to strip Unicode punctuation, symbols, and whitespace using standard property escapes:
  ```javascript
  export function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, '');
  }
  ```
- Guard title-lookup maps (`normalizedTitleMap` / `normalizedTitlesMap`) in sync scripts against empty normalized keys (`if (!norm) return;`).
- Provide an exact raw title fallback when normalized volume matching yields empty strings.

### 2. Timestamped Volume Progress Tracking & Backward Compatibility
- Adhere strictly to ADR-003's timestamped progress schema:
  ```json
  {
    "progress": {
      "0000007": {
        "readVolumes": ["Volume 1", "Volume 2"],
        "updatedAt": 1774250000000
      }
    }
  }
  ```
- Implement migration and accessor helpers (`getProgress(novelId)` and `sanitizeProgress(progress)`) in `main.js` that normalize legacy string arrays into timestamped objects on read.
- Cloud sync reconciles progress entries based on `updatedAt` timestamps rather than blind set unions: if local state has a newer timestamp, its volume list supersedes the remote state (and vice versa), enabling unchecking volumes cleanly.

### 3. Credential Isolation in Backup Export/Import
- Explicitly sanitize the backup payload during `exportBackup()`:
  ```javascript
  const exportData = {
    version: settings.version || 1,
    library: settings.library || {},
    progress: settings.progress || {},
    theme: settings.theme || 'default'
  };
  ```
- Private sync credentials (`syncKey`, `customSupabaseUrl`, `customSupabaseAnonKey`) are never included in exported JSON files.
- `importBackup()` safely ingests library status and volume progress without mutating or resetting active cloud sync credentials.

### 4. Self-Contained Offline Cover Fallback
- Replace external network placeholder requests with an inline SVG data URI that renders reliably without network access:
  ```javascript
  const PLACEHOLDER_COVER_SVG = 'data:image/svg+xml;charset=utf-8,...';
  ```
- Guard `onerror` event delegation with `dataset.fallbackApplied` to prevent infinite re-triggering if the placeholder itself encounters an error.

### 5. Chunked Base64 Cryptographic Processing
- Replace unchunked `apply()` calls in `arrayBufferToBase64()` with a chunked loop (32,768 bytes per chunk) to eliminate call-stack limit crashes on large serialized library payloads.

## Alternatives Considered

- **Transliteration Libraries (e.g. `unidecode`)**: Rejected to maintain zero runtime and build-time script dependencies. Modern JavaScript native Unicode regex property escapes (`\p{P}`, `\p{S}`) provide complete international punctuation coverage.
- **Requiring Cloud Migration Database Schema Changes**: Rejected. All changes operate within the existing zero-knowledge AES-GCM encrypted envelope and Supabase RPC interface without altering database tables.
- **Exporting Encrypted Settings in Backups**: Rejected. User backup files are designed to be inspectable, portable JSON that users can read, edit, or migrate across different platforms.

## Consequences
- **Positive**:
  - Non-English and multi-lingual novel entries match accurately across sync data sources.
  - Multi-device progress synchronization reliably supports marking and unmarking read volumes.
  - User backup files can be safely shared and archived without leaking encryption keys or custom database credentials.
  - The application renders gracefully offline with zero external image service dependencies.
- **Negative / Operational Notes**:
  - Existing local storage containing legacy array progress will be automatically converted to timestamped objects upon access.
