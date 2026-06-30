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
 *   theme: string
 * }
 */
let settings = loadSettings();

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
const exportBtn       = document.getElementById('exportBtn');
const importFile      = document.getElementById('importFile');
const libPills        = document.querySelectorAll('.lib-pill');
const themePills      = document.querySelectorAll('.theme-pill');

/* ============================================================
   SETTINGS — LOAD / SAVE / DEFAULTS
   ============================================================ */
function defaultSettings() {
  return { version: SETTINGS_VERSION, library: {}, progress: {}, theme: 'theme-midnight' };
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
    };
  } catch {
    return defaultSettings();
  }
}

function saveSettings() {
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
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

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data.json`);
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

/* ============================================================
   RENDERING
   ============================================================ */
function renderGrid(novels) {
  grid.innerHTML = '';
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
      <img src="${novel.cover}" alt="Cover of ${novel.title}" loading="lazy" onerror="this.src='https://placehold.co/300x400/1a1a2e/a0aab2?text=No+Cover'">
      <div class="novel-title">${novel.title}</div>
      <div class="novel-meta">
        <span>Vols: ${novel.volumesCount || 0}</span>
        ${progressText}
        <span class="status-badge">${novel.status || 'Unknown'}</span>
      </div>
    `;

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
      // Merge — keep version, overwrite library/progress/theme
      settings = {
        version: SETTINGS_VERSION,
        library: parsed.library  || {},
        progress: parsed.progress || {},
        theme: parsed.theme       || 'theme-midnight',
      };
      saveSettings();
      applyTheme(settings.theme);
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

/* ============================================================
   START
   ============================================================ */
init();
