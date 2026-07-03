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
| **Zero runtime deps** | No frameworks, no external JS libraries — Vite is a dev/build tool only |
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
* The database host only stores encrypted text, meaning it is mathematically impossible for anyone to read your data in the event of a database leak.

### 🛠️ Setup Instructions

1. **Create a Free Supabase Project**:
   Sign up at [Supabase](https://supabase.com) and create a new project.
2. **Create the Database Table**:
   Open the **SQL Editor** in your Supabase dashboard, paste the following SQL commands, and click **Run**:
   ```sql
   create table public.sync_data (
     id text primary key, -- SHA-256 hash of the Sync Key
     payload text not null, -- Encrypted JSON payload
     updated_at timestamp with time zone default timezone('utc'::text, now()) not null
   );

   -- Enable Row Level Security
   alter table public.sync_data enable row level security;

   -- Allow anonymous access to payloads (since data is fully client-side encrypted anyway)
   create policy "Allow anon select" on public.sync_data for select using (true);
   create policy "Allow anon insert" on public.sync_data for insert with check (true);
   create policy "Allow anon update" on public.sync_data for update using (true);
   ```
3. **Configure Environment Variables**:
   In your repository root, create a `.env` file (or set GitHub Repository Secrets for automatic deployments) containing:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
   ```
   *Note: `VITE_SUPABASE_ANON_KEY` represents your Supabase project's client-side **Publishable API Key** (also referred to as the anon key).*
4. **Link Devices**:
   - Open **Sync** on one device and click **Generate New Sync Key** (which will display a Sync Key and QR Code).
   - Open the app on another device, click **Sync**, and scan the QR code (using camera stream or by uploading a screenshot of it), or paste the plain text key.

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

- **`main.js` is a single module** — no bundler-split chunks or imports. All logic lives here: `init()`, `buildTagSystem()`, `cycleTagState()`, `applyFilters()`, `renderGrid()`, `openModal()`, `exportBackup()`, `importBackup()`.
- **Data flow:** `fetch(data.json)` → `novelsData[]` → `buildTagSystem()` populates `tagStates{}` → `applyFilters()` recomputes the filtered list → `renderGrid()` re-renders the DOM.
- **Tag state machine:** each genre cycles `neutral → include → exclude → neutral` on click. Filtering requires ALL included genres and NO excluded genres.
- **Modal is a singleton** — `openModal(novel)` rebuilds `modalBody.innerHTML` each time and re-attaches copy-button listeners.
- **No state management library** — mutable module-level variables (`novelsData`, `tagStates`, `activeLibFilter`) serve as the store.
- **`import.meta.env.BASE_URL`** is used when fetching `data.json`, so it works correctly under any Vite `base` path.
- **Personalization state** lives in a single `settings` object (`LS_SETTINGS_KEY = 'novel_settings'`) and is persisted to `localStorage`. All user data is keyed by `novel.id` (string) so it remains valid regardless of changes to `data.json`.
- **Themes** are implemented as CSS classes on `<body>` (`.theme-sakura`, `.theme-cyberpunk`). Default *Midnight Abyss* has no class — all variables are defined on `:root`. Adding a theme class overrides them.
- **Backup schema** is a plain JSON object with `version`, `library`, `progress`, and `theme` keys. The importer validates for `library` and `progress` keys before applying.

---

## 📝 License

ISC
