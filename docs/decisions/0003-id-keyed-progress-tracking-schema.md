# ADR-003: Id-Keyed Progress Tracking and LocalStorage Persistence Schema

## Status
Accepted

## Date
2026-07-23

## Context
The app allows users to mark novels as favorites, categorize them into library statuses (*Reading*, *Plan to Read*, *Completed*, *Dropped*), track per-volume read progress (e.g. Volume 1 read, Volume 2 read), and record timestamped updates.

Because the underlying catalog database (`public/data.json`) undergoes periodic synchronization, reordering, duplicate pruning, and novel additions, user state must never rely on array indices or volatile title strings.

## Decision
We implement an **Id-Keyed State Storage and Backup Schema**:
1. **Id-Keyed Objects**: User settings are stored in `localStorage` under key `novel_settings`. Library categories, favorites, and volume progress are keyed by the novel's unique string ID (`novel.id`).
2. **Decoupled Progress Schema**:
   ```json
   {
     "version": 1,
     "theme": "midnight",
     "library": {
       "0000007": {
         "status": "reading",
         "favorite": true,
         "favoriteUpdatedAt": 1774250000000,
         "statusUpdatedAt": 1774250000000
       }
     },
     "progress": {
       "0000007": {
         "readVolumes": ["Volume 1", "Volume 2"],
         "updatedAt": 1774250000000
       }
     }
   }
   ```
3. **Resilient Merging**:
   - When `data.json` is updated or reordered, user reading statuses remain 100% intact because lookup is performed by `novel.id`.
   - Backup export writes the JSON payload directly to a local `.json` file. Backup import validates for mandatory keys (`library`, `progress`) before deep-merging or replacing local state.

## Alternatives Considered

### Array Index Tracking
- **Pros**: Minimal code.
- **Cons**: Extremely fragile — inserting or deleting a novel in `data.json` shifts all array indices and corrupts user progress.
- **Rejected**: Array indexing is completely unsuitable for dynamic data.

### Title-Based Keying
- **Pros**: Human readable keys.
- **Cons**: Title changes, romanization updates, or typos corrupt progress matching.
- **Rejected**: Unique string IDs (`novel.id`) ensure stability across title changes.

## Consequences
- **High Data Integrity**: Users can safely pull catalogue updates via sync scripts without losing their reading history.
- **Portable Backups**: Exported `.json` files can be safely transferred across devices or restored at any point.
