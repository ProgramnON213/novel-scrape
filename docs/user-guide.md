# 📖 Novel Search User Guide

Welcome to **Novel Search**, a dark-themed static web application for managing, filtering, and reading your light novel and web novel library.

---

## 🔍 Searching & Filtering

### 1. Full-Text Search
- Use the top search bar to search instantly across **novel titles**, **alternative titles**, **authors**, **artists**, **publishers**, **translation groups**, or **genres**.
- Search queries filter the grid dynamically with sub-100ms response time.

### 2. Three-State Genre Tag System
Click any genre pill at the top to toggle its filter state:
- **Neutral (Gray)**: No filter applied for this genre.
- **Include (Purple ✓)**: Show **only** novels containing this genre.
- **Exclude (Orange ✕)**: Hide **any** novel containing this genre.

> 💡 **Tip**: Combining multiple **Include** tags requires a novel to have *all* included genres. Adding an **Exclude** tag strictly filters out unwanted themes.

---

## 📚 Library Management & Volume Progress

### 1. Library Categories & Favorites
- Open any novel detail modal by clicking its grid card.
- Click **Add to Favorites (❤️)** to bookmark a novel.
- Set a **Library Status**:
  - **Reading**: Marked with high priority; always sorted to the top of your library grid.
  - **Plan to Read**: Saved for future reading.
  - **Completed**: Finished novels.
  - **Dropped**: Discontinued reads.
- Filter the main grid by library category using the top category status pills (**Reading**, **Favorites**, **Plan to Read**, **Completed**, **Dropped**).

### 2. Volume Progress Tracking
- Inside the detail modal, each volume contains a checkbox alongside EPUB and PDF download links.
- Check off completed volumes to update your progress.
- Progress badges (e.g. `3/12 read`) appear both on the novel card in the grid and inside the modal header.

---

## 🔄 Zero-Knowledge Cloud Synchronization

Sync your reading progress, favorites, and volume checkmarks across your devices (PC, mobile, tablet) without creating a password-based account.

### Step 1: Initial Supabase Setup (One-Time)
1. Create a free account at [Supabase](https://supabase.com) and start a new project.
2. Open the **SQL Editor** in your Supabase dashboard, paste the SQL schema script provided in [README.md](file:///d:/Download/novel-scrape/README.md#setup-cloud-synchronization-supabase), and click **Run**.
3. In Supabase **Settings → API**, copy your **Project URL** and **Anon Key**.
4. In Novel Search, open the **Sync Modal (🔄)**, scroll to **Developer Credentials**, and paste the URL and Anon Key.

### Step 2: Generating or Linking a Sync Key
- **Device 1 (Primary)**: Click **Generate New Sync Key**. A 256-bit key and QR code will display.
- **Device 2 (Secondary)**: Open **Sync Modal (🔄)** → scan the QR code using your device camera or upload a QR image, or manually paste the Sync Key text.

> 🔒 **Security Guarantee**: All data is encrypted with AES-GCM in your browser before transmission. The decryption key never leaves your device. Supabase hosts only encrypted ciphertext and narrow `SECURITY DEFINER` RPC functions (`get_sync_data` / `set_sync_data`).

---

## 💾 Local Backups

- **Export Backup**: Click **Export Backup** in the header to download a timestamped `.json` file containing all your favorites, library statuses, volume progress, and active theme settings.
- **Import Backup**: Click **Import Backup** to restore your library state on any computer or browser.
- Data is stored locally in `localStorage` under key `novel_settings` and keyed by `novel.id`.

---

## 🎨 Theme Customization

Switch between built-in themes from the header dropdown:
- 🌌 **Midnight Abyss** (Default sleek dark mode with purple/orange gradients)
- 🌸 **Sakura Cozy** (Soft warm tones)
- ⚡ **Cyberpunk Neon** (Vibrant high-contrast dark theme)
