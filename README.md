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

1. Open `public/data.json`.
2. Add, edit, or remove novel objects following the schema above.
3. Commit and push to `main` — the GitHub Actions workflow will rebuild and redeploy automatically.

> **`data.json` lives in `public/`** so Vite copies it verbatim into `dist/` without bundling it. This keeps it easy to diff and edit in-place.

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
