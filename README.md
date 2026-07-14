# 📚 Novel Search

A sleek, dark-themed static web app for browsing and downloading a personal light novel / web novel library. Built with vanilla HTML, CSS, and JavaScript, bundled by Vite, and deployed automatically to GitHub Pages.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Full-text search** | Filter novels instantly by title, alternative title, author, or genre |
| **Tag filter system** | Three-state genre pills — **neutral → include (✓) → exclude (✕)** — that combine to show only what you want |
| **Novel cards** | Cover image, volume count, and completion status at a glance |
| **Detail modal** | Click any card to see synopsis, metadata, and per-volume EPUB / PDF download links |
| **Bulk copy** | "Copy All EPUB Links" / "Copy All PDF Links" buttons for mass downloading |
| **Glassmorphism UI** | Dark background with purple / orange gradient accents, backdrop blur effects |
| **Responsive** | Works on mobile and desktop; modal collapses to a single column on small screens |
| **Zero runtime deps** | No frameworks at runtime — `qrious` is bundled by Vite for local QR code generation; no external requests needed |
| **❤️ Favorites & Reading Status** | Mark novels as favorites and categorize them (Reading / Plan to Read / Completed / Dropped); filter the grid by library category via pill buttons |
| **🔖 Volume Progress Tracking** | Check off individual volumes as read; progress shown as `X/Y read` in the modal and on each card |
| **🎨 Themes** | Three built-in themes — *Midnight Abyss* (default), *Sakura Cozy*, *Cyberpunk Neon* — switchable from the header |
| **💾 Backup Export / Import** | One-click export of all library data (favorites, statuses, progress, theme) as a `.json` file; re-import on any device. Keyed by novel ID so backups stay valid even when `data.json` changes |
| **🔄 Zero-Knowledge Sync** | Secure, client-side encrypted sync using Supabase. Generate a Sync Key, scan a QR code (using camera or image upload), and keep your PC and mobile devices in sync with zero data leak risk |
| **📌 Reading-first sort** | Novels with **"Reading"** status always appear at the top of the grid |

---

## 🗂️ Project Structure

```
novel-scrape/
├── index.html          # App shell (header, grid, modal skeleton)
├── main.js             # All app logic — init, tag system, filtering, rendering, modal
├── style.css           # CSS custom properties + all component styles
├── vite.config.js      # Vite config (base: './' for GitHub Pages sub-path deploy)
├── package.json        # npm scripts: dev · build · preview
├── public/
│   └── data.json       # ⭐ The novel database (see schema below)
└── .github/
    └── workflows/
        └── deploy.yml  # CI/CD: build → upload → deploy to GitHub Pages on push to main
```

---

## 📄 Data Schema (`public/data.json`)

The app loads `data.json` at runtime. It must be a **JSON array** of novel objects at the top level.

```jsonc
[
  {
    "id": "0000007",                     // Unique string ID
    "title": "Christmas Comes Not For Us",
    "cover": "https://example.com/cover.jpg",  // Absolute URL to cover image
    "type": "Light Novel",              // "Light Novel" | "Korean Novel" | etc.
    "status": "Completed",             // "Completed" | "Ongoing" | "N/A" | etc.
    "genre": "Drama, Romance, Sci-fi", // Comma-separated; drives the tag filter system
    "alternative": "Boku to Kimi...",  // Original / romanized title (optional)
    "authors": "Fujimiya Kazuki",
    "artist": "Fal maro",
    "publisher": "N/A",
    "translationGroup": "Frosensama",
    "synopsis": "HTML string with <br/> tags allowed",
    "notes": "",                        // Internal notes, not displayed
    "recommended": "yes",              // "yes" | "no"  (not currently used in UI)
    "newUpdate": "yes",                // "yes" | "no"  (not currently used in UI)
    "addToFav": "yes",                 // "yes" | "no"  (not currently used in UI)
    "volumesCount": "1",              // Display string; can be "N/A"
    "volumes": [
      {
        "title": "Volume 1",
        "link1": "https://...",        // EPUB download link
        "link2": "https://..."         // PDF  download link
      }
    ]
  }
]
```

> **Tip for AI agents:** When adding or editing novels, keep `genre` as a comma-separated string (spaces after commas are trimmed automatically). The tag panel is built dynamically from all unique genres present in the data.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **npm**

### Installation

```bash
git clone https://github.com/<your-username>/novel-scrape.git
cd novel-scrape
npm install
```

### Development

