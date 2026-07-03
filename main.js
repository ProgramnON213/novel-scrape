import jsQR from 'jsqr';

/* ============================================================
   CONSTANTS
   ============================================================ */
const LS_SETTINGS_KEY = 'novel_settings';
const SETTINGS_VERSION = 1;
const READING_STATUS_OPTIONS = ['', 'Reading', 'Plan to Read', 'Completed', 'Dropped'];
const THEMES = ['theme-midnight', 'theme-sakura', 'theme-cyberpunk'];

/* ============================================================
   STATE
   ============================================================ */
let novelsData = [];
// tagStates: { [tagName]: 'neutral' | 'include' | 'exclude' }
const tagStates = {};
let activeLibFilter = 'all'; // 'all' | 'favorite' | 'Reading' | 'Plan to Read' | 'Completed' | 'Dropped'

/**
 * Settings persisted to localStorage.
 * {
 *   version: 1,
 *   library: { [novelId]: { favorite: boolean, status: string } },
 *   progress: { [novelId]: string[] },   // array of read volume titles
 *   theme: string,
 *   hideNoCover: boolean,
 *   brokenCovers: string[]
 * }
 */
let settings = loadSettings();
let brokenCovers = new Set(settings.brokenCovers || []);
let filterTimeout;

/* ============================================================
   DOM REFS
   ============================================================ */
const grid            = document.getElementById('novelGrid');
const searchInput     = document.getElementById('searchInput');
const modal           = document.getElementById('novelModal');
const modalBody       = document.getElementById('modalBody');
const closeBtn        = document.querySelector('.close-btn');
const tagToggleBtn    = document.getElementById('tagToggleBtn');
const tagPanel        = document.getElementById('tagPanel');
const tagContainer    = document.getElementById('tagContainer');
const activeTagCount  = document.getElementById('activeTagCount');
const clearTagsBtn    = document.getElementById('clearTagsBtn');
const resultsSummary  = document.getElementById('resultsSummary');
const exportBtn       = document.getElementById('exportBtn');
const importFile      = document.getElementById('importFile');
const libPills        = document.querySelectorAll('.lib-pill');
const themePills      = document.querySelectorAll('.theme-pill');
const hideNoCoverBtn  = document.getElementById('hideNoCoverBtn');
const syncBtn         = document.getElementById('syncBtn');
const syncModal       = document.getElementById('syncModal');
const syncModalBody   = document.getElementById('syncModalBody');
const syncCloseBtn    = document.getElementById('syncCloseBtn');
const qrFileInput     = document.getElementById('qrFileInput');
const siteTitle       = document.querySelector('header h1');

/* ============================================================
   SETTINGS — LOAD / SAVE / DEFAULTS
   ============================================================ */
function defaultSettings() {
  return {
    version: SETTINGS_VERSION,
    library: {},
    progress: {},
    theme: 'theme-midnight',
    hideNoCover: false,
    brokenCovers: [],
    syncKey: null,
    syncLastTime: null,
    customSupabaseUrl: '',
    customSupabaseAnonKey: ''
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    // Migrate: ensure all keys exist
    return {
      version: SETTINGS_VERSION,
      library: parsed.library  || {},
      progress: parsed.progress || {},
      theme: parsed.theme       || 'theme-midnight',
      hideNoCover: parsed.hideNoCover !== undefined ? parsed.hideNoCover : false,
      brokenCovers: parsed.brokenCovers || [],
      syncKey: parsed.syncKey || null,
      syncLastTime: parsed.syncLastTime || null,
      customSupabaseUrl: parsed.customSupabaseUrl || '',
      customSupabaseAnonKey: parsed.customSupabaseAnonKey || ''
    };
  } catch {
    return defaultSettings();
  }
}

let syncTimeout = null;
function scheduleSync() {
  if (!settings.syncKey) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    if (typeof syncData === 'function') syncData();
  }, 2000);
}

function saveSettings() {
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
  scheduleSync();
}

/* ============================================================
   THEME
   ============================================================ */
