let novelsData = [];
// tagStates: { [tagName]: 'neutral' | 'include' | 'exclude' }
const tagStates = {};

// DOM refs
const grid = document.getElementById('novelGrid');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('novelModal');
const modalBody = document.getElementById('modalBody');
const closeBtn = document.querySelector('.close-btn');
const tagToggleBtn = document.getElementById('tagToggleBtn');
const tagPanel = document.getElementById('tagPanel');
const tagContainer = document.getElementById('tagContainer');
const activeTagCount = document.getElementById('activeTagCount');
const clearTagsBtn = document.getElementById('clearTagsBtn');

// ---- Initialization ----
async function init() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data.json`);
    novelsData = await response.json();
    buildTagSystem();
    applyFilters();
  } catch (error) {
    console.error("Error fetching data:", error);
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--accent-orange);">Error loading novels data.</p>';
  }
}

// ---- Tag System ----
function buildTagSystem() {
  // Extract all unique genres from data
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
  Object.keys(tagStates).forEach(tag => {
    tagStates[tag] = 'neutral';
  });
  // Reset all pill elements
  document.querySelectorAll('.tag-pill').forEach(pill => {
    pill.dataset.state = 'neutral';
  });
  updateTagUI();
  applyFilters();
}

// ---- Filtering ----
function applyFilters() {
  const term = searchInput.value.toLowerCase();
  const includedTags = Object.entries(tagStates).filter(([, s]) => s === 'include').map(([t]) => t.toLowerCase());
  const excludedTags = Object.entries(tagStates).filter(([, s]) => s === 'exclude').map(([t]) => t.toLowerCase());

  const filtered = novelsData.filter(novel => {
    // Text search
    if (term) {
      const matches =
        novel.title.toLowerCase().includes(term) ||
        (novel.alternative && novel.alternative.toLowerCase().includes(term)) ||
        (novel.genre && novel.genre.toLowerCase().includes(term)) ||
        (novel.authors && novel.authors.toLowerCase().includes(term));
      if (!matches) return false;
    }

    const novelGenres = novel.genre
      ? novel.genre.split(',').map(g => g.trim().toLowerCase())
      : [];

    // Must contain ALL included tags
    if (includedTags.length > 0) {
      const hasAll = includedTags.every(tag => novelGenres.includes(tag));
      if (!hasAll) return false;
    }

    // Must NOT contain ANY excluded tags
    if (excludedTags.length > 0) {
      const hasExcluded = excludedTags.some(tag => novelGenres.includes(tag));
      if (hasExcluded) return false;
    }

    return true;
  });

  renderGrid(filtered);
}

// ---- Rendering ----
function renderGrid(novels) {
  grid.innerHTML = '';
  if (novels.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 4rem 0;">No novels found matching your filters.</p>';
    return;
  }

  novels.forEach(novel => {
    const card = document.createElement('div');
    card.className = 'novel-card';
    card.innerHTML = `
      <img src="${novel.cover}" alt="Cover of ${novel.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
      <div class="novel-title">${novel.title}</div>
      <div class="novel-meta">
        <span>Vols: ${novel.volumesCount || 0}</span>
        <span class="status-badge">${novel.status || 'Unknown'}</span>
      </div>
    `;
    card.addEventListener('click', () => openModal(novel));
    grid.appendChild(card);
  });
}

// ---- Modal ----
function copyToClipboard(text, buttonId, originalText) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById(buttonId);
    if (btn) {
      const prevBg = btn.style.background;
      const prevColor = btn.style.color;
      btn.textContent = 'Copied!';
      btn.style.background = '#22c55e'; // green feedback
      btn.style.color = '#ffffff';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = prevBg;
        btn.style.color = prevColor;
      }, 1500);
    }
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

function openModal(novel) {
  let volumesHtml = '';
  const epubs = [];
  const pdfs = [];

  if (novel.volumes && novel.volumes.length > 0) {
    volumesHtml = '<div class="volumes-list">';
    novel.volumes.forEach(vol => {
      if (vol.link1) epubs.push(vol.link1);
      if (vol.link2) pdfs.push(vol.link2);

      volumesHtml += `
        <div class="volume-item">
          <strong>${vol.title}</strong>
          <div class="volume-links">
            ${vol.link1 ? `<a href="${vol.link1}" target="_blank" class="epub-btn">EPUB</a>` : ''}
            ${vol.link2 ? `<a href="${vol.link2}" target="_blank" class="pdf-btn">PDF</a>` : ''}
          </div>
        </div>
      `;
    });
    volumesHtml += '</div>';
  } else {
    volumesHtml = '<p>No volumes available.</p>';
  }

  // Action buttons for copying
  let copyButtonsHtml = '';
  if (novel.volumes && novel.volumes.length > 0) {
    copyButtonsHtml = `
      <div class="copy-actions">
        ${epubs.length > 0 ? `<button class="copy-btn purple-btn" id="copyEpubsBtn">Copy All EPUB Links</button>` : ''}
        ${pdfs.length > 0 ? `<button class="copy-btn orange-btn" id="copyPdfsBtn">Copy All PDF Links</button>` : ''}
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="modal-body-layout">
      <!-- Left Column: Cover & Core Specs -->
      <div class="modal-left-col">
        <img src="${novel.cover}" class="modal-cover" alt="Cover of ${novel.title}" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
        
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
      
      <!-- Right Column: Title, Synopsis, Downloads -->
      <div class="modal-right-col">
        <h2>${novel.title}</h2>
        
        <div class="synopsis">
          ${novel.synopsis || 'No synopsis available.'}
        </div>
        
        <h3>Download Volumes</h3>
        ${volumesHtml}
        ${copyButtonsHtml}
      </div>
    </div>
  `;

  // Attach event listeners for copying
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

function closeModal() {
  modal.classList.remove('show');
}

// ---- Event Listeners ----
tagToggleBtn.addEventListener('click', () => {
  tagToggleBtn.classList.toggle('open');
  tagPanel.classList.toggle('open');
});

clearTagsBtn.addEventListener('click', clearAllTags);

searchInput.addEventListener('input', applyFilters);

closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
});

// Start
init();
