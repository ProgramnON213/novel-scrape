# 🏗️ Architecture & AI Agent Context Guide

This document provides a technical map of the **Novel Search** architecture, component boundaries, state flow, performance optimizations, and security contracts for human developers and AI coding assistants.

---

## 🏛️ System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BROWSER UI                                │
│                                                                        │
│   ┌──────────────┐    ┌─────────────────┐    ┌────────────────────┐    │
│   │ Search Bar   │    │ 3-State Genre   │    │ Library Category   │    │
│   │ (Full-text)  │    │ Tag Pills (✓/✕) │    │ Filter Pills       │    │
│   └──────┬───────┘    └────────┬────────┘    └─────────┬──────────┘    │
│          │                     │                       │               │
│          └─────────────────────┼───────────────────────┘               │
│                                ▼                                       │
│                    ┌───────────────────────┐                           │
│                    │ Filter Engine (main.js)│                          │
│                    └───────────┬───────────┘                           │
│                                │                                       │
│                                ▼                                       │
│                 ┌─────────────────────────────┐                        │
│                 │   Grid Renderer (#novelGrid)│                        │
│                 └──────────────┬──────────────┘                        │
│                                │                                       │
│                                ▼                                       │
│                 ┌─────────────────────────────┐                        │
│                 │   Detail Modal (#modalBody) │                        │
│                 └─────────────────────────────┘                        │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
    ┌─────────────────────────┐     ┌────────────────────────┐
    │  localStorage           │     │ Supabase Zero-Knowledge│
    │  ('novel_settings')     │     │ Cloud Sync (AES-GCM)   │
    └─────────────────────────┘     └────────────────────────┘
```

---

## 📁 Source File Map

| File | Purpose | Single-File Constraint |
|---|---|---|
| [`index.html`](file:///d:/Download/novel-scrape/index.html) | HTML shell, modal skeletons, search input, tag container, grid container | Must remain clean semantic HTML |
| [`main.js`](file:///d:/Download/novel-scrape/main.js) | Complete application logic module (state, filters, modal, storage, sync) | **Strict single-file frontend module**. Do not split into sub-files without ADR |
| [`style.css`](file:///d:/Download/novel-scrape/style.css) | Custom CSS variables, themes (`:root`, `.theme-sakura`, `.theme-cyberpunk`), grid, modal, glassmorphism | **Vanilla CSS only**. No Tailwind or utility-first preprocessors |
| [`public/data.json`](file:///d:/Download/novel-scrape/public/data.json) | Static novel catalogue array served verbatim by Vite | Modifiable via sync/cleansing scripts |

---

## ⚡ Performance Optimization Architecture

1. **Pre-Parsed Genre Normalization**:
   - Genres are pre-split and lowercased upon initialization (`_genreList` and `_rawGenreList`) to avoid string split operations during fast typing search loops.
2. **Tag Array Caching**:
   - Active included (`cachedIncludedTags`) and excluded (`cachedExcludedTags`) genre arrays are recomputed only when a tag pill is clicked, rather than inside every search comparison loop.
3. **Single-Pass Sorting & Partitioning**:
   - The search filter partitions novels with **"Reading"** status to the top of the grid in a single array traversal.
4. **Event Delegation Singletons**:
   - Click handlers, volume progress checkboxes, and image fallback check listeners are attached once to static containers (`#novelGrid` and `#modalBody`). Individual cards and volume list items do not register separate event listeners.
5. **Camera Frame Downscaling**:
   - The QR code scanner downscales camera video frames (max width 600px) on an offscreen canvas before invoking `jsQR`, preventing UI stutter during scanning.

---

## 🔒 Security & Privacy Architecture

- **HTML Sanitization**: All user-facing text strings are sanitized via `escapeHTML()` and `escapeSynopsis()` before DOM injection.
- **Link Sanitization**: Download and source links are checked against harmful protocols (`javascript:`, `data:`, `vbscript:`) and stripped of non-printable control characters.
- **Zero-Knowledge Cryptography**:
  - SHA-256 key hashing derives the lookup ID (`lookup_id`) for cloud storage.
  - AES-GCM 256-bit encryption encrypts all local library settings prior to network transport.
  - Supabase table access is revoked (`REVOKE SELECT, INSERT, UPDATE, DELETE`); communication is isolated to `SECURITY DEFINER` RPC functions (`get_sync_data`, `set_sync_data`).