function applyTheme(themeName) {
  // Remove all theme classes, then add selected one
  THEMES.forEach(t => document.body.classList.remove(t));
  if (themeName !== 'theme-midnight') {
    document.body.classList.add(themeName);
  }
  settings.theme = themeName;
  saveSettings();
  // Update active pill
  themePills.forEach(p => {
    p.classList.toggle('active', p.dataset.theme === themeName);
  });
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
async function init() {
  applyTheme(settings.theme);

  if (hideNoCoverBtn) {
    hideNoCoverBtn.classList.toggle('active', !!settings.hideNoCover);
  }

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data.json?t=${new Date().getTime()}`);
    novelsData = await response.json();
    buildTagSystem();
    applyFilters();
  } catch (error) {
    console.error('Error fetching data:', error);
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--accent-orange);">Error loading novels data.</p>';
  }
}

/* ============================================================
   TAG SYSTEM
   ============================================================ */
function buildTagSystem() {
  const allGenres = new Set();
  novelsData.forEach(novel => {
    if (novel.genre) {
      novel.genre.split(',').forEach(g => allGenres.add(g.trim()));
    }
  });

  const sortedGenres = [...allGenres].sort();
  tagContainer.innerHTML = '';

  sortedGenres.forEach(genre => {
    tagStates[genre] = 'neutral';
    const pill = document.createElement('span');
    pill.className = 'tag-pill';
    pill.dataset.tag = genre;
    pill.dataset.state = 'neutral';
    pill.textContent = genre;
    pill.addEventListener('click', () => cycleTagState(genre, pill));
    tagContainer.appendChild(pill);
  });
}

function cycleTagState(tag, pill) {
  const current = tagStates[tag];
  const next = current === 'neutral' ? 'include' : current === 'include' ? 'exclude' : 'neutral';
  tagStates[tag] = next;
  pill.dataset.state = next;
  updateTagUI();
  applyFilters();
}

function updateTagUI() {
  const active = Object.values(tagStates).filter(s => s !== 'neutral').length;
  if (active > 0) {
    activeTagCount.textContent = active;
    activeTagCount.classList.remove('hidden');
    clearTagsBtn.classList.remove('hidden');
  } else {
    activeTagCount.classList.add('hidden');
    clearTagsBtn.classList.add('hidden');
  }
}

function clearAllTags() {
  Object.keys(tagStates).forEach(tag => { tagStates[tag] = 'neutral'; });
  document.querySelectorAll('.tag-pill').forEach(pill => { pill.dataset.state = 'neutral'; });
  updateTagUI();
  applyFilters();
}

function resetAllFilters() {
  // Clear search input
  searchInput.value = '';
  
  // Clear tag states & UI
  Object.keys(tagStates).forEach(tag => { tagStates[tag] = 'neutral'; });
  document.querySelectorAll('.tag-pill').forEach(pill => { pill.dataset.state = 'neutral'; });
  updateTagUI();

  // Reset library filter to 'all'
  activeLibFilter = 'all';
  libPills.forEach(pill => {
    pill.classList.toggle('active', pill.dataset.lib === 'all');
  });

  // Close modals
  closeModal();
  if (syncModal && syncModal.classList.contains('show')) {
    syncModal.classList.remove('show');
  }

  // Re-apply filters
  applyFilters();
}

/* ============================================================
   LIBRARY HELPERS
   ============================================================ */
function getLibEntry(novelId) {
  return settings.library[novelId] || { favorite: false, status: '' };
}

function setLibEntry(novelId, patch) {
  settings.library[novelId] = { ...getLibEntry(novelId), ...patch };
  saveSettings();
}

function getProgress(novelId) {
  return settings.progress[novelId] || [];
}

function setProgress(novelId, readTitles) {
  settings.progress[novelId] = readTitles;
  saveSettings();
}

/* ============================================================
   FILTERING & SORTING
   ============================================================ */
function applyFilters() {
  const term = searchInput.value.toLowerCase();
  const includedTags = Object.entries(tagStates).filter(([, s]) => s === 'include').map(([t]) => t.toLowerCase());
  const excludedTags = Object.entries(tagStates).filter(([, s]) => s === 'exclude').map(([t]) => t.toLowerCase());

  let filtered = novelsData.filter(novel => {
    // Hide no cover
    const isBroken = !novel.cover || novel.cover === '' || brokenCovers.has(novel.id);
    if (settings.hideNoCover && isBroken) return false;

    // Text search
    if (term) {
      const matches =
        novel.title.toLowerCase().includes(term) ||
        (novel.alternative && novel.alternative.toLowerCase().includes(term)) ||
        (novel.genre && novel.genre.toLowerCase().includes(term)) ||
        (novel.authors && novel.authors.toLowerCase().includes(term));
      if (!matches) return false;
    }

    // Tag filters
    const novelGenres = novel.genre
      ? novel.genre.split(',').map(g => g.trim().toLowerCase())
      : [];

    if (includedTags.length > 0 && !includedTags.every(tag => novelGenres.includes(tag))) return false;
    if (excludedTags.length > 0 && excludedTags.some(tag => novelGenres.includes(tag))) return false;

    // Library filter
    const entry = getLibEntry(novel.id);
    if (activeLibFilter === 'favorite') return entry.favorite;
    if (activeLibFilter !== 'all') return entry.status === activeLibFilter;

    return true;
  });

  // Sort: "Reading" novels first, then rest in original order
  filtered = [
    ...filtered.filter(n => getLibEntry(n.id).status === 'Reading'),
    ...filtered.filter(n => getLibEntry(n.id).status !== 'Reading'),
  ];

  renderGrid(filtered);
}

function scheduleRefilter() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    applyFilters();
  }, 50);
}

/* ============================================================
   RENDERING
   ============================================================ */
function renderGrid(novels) {
  grid.innerHTML = '';

  // --- results summary ---
  const totalTiles   = novels.length;
  const totalVolumes = novels.reduce((sum, n) => sum + (parseInt(n.volumesCount, 10) || 0), 0);
  if (totalTiles === 0) {
    resultsSummary.textContent = '';
  } else {
    const titleWord  = totalTiles   === 1 ? 'title'  : 'titles';
    const volumeWord = totalVolumes === 1 ? 'volume' : 'volumes';
    resultsSummary.textContent =
      `Showing ${totalTiles.toLocaleString()} ${titleWord} · ${totalVolumes.toLocaleString()} ${volumeWord} total`;
  }

  if (novels.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 4rem 0;">No novels found matching your filters.</p>';
    return;
  }

  novels.forEach(novel => {
    const entry = getLibEntry(novel.id);
    const readVols = getProgress(novel.id);
    const totalVols = (novel.volumes || []).length;

    const card = document.createElement('div');
    card.className = 'novel-card';

    // Reading badge
    const readingBadge = entry.status === 'Reading'
      ? `<span class="card-reading-badge">Reading</span>` : '';

    // Favorite icon
    const favIcon = entry.favorite
      ? `<span class="card-favorite-icon">❤️</span>` : '';

    // Progress display on card
    let progressText = '';
    if (totalVols > 0 && readVols.length > 0) {
      progressText = `<span class="novel-progress-text">${readVols.length}/${totalVols} read</span>`;
    }

    card.innerHTML = `
      ${readingBadge}
      ${favIcon}
      <img src="${novel.cover}" alt="Cover of ${novel.title}" class="novel-cover-img" loading="lazy">
      <div class="novel-title">${novel.title}</div>
      <div class="novel-meta">
        <span>Vols: ${novel.volumesCount || 0}</span>
        ${progressText}
        <span class="status-badge">${novel.status || 'Unknown'}</span>
      </div>
    `;

    const img = card.querySelector('.novel-cover-img');
    img.addEventListener('error', () => {
      if (!brokenCovers.has(novel.id)) {
        brokenCovers.add(novel.id);
        settings.brokenCovers = Array.from(brokenCovers);
        saveSettings();
        if (settings.hideNoCover) {
          scheduleRefilter();
        }
      }
      img.src = 'https://placehold.co/300x400/1a1a2e/a0aab2?text=No+Cover';
    });

    card.addEventListener('click', () => openModal(novel));
    grid.appendChild(card);
  });
}

/* ============================================================
   MODAL — OPEN / CLOSE
   ============================================================ */
function copyToClipboard(text, buttonId, originalText) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(buttonId);
    if (btn) {
      const prevBg = btn.style.background;
      const prevColor = btn.style.color;
      btn.textContent = 'Copied!';
      btn.style.background = '#22c55e';
      btn.style.color = '#ffffff';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = prevBg;
        btn.style.color = prevColor;
      }, 1500);
    }
  }).catch(err => console.error('Failed to copy:', err));
}

function openModal(novel) {
  const entry = getLibEntry(novel.id);
  const readTitles = getProgress(novel.id);
  const epubs = [];
  const pdfs = [];

  // --- Volumes HTML ---
  let volumesHtml = '';
  if (novel.volumes && novel.volumes.length > 0) {
    const total = novel.volumes.length;
    const doneCount = novel.volumes.filter(v => readTitles.includes(v.title)).length;

    const progressBadge = `<span class="vol-progress-indicator">${doneCount}/${total} read</span>`;

    volumesHtml = `<div class="volumes-list">`;
    novel.volumes.forEach(vol => {
      if (vol.link1) epubs.push(vol.link1);
      if (vol.link2) pdfs.push(vol.link2);
      const isRead = readTitles.includes(vol.title);
      volumesHtml += `
        <div class="volume-item${isRead ? ' vol-read' : ''}" data-vol-title="${escapeAttr(vol.title)}">
          <div class="vol-left">
            <input type="checkbox" class="vol-checkbox" data-novel-id="${novel.id}" data-vol-title="${escapeAttr(vol.title)}" ${isRead ? 'checked' : ''}>
            <span class="vol-title">${vol.title}</span>
          </div>
          <div class="volume-links">
            ${vol.link1 ? `<a href="${vol.link1}" target="_blank" class="epub-btn">EPUB</a>` : ''}
            ${vol.link2 ? `<a href="${vol.link2}" target="_blank" class="pdf-btn">PDF</a>` : ''}
          </div>
        </div>
      `;
    });
    volumesHtml += `</div>`;
    volumesHtml = `<h3>Download Volumes ${progressBadge}</h3>` + volumesHtml;
  } else {
    volumesHtml = '<h3>Download Volumes</h3><p>No volumes available.</p>';
  }

  // --- Copy buttons ---
  let copyButtonsHtml = '';
  if (novel.volumes && novel.volumes.length > 0) {
    copyButtonsHtml = `
      <div class="copy-actions">
        ${epubs.length > 0 ? `<button class="copy-btn purple-btn" id="copyEpubsBtn">Copy All EPUB Links</button>` : ''}
        ${pdfs.length > 0 ? `<button class="copy-btn orange-btn" id="copyPdfsBtn">Copy All PDF Links</button>` : ''}
      </div>
    `;
  }

  // --- Status options ---
  const statusOptions = READING_STATUS_OPTIONS.map(s =>
    `<option value="${s}" ${entry.status === s ? 'selected' : ''}>${s || '— None —'}</option>`
  ).join('');

  // --- Build modal ---
  modalBody.innerHTML = `
    <div class="modal-body-layout">
      <!-- Left Column -->
      <div class="modal-left-col">
        <img src="${novel.cover}" class="modal-cover" alt="Cover of ${novel.title}" onerror="this.src='https://placehold.co/300x400/1a1a2e/a0aab2?text=No+Cover'">

        <!-- User Library Controls -->
        <div class="user-library-controls">
          <span class="section-label">My Library</span>
          <div class="favorite-row">
            <button class="fav-toggle-btn${entry.favorite ? ' active' : ''}" id="favToggleBtn">
              ${entry.favorite ? '❤️ Favorited' : '🤍 Add to Favorites'}
            </button>
          </div>
          <select class="status-select" id="readingStatusSelect">
            ${statusOptions}
          </select>
        </div>

        <div class="modal-details-list">
          <div class="detail-item">
            <span class="label">Alternative</span>
            <span>${novel.alternative || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="label">Authors</span>
            <span>${novel.authors || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="label">Artist</span>
            <span>${novel.artist || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="label">Genre</span>
            <span>${novel.genre || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="label">Type</span>
            <span>${novel.type || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="label">Translation Group</span>
            <span>${novel.translationGroup || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="label">Status</span>
            <span class="status-badge" style="align-self: flex-start; margin-top: 0.2rem;">${novel.status || 'Unknown'}</span>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="modal-right-col">
        <h2>${novel.title}</h2>
        <div class="synopsis">${novel.synopsis || 'No synopsis available.'}</div>
        ${volumesHtml}
        ${copyButtonsHtml}
      </div>
    </div>
  `;

  // --- Favorite toggle ---
  document.getElementById('favToggleBtn').addEventListener('click', () => {
    const newFav = !getLibEntry(novel.id).favorite;
    setLibEntry(novel.id, { favorite: newFav });
    const btn = document.getElementById('favToggleBtn');
    btn.classList.toggle('active', newFav);
    btn.textContent = newFav ? '❤️ Favorited' : '🤍 Add to Favorites';
    applyFilters(); // re-render grid to update icons
  });

  // --- Reading status change ---
  document.getElementById('readingStatusSelect').addEventListener('change', (e) => {
    setLibEntry(novel.id, { status: e.target.value });
    applyFilters(); // re-render to update sorting / badges
  });

  // --- Volume checkboxes ---
  modalBody.querySelectorAll('.vol-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const novelId = cb.dataset.novelId;
      const volTitle = cb.dataset.volTitle;
      let current = getProgress(novelId);
      if (cb.checked) {
        if (!current.includes(volTitle)) current = [...current, volTitle];
      } else {
        current = current.filter(t => t !== volTitle);
      }
      setProgress(novelId, current);

      // Update row styling and progress badge without closing modal
      const row = cb.closest('.volume-item');
      row.classList.toggle('vol-read', cb.checked);
      updateVolProgressBadge(novel);
      applyFilters(); // refresh grid cards
    });
  });

  // --- Copy buttons ---
  if (epubs.length > 0) {
    document.getElementById('copyEpubsBtn').addEventListener('click', () => {
      copyToClipboard(epubs.join('\n'), 'copyEpubsBtn', 'Copy All EPUB Links');
    });
  }
  if (pdfs.length > 0) {
    document.getElementById('copyPdfsBtn').addEventListener('click', () => {
      copyToClipboard(pdfs.join('\n'), 'copyPdfsBtn', 'Copy All PDF Links');
    });
  }

  modal.classList.add('show');
}

/** Refresh just the progress badge inside the open modal without rebuilding everything */
function updateVolProgressBadge(novel) {
  const readTitles = getProgress(novel.id);
  const total = (novel.volumes || []).length;
  const doneCount = (novel.volumes || []).filter(v => readTitles.includes(v.title)).length;
  const badge = modalBody.querySelector('.vol-progress-indicator');
  if (badge) badge.textContent = `${doneCount}/${total} read`;
}

function closeModal() {
  modal.classList.remove('show');
}

/* ============================================================
   IMPORT / EXPORT
   ============================================================ */
function exportBackup() {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `novel-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Backup exported!', 'success');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      // Basic schema validation
      if (typeof parsed !== 'object' || !parsed.library || !parsed.progress) {
        throw new Error('Invalid backup file format.');
      }
      // Merge — keep version, overwrite library/progress/theme/hideNoCover/brokenCovers
      settings = {
        version: SETTINGS_VERSION,
        library: parsed.library  || {},
        progress: parsed.progress || {},
        theme: parsed.theme       || 'theme-midnight',
        hideNoCover: parsed.hideNoCover !== undefined ? parsed.hideNoCover : false,
        brokenCovers: parsed.brokenCovers || []
      };
      brokenCovers = new Set(settings.brokenCovers);
      saveSettings();
      applyTheme(settings.theme);
      if (hideNoCoverBtn) {
        hideNoCoverBtn.classList.toggle('active', !!settings.hideNoCover);
      }
      applyFilters();
      showToast('✅ Backup imported successfully!', 'success');
    } catch (err) {
      showToast('❌ Import failed: ' + err.message, 'error');
    }
    // Reset the file input so the same file can be re-imported if needed
    importFile.value = '';
  };
  reader.readAsText(file);
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ============================================================
   UTILITIES
   ============================================================ */
function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
// Tag system
tagToggleBtn.addEventListener('click', () => {
  tagToggleBtn.classList.toggle('open');
  tagPanel.classList.toggle('open');
});
clearTagsBtn.addEventListener('click', clearAllTags);
searchInput.addEventListener('input', applyFilters);

// Header / Title reset
if (siteTitle) {
  siteTitle.addEventListener('click', resetAllFilters);
}

// Modal
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
});

// Library filter pills
libPills.forEach(pill => {
  pill.addEventListener('click', () => {
    libPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeLibFilter = pill.dataset.lib;
    applyFilters();
  });
});

// Theme switcher
themePills.forEach(pill => {
  pill.addEventListener('click', () => applyTheme(pill.dataset.theme));
});

// Export / Import
exportBtn.addEventListener('click', exportBackup);
importFile.addEventListener('change', (e) => {
  if (e.target.files[0]) importBackup(e.target.files[0]);
});

// Hide No Cover toggle
if (hideNoCoverBtn) {
  hideNoCoverBtn.addEventListener('click', () => {
    settings.hideNoCover = !settings.hideNoCover;
    saveSettings();
    hideNoCoverBtn.classList.toggle('active', settings.hideNoCover);
    applyFilters();
  });
}

/* ============================================================
   ZERO-KNOWLEDGE SYNC ENGINE
   ============================================================ */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(passphrase) {
  const enc = new TextEncoder();
  const rawKey = enc.encode(passphrase + '_encrypt');
  const hash = await window.crypto.subtle.digest('SHA-256', rawKey);
  return await window.crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function getLookupId(passphrase) {
  const enc = new TextEncoder();
  const rawData = enc.encode(passphrase + '_lookup');
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', rawData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function encryptData(plaintext, passphrase) {
  const enc = new TextEncoder();
  const key = await getCryptoKey(passphrase);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(plaintext));
  const ciphertext = new Uint8Array(ciphertextBuffer);
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);
  return arrayBufferToBase64(combined);
}

async function decryptData(base64Ciphertext, passphrase) {
  const dec = new TextDecoder();
  const key = await getCryptoKey(passphrase);
  const combined = base64ToArrayBuffer(base64Ciphertext);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintextBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
  return dec.decode(plaintextBuffer);
}

let localStream = null;
let isScanning = false;
let scanAnimFrame = null;

function stopCameraScan() {
  isScanning = false;
  if (scanAnimFrame) cancelAnimationFrame(scanAnimFrame);
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  const container = document.getElementById('scannerContainer');
  if (container) container.classList.remove('active');
  const video = document.getElementById('scannerVideo');
  if (video) video.srcObject = null;
}

async function startCameraScan() {
  const container = document.getElementById('scannerContainer');
  const video = document.getElementById('scannerVideo');
  if (!container || !video) return;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = localStream;
    video.setAttribute('playsinline', true); // Required for iOS
    video.play();
    container.classList.add('active');
    isScanning = true;
    scanAnimFrame = requestAnimationFrame(scanTick);
  } catch (err) {
    console.error('Camera access error:', err);
    showToast('Could not access camera: ' + err.message, 'error');
    isScanning = false;
    const btn = document.getElementById('cameraScanBtn');
    if (btn) btn.textContent = '📷 Scan QR Code';
  }
}

function scanTick() {
  if (!isScanning) return;
  const video = document.getElementById('scannerVideo');
  if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imgData.data, imgData.width, imgData.height);
    if (code) {
      showToast('QR Code detected!', 'success');
      try {
        const parsed = JSON.parse(code.data);
        if (parsed && parsed.key) {
          settings.syncKey = parsed.key;
          if (parsed.url) settings.customSupabaseUrl = parsed.url;
          if (parsed.anon) settings.customSupabaseAnonKey = parsed.anon;
        } else {
          settings.syncKey = code.data;
        }
      } catch (e) {
        settings.syncKey = code.data;
      }
      saveSettings();
      stopCameraScan();
      syncData(true).then(() => renderSyncModal());
      return;
    }
  }
  scanAnimFrame = requestAnimationFrame(scanTick);
}