```bash
npm run dev
```

Opens a Vite dev server at `http://localhost:5173` with hot-module replacement. `data.json` is served from `public/` automatically.

### Production Build

```bash
npm run build
```

Outputs a self-contained static site to `dist/`. The `vite.config.js` sets `base: './'` so all asset paths are relative, making the build portable whether deployed to a domain root or a sub-path like `username.github.io/novel-scrape/`.

### Preview Build Locally

```bash
npm run preview
```

Serves the `dist/` folder at `http://localhost:4173` to verify the production build before deploying.

---

## 🔄 Updating the Novel Database

The novel database (`public/data.json`) can be updated manually or by merging updates from another JSON file using the built-in CLI tool.

### Option 1: Manual Update
1. Open `public/data.json`.
2. Add, edit, or remove novel objects following the schema above.
3. Commit and push to `main` — the GitHub Actions workflow will rebuild and redeploy automatically.

### Option 2: Automated Sync & Merge Script
If you have a separate JSON file containing new novels or volume link updates, you can compare and merge it automatically.

1. **Compare/Dry-run**:
   - To compare with `new-data.json` at root:
     ```bash
     npm run sync
     ```
   - To compare with a **custom path**:
     ```bash
     node scripts/sync-novels.js path/to/your-file.json
     ```

2. **Merge Changes**:
   - To execute the merge and update `public/data.json` (this automatically validates the schema and creates a database backup in `backup/`):
     - With root `new-data.json`:
       ```bash
       npm run sync:merge
       ```
     - With a **custom path**:
       ```bash
       node scripts/sync-novels.js path/to/your-file.json --merge
       ```

> **`data.json` lives in `public/`** so Vite copies it verbatim into `dist/` without bundling it. This keeps it easy to diff, edit, and sync in-place.

---

## 🔄 Setup Cloud Synchronization (Supabase)