function triggerQRFileUpload() {
  if (qrFileInput) qrFileInput.click();
}

function handleQRFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code) {
        showToast('QR Code detected from image!', 'success');
        try {
          const parsed = JSON.parse(code.data);
          if (parsed && parsed.key) {
            settings.syncKey = parsed.key;
            if (parsed.url) settings.customSupabaseUrl = parsed.url;
            if (parsed.anon) settings.customSupabaseAnonKey = parsed.anon;
          } else {
            settings.syncKey = code.data;
          }
        } catch (e) {
          settings.syncKey = code.data;
        }
        saveSettings();
        syncData(true).then(() => renderSyncModal());
      } else {
        showToast('Could not find a valid QR code in this image', 'error');
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
  qrFileInput.value = '';
}

function getSupabaseConfig() {
  const url = settings.customSupabaseUrl || import.meta.env.VITE_SUPABASE_URL;
  const anonKey = settings.customSupabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

async function pullCloudData(lookupId) {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) throw new Error('Supabase configuration missing');
  const res = await fetch(`${config.url}/rest/v1/sync_data?id=eq.${lookupId}`, {
    headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` }
  });
  if (!res.ok) throw new Error('Failed to fetch from cloud');
  const data = await res.json();
  return data.length ? data[0] : null;
}

async function pushCloudData(lookupId, encryptedPayload) {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) throw new Error('Supabase configuration missing');
  const res = await fetch(`${config.url}/rest/v1/sync_data`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ id: lookupId, payload: encryptedPayload, updated_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error('Failed to push to cloud');
}

async function syncData(manual = false) {
  if (!settings.syncKey) return;
  const btnIcon = syncBtn;
  const originalText = btnIcon.textContent;
  btnIcon.textContent = '🔄 Syncing...';
  
  try {
    const lookupId = await getLookupId(settings.syncKey);
    const cloudRecord = await pullCloudData(lookupId);
    
    let needsPush = true;
    if (cloudRecord && cloudRecord.payload) {
      try {
        const decryptedJson = await decryptData(cloudRecord.payload, settings.syncKey);
        const cloudSettings = JSON.parse(decryptedJson);
        
        // Two-way merge
        let mergedLibrary = { ...settings.library };
        for (const [id, cEntry] of Object.entries(cloudSettings.library || {})) {
          if (!mergedLibrary[id]) {
            mergedLibrary[id] = cEntry;
          } else {
            mergedLibrary[id].favorite = mergedLibrary[id].favorite || cEntry.favorite;
            if (cEntry.status && !mergedLibrary[id].status) mergedLibrary[id].status = cEntry.status;
          }
        }
        
        let mergedProgress = { ...settings.progress };
        for (const [id, cArr] of Object.entries(cloudSettings.progress || {})) {
          if (!mergedProgress[id]) {
            mergedProgress[id] = cArr;
          } else {
            mergedProgress[id] = [...new Set([...mergedProgress[id], ...cArr])];
          }
        }
        
        settings.library = mergedLibrary;
        settings.progress = mergedProgress;
        
        // Disable scheduling temporarily so we don't recursive loop
        const tmpTimeout = syncTimeout;
        syncTimeout = 'LOCKED';
        localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
        syncTimeout = tmpTimeout;
        
        applyFilters(); // Re-render grid
      } catch (err) {
        console.error('Decryption failed, maybe wrong key?', err);
        if (manual) showToast('Sync failed: Invalid key or corrupted data', 'error');
        btnIcon.textContent = originalText;
        return;
      }
    }
    
    // Push our current (merged) settings
    const currentJson = JSON.stringify({
      library: settings.library,
      progress: settings.progress
    });
    const encrypted = await encryptData(currentJson, settings.syncKey);
    await pushCloudData(lookupId, encrypted);
    
    settings.syncLastTime = Date.now();
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    
    if (manual) showToast('✅ Synced successfully', 'success');
  } catch (err) {
    console.error('Sync error:', err);
    if (manual) showToast('Sync failed: ' + err.message, 'error');
  }
  btnIcon.textContent = originalText;
  if (syncModal.classList.contains('show')) renderSyncModal();
}

function generateRandomKey() {
  const array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function renderInstructionsPanel() {
  return `
    <div class="sync-instructions-panel">
      <button id="instructionsToggle" class="sync-instructions-toggle">
        ▶ Setup Instructions & SQL Script
      </button>
      <div id="instructionsContent" class="sync-instructions-content">
        <p>Zero-Knowledge Sync encrypts your library and reading progress in your browser before uploading it. No passwords, emails, or personal details are ever stored.</p>
        
        <div class="sync-instruction-step">
          <strong>1. Create a Supabase Account</strong>
          Sign up for free at <a href="https://supabase.com" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">supabase.com</a> and create a new project.
        </div>
        
        <div class="sync-instruction-step">
          <strong>2. Create the Database Table</strong>
          Go to your Supabase project dashboard, click on <strong>SQL Editor</strong>, open a <strong>New query</strong>, paste the following SQL, and click <strong>Run</strong>:
          <div class="sql-code-box">
            <button id="copySqlBtn" class="copy-sql-btn">📋 Copy</button>
            <pre><code id="sqlCode">CREATE TABLE public.sync_data (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sync_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select" ON public.sync_data FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON public.sync_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON public.sync_data FOR UPDATE USING (true);</code></pre>
          </div>
        </div>
        
        <div class="sync-instruction-step">
          <strong>3. Enter Credentials</strong>
          Copy your project's <strong>Project URL</strong> and <strong>Anon / Publishable Key</strong> (found in Settings > API), and paste them into the <strong>Developer Credentials</strong> panel below.
        </div>
      </div>
    </div>
  `;
}

function attachInstructionsListeners() {
  const toggle = document.getElementById('instructionsToggle');
  const content = document.getElementById('instructionsContent');
  const copyBtn = document.getElementById('copySqlBtn');
  
  if (toggle && content) {
    toggle.addEventListener('click', () => {
      content.classList.toggle('open');
      toggle.textContent = content.classList.contains('open') ? '▼ Setup Instructions & SQL Script' : '▶ Setup Instructions & SQL Script';
    });
  }
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = document.getElementById('sqlCode').textContent;
      navigator.clipboard.writeText(code);
      showToast('SQL Script copied to clipboard');
    });
  }
}

function renderSyncModal() {
  const config = getSupabaseConfig();
  const configWarning = (!config.url || !config.anonKey) 
    ? `<div style="color: #ff5555; background: rgba(255,0,0,0.1); padding: 10px; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem;">
        ⚠️ Supabase not configured! Please open Developer Credentials below and set them up.
       </div>` : '';

  if (settings.syncKey) {
    const lastSyncStr = settings.syncLastTime ? new Date(settings.syncLastTime).toLocaleString() : 'Never';
    const qrPayload = JSON.stringify({
      key: settings.syncKey,
      url: config.url || '',
      anon: config.anonKey || ''
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=255-255-255&bgcolor=11-12-16&data=${encodeURIComponent(qrPayload)}`;
    
    syncModalBody.innerHTML = `
      <h2 class="sync-modal-title">Sync Active</h2>
      ${configWarning}
      <p class="sync-modal-desc">Your progress is being synced securely across devices.</p>
      
      <div class="sync-key-display">
        <span id="syncKeyText" style="filter: blur(4px); transition: filter 0.3s; cursor: pointer;" title="Click to reveal">
          ${settings.syncKey}
        </span>
        <button id="copySyncKeyBtn" class="sync-btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">📋 Copy</button>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted);">Plain text key - keep this secret!</p>
      
      <div class="sync-qr-container">
        <img src="${qrUrl}" alt="QR Code" width="150" height="150" title="Scan to link another device" />
      </div>
      
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Last Synced: ${lastSyncStr}</p>
      
      <div class="sync-actions">
        <button id="forceSyncBtn" class="sync-btn-primary">🔄 Sync Now</button>
        <button id="unlinkSyncBtn" class="sync-btn-danger">Disconnect Device</button>
      </div>
      
      ${renderDevPanel()}
      ${renderInstructionsPanel()}
    `;
    
    document.getElementById('syncKeyText').addEventListener('click', (e) => {
      e.target.style.filter = e.target.style.filter === 'none' ? 'blur(4px)' : 'none';
    });
    document.getElementById('copySyncKeyBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(settings.syncKey);
      showToast('Key copied to clipboard');
    });
    document.getElementById('forceSyncBtn').addEventListener('click', () => syncData(true));
    document.getElementById('unlinkSyncBtn').addEventListener('click', () => {
      if (confirm('Disconnect this device? Local data will be kept, but future progress will not sync.')) {
        stopCameraScan();
        settings.syncKey = null;
        settings.syncLastTime = null;
        saveSettings();
        renderSyncModal();
        showToast('Device disconnected');
      }
    });
  } else {
    syncModalBody.innerHTML = `
      <h2 class="sync-modal-title">Zero-Knowledge Sync</h2>
      ${configWarning}
      <p class="sync-modal-desc">Seamlessly sync your library across devices without creating an account. Your data is encrypted locally and stored securely.</p>
      
      <div class="sync-btn-group-row">
        <button id="cameraScanBtn" class="sync-btn-secondary">📷 Scan QR Code</button>
        <button id="uploadQRBtn" class="sync-btn-secondary">📁 Upload QR Image</button>
      </div>

      <div id="scannerContainer" class="scanner-video-container">
        <video id="scannerVideo" class="scanner-video"></video>
        <div class="scanner-overlay">
          <div class="scanner-laser"></div>
        </div>
      </div>
      
      <div class="sync-actions">
        <button id="generateSyncBtn" class="sync-btn-primary">✨ Generate New Sync Key</button>
        <div style="margin: 1rem 0; color: var(--text-muted);">— OR —</div>
        <div class="sync-input-group row">
          <input type="text" id="existingSyncKey" class="sync-input" placeholder="Paste existing Sync Key..." />
          <button id="connectSyncBtn" class="sync-btn-secondary">Connect</button>
        </div>
      </div>
      
      ${renderDevPanel()}
      ${renderInstructionsPanel()}
    `;
    
    document.getElementById('cameraScanBtn').addEventListener('click', () => {
      if (isScanning) {
        stopCameraScan();
        document.getElementById('cameraScanBtn').textContent = '📷 Scan QR Code';
      } else {
        startCameraScan();
        document.getElementById('cameraScanBtn').textContent = '⏹ Stop Camera';
      }
    });
    document.getElementById('uploadQRBtn').addEventListener('click', triggerQRFileUpload);

    document.getElementById('generateSyncBtn').addEventListener('click', () => {
      settings.syncKey = generateRandomKey();
      saveSettings();
      syncData(true);
      renderSyncModal();
    });
    document.getElementById('connectSyncBtn').addEventListener('click', () => {
      const val = document.getElementById('existingSyncKey').value.trim();
      if (val) {
        settings.syncKey = val;
        saveSettings();
        syncData(true).then(() => renderSyncModal());
      }
    });
  }
  
  attachDevPanelListeners();
  attachInstructionsListeners();
}

function renderDevPanel() {
  return `
    <div class="sync-dev-panel">
      <button id="devPanelToggle" class="sync-dev-toggle">
        ▶ Developer Credentials (Optional)
      </button>
      <div id="devPanelContent" class="sync-dev-content">
        <label>Custom Supabase URL
          <input type="text" id="customSupabaseUrl" class="sync-input" value="${escapeAttr(settings.customSupabaseUrl)}" placeholder="https://..." />
        </label>
        <label>Custom Supabase Publishable Key
          <input type="password" id="customSupabaseAnonKey" class="sync-input" value="${escapeAttr(settings.customSupabaseAnonKey)}" placeholder="eyJhbG..." />
        </label>
        <button id="saveDevConfigBtn" class="sync-btn-secondary">Save Config</button>
      </div>
    </div>
  `;
}

function attachDevPanelListeners() {
  const toggle = document.getElementById('devPanelToggle');
  const content = document.getElementById('devPanelContent');
  const saveBtn = document.getElementById('saveDevConfigBtn');
  
  if(toggle && content) {
    toggle.addEventListener('click', () => {
      content.classList.toggle('open');
      toggle.textContent = content.classList.contains('open') ? '▼ Developer Credentials (Optional)' : '▶ Developer Credentials (Optional)';
    });
  }
  if(saveBtn) {
    saveBtn.addEventListener('click', () => {
      settings.customSupabaseUrl = document.getElementById('customSupabaseUrl').value.trim();
      settings.customSupabaseAnonKey = document.getElementById('customSupabaseAnonKey').value.trim();
      saveSettings();
      showToast('Config saved');
      renderSyncModal();
    });
  }
}

syncBtn.addEventListener('click', () => {
  renderSyncModal();
  syncModal.classList.add('show');
});
syncCloseBtn.addEventListener('click', () => {
  stopCameraScan();
  syncModal.classList.remove('show');
});
syncModal.addEventListener('click', (e) => {
  if (e.target === syncModal) {
    stopCameraScan();
    syncModal.classList.remove('show');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && syncModal.classList.contains('show')) {
    stopCameraScan();
    syncModal.classList.remove('show');
  }
});
if (qrFileInput) {
  qrFileInput.addEventListener('change', handleQRFileUpload);
}

// Auto-sync on startup
if (settings.syncKey) {
  setTimeout(() => syncData(false), 1000);
}

/* ============================================================
   START
   ============================================================ */
init();