To sync your library across devices securely without creating a password-based account, the app uses a **Zero-Knowledge Sync Key** system powered by a free [Supabase](https://supabase.com) database.

### 🔒 Zero-Knowledge Security
* All settings and progress are encrypted in your browser using the **AES-GCM Web Crypto API** before upload.
* The decryption key (your **Sync Key**) remains on your device and is **never** sent to the cloud database.
* The database host only stores encrypted text — mathematically impossible to read in the event of a leak.
* Direct table access is **revoked** from all roles. The app can only call narrow, `SECURITY DEFINER` RPC functions, preventing enumeration or bulk data reads.

### 🛠️ Setup Instructions

1. **Create a Free Supabase Project**:
   Sign up at [Supabase](https://supabase.com) and create a new project.

2. **Create the Database Table & Secure RPC Functions**:
   Open the **SQL Editor** in your Supabase dashboard, open a **New query**, paste the SQL below, and click **Run**:
   ```sql
   CREATE TABLE public.sync_data (
     id TEXT PRIMARY KEY,          -- SHA-256 hash of your Sync Key
     payload TEXT NOT NULL,        -- AES-GCM encrypted JSON payload
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );

   -- Enable Row Level Security and revoke all default public table access
   ALTER TABLE public.sync_data ENABLE ROW LEVEL SECURITY;
   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.sync_data FROM anon, authenticated;

   -- Secure read RPC: only returns the row whose id exactly matches the provided key hash
   CREATE OR REPLACE FUNCTION get_sync_data(lookup_id TEXT)
   RETURNS TABLE (id TEXT, payload TEXT, updated_at TIMESTAMP WITH TIME ZONE)
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     RETURN QUERY SELECT s.id, s.payload, s.updated_at
       FROM public.sync_data s WHERE s.id = lookup_id;
   END;
   $$;

   -- Secure upsert RPC: inserts or updates only the row matching the provided key hash
   CREATE OR REPLACE FUNCTION set_sync_data(lookup_id TEXT, new_payload TEXT)
   RETURNS VOID
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     INSERT INTO public.sync_data (id, payload, updated_at)
     VALUES (lookup_id, new_payload, now())
     ON CONFLICT (id) DO UPDATE
       SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at;
   END;
   $$;

   -- Grant anonymous users permission to call the RPC functions (table access remains revoked)
   GRANT EXECUTE ON FUNCTION get_sync_data(TEXT) TO anon;
   GRANT EXECUTE ON FUNCTION set_sync_data(TEXT, TEXT) TO anon;
   ```
   > **Why RPCs instead of direct table access?**  
   > Revoking table access and exposing only narrow, parameterized functions prevents any client from listing, enumerating, or bulk-reading sync payloads belonging to other keys. Combined with client-side AES-GCM encryption, this makes the setup genuinely zero-knowledge.

3. **Enter Credentials in the App**:
   In your Supabase project go to **Settings → API**. Copy your **Project URL** and **Anon / Publishable Key**, then open the **Sync** panel in the app and paste them into the **Developer Credentials** section.

4. **Link Devices**:
   - On the first device: open **Sync** → click **Generate New Sync Key**. A Sync Key and QR code (generated locally — nothing is sent externally) will appear.
   - On additional devices: open **Sync** → scan the QR code with your camera or by uploading a screenshot of it, or paste the plain text key.

> ⚠️ **Keep your Sync Key safe.** Anyone with the key can decrypt your library data. There is no password-recovery mechanism — the key itself is the credential.

---

## 🚢 Deployment (GitHub Pages)

The workflow at `.github/workflows/deploy.yml` runs on every push to `main`:

1. **Checkout** → **Setup Node 20** → **`npm ci`** → **`npm run build`**
2. Upload `dist/` as a Pages artifact.
3. Deploy to GitHub Pages using the official `actions/deploy-pages` action.

**To enable GitHub Pages on a new fork:**
1. Go to **Settings → Pages**.
2. Set **Source** to `GitHub Actions`.
3. Push to `main`; the workflow handles the rest.

---

## 🎨 Design System

All design tokens live in the `:root` block of `style.css`:

| Variable | Value | Usage |
|---|---|---|
| `--bg-color` | `#0b0c10` | Page background |
| `--text-main` | `#ffffff` | Primary text |
| `--text-muted` | `#a0aab2` | Secondary / labels |
| `--accent-purple` | `#8a2be2` | Include tags, EPUB buttons, focus rings |
| `--accent-orange` | `#ff7f50` | Exclude tags, PDF buttons, hover glows |
| `--card-bg` | `rgba(255,255,255,0.05)` | Novel card background |
| `--glass-bg` | `rgba(20,20,30,0.6)` | Modal / input glassmorphism |

---

## 🏗️ Architecture Notes for AI Agents

- **`main.js` is a single module** — no bundler-split chunks or imports. All core logic lives here: `init()`, `buildTagSystem()`, `cycleTagState()`, `applyFilters()`, `renderGrid()`, `openModal()`, `exportBackup()`, `importBackup()`. `qrious` is dynamically imported only when the sync modal is opened.
- **Data flow:** `fetch(data.json)` → `novelsData[]` → `buildTagSystem()` populates `tagStates{}` → `applyFilters()` recomputes the filtered list → `renderGrid()` re-renders the DOM.
- **Tag state machine:** each genre cycles `neutral → include → exclude → neutral` on click. Filtering requires ALL included genres and NO excluded genres.
- **Modal is a singleton** — `openModal(novel)` rebuilds `modalBody.innerHTML` each time and re-attaches copy-button listeners. All dynamic content is HTML-escaped via `escapeHTML()` / `escapeSynopsis()` before binding to prevent DOM XSS.
- **No state management library** — mutable module-level variables (`novelsData`, `tagStates`, `activeLibFilter`) serve as the store.
- **`import.meta.env.BASE_URL`** is used when fetching `data.json`, so it works correctly under any Vite `base` path.
- **Personalization state** lives in a single `settings` object (`LS_SETTINGS_KEY = 'novel_settings'`) and is persisted to `localStorage`. All user data is keyed by `novel.id` (string) so it remains valid regardless of changes to `data.json`.
- **Themes** are implemented as CSS classes on `<body>` (`.theme-sakura`, `.theme-cyberpunk`). Default *Midnight Abyss* has no class — all variables are defined on `:root`. Adding a theme class overrides them.
- **Backup schema** is a plain JSON object with `version`, `library`, `progress`, and `theme` keys. The importer validates for `library` and `progress` keys before applying.
- **Sync flow:** settings are AES-GCM encrypted client-side using a SHA-256 hash of the Sync Key as both the encryption key and the Supabase row ID. All Supabase calls go through secure `SECURITY DEFINER` RPC functions (`get_sync_data` / `set_sync_data`); no direct table access is permitted. An `isSyncing` boolean lock prevents overlapping sync operations.
- **QR codes** are generated locally using the bundled `qrious` library — no external requests are made, so the Sync Key is never sent to a third-party service.

---

## 📝 License

ISC
