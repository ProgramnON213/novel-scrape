import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const GENRE_MAPPINGS = {
  'scifi': 'Sci-fi',
  'sci-fi': 'Sci-fi',
  'science fiction': 'Sci-fi',
  'sliceoflife': 'Slice of Life',
  'slice of life': 'Slice of Life',
  'schoollife': 'School Life',
  'school-life': 'School Life',
  'school life': 'School Life',
  'martialarts': 'Martial Arts',
  'martial arts': 'Martial Arts',
  'wuxia': 'Wuxia',
  'xianxia': 'Xianxia',
  'xuanhuan': 'Xuanhuan',
  'comedy': 'Comedy',
  'romance': 'Romance',
  'action': 'Action',
  'fantasy': 'Fantasy',
  'harem': 'Harem',
  'adventure': 'Adventure',
  'drama': 'Drama',
  'ecchi': 'Ecchi',
  'mecha': 'Mecha',
  'shounen': 'Shounen',
  'historical': 'Historical',
  'mystery': 'Mystery',
  'supernatural': 'Supernatural',
  'tragedy': 'Tragedy',
  'tradegy': 'Tragedy'
};

export const VALID_TAGS = new Set([
  'Action', 'Adult', 'Adventure', 'Age Gap', 'Antihero Protagonist', 'Apocalypse',
  'Comedy', 'Dark Fantasy', 'Dragon', 'Drama', 'Ecchi', 'Fantasy', 'Gender Bender',
  'Harem', 'Historical', 'Horror', 'Isekai', 'Josei', 'Magic', 'Martial Arts',
  'Mature', 'Mecha', 'Mystery', 'Psychological', 'Romance', 'School Life', 'Sci-fi',
  'Seinen', 'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Slice of Life', 'Smut',
  'Supernatural', 'Tragedy', 'Wuxia', 'Xianxia', 'Xuanhuan', 'Yuri'
]);

export const VALID_TAGS_MAP = {};
for (const tag of VALID_TAGS) {
  VALID_TAGS_MAP[tag.toLowerCase()] = tag;
}

export function normalizeString(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

export function normalizeGenres(genreStr) {
  if (!genreStr || typeof genreStr !== 'string') return '';
  
  const normalizedList = genreStr
    .split(/[.,]/)
    .map(g => {
      const trimmed = g.trim();
      const lower = trimmed.toLowerCase();
      
      if (GENRE_MAPPINGS[lower]) {
        return GENRE_MAPPINGS[lower];
      }

      if (VALID_TAGS_MAP[lower]) {
        return VALID_TAGS_MAP[lower];
      }
      
      return trimmed
        .replace(/([^\s:\-]+)/g, (match) => {
          return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
        });
    })
    .filter(Boolean);
    
  return Array.from(new Set(normalizedList)).sort().join(', ');
}

export function checkTagsValidity(genreStr) {
  if (!genreStr) return { isValid: true, invalidTags: [] };
  const tags = genreStr.split(/[.,]/).map(g => g.trim()).filter(Boolean);
  const invalidTags = [];
  
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    const mapped = GENRE_MAPPINGS[lower];
    const isDirectValid = VALID_TAGS_MAP[lower];
    
    if (!mapped && !isDirectValid) {
      invalidTags.push(tag);
    }
  }
  
  return {
    isValid: invalidTags.length === 0,
    invalidTags
  };
}

export async function checkUrlExists(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return false;
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(id);
    if (response.ok) return true;
    
    const getController = new AbortController();
    const getId = setTimeout(() => getController.abort(), 5000);
    const getResponse = await fetch(url, { method: 'GET', signal: getController.signal });
    clearTimeout(getId);
    return getResponse.ok;
  } catch (e) {
    return false;
  }
}

export function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`\x1b[31mError: File not found at "${filePath}"\x1b[0m`);
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`\x1b[31mError parsing JSON from "${filePath}":\x1b[0m`, error.message);
    return null;
  }
}

export function formatId(num) {
  return String(num).padStart(7, '0');
}

export function getNextId(db) {
  let maxId = 0;
  for (const novel of db) {
    if (novel.id) {
      const parsed = parseInt(novel.id, 10);
      if (!isNaN(parsed) && parsed > maxId) {
        maxId = parsed;
      }
    }
  }
  return formatId(maxId + 1);
}

export function diffSnippet(oldStr, newStr) {
  if (typeof oldStr !== 'string' || typeof newStr !== 'string') {
    return `"${oldStr || ''}" ➔ "${newStr || ''}"`;
  }
  
  if (oldStr.length < 80 && newStr.length < 80) {
    return `"${oldStr}" ➔ "${newStr}"`;
  }

  let start = 0;
  while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
    start++;
  }

  let oldEnd = oldStr.length - 1;
  let newEnd = newStr.length - 1;
  while (oldEnd >= start && newEnd >= start && oldStr[oldEnd] === newStr[newEnd]) {
    oldEnd--;
    newEnd--;
  }

  const contextLen = 20;
  const contextStart = Math.max(0, start - contextLen);
  const prefix = (contextStart > 0 ? '...' : '') + oldStr.slice(contextStart, start);

  const contextOldEnd = Math.min(oldStr.length, oldEnd + 1 + contextLen);
  const suffixOld = oldStr.slice(oldEnd + 1, contextOldEnd) + (contextOldEnd < oldStr.length ? '...' : '');

  const oldChange = oldStr.slice(start, oldEnd + 1);
  const newChange = newStr.slice(start, newEnd + 1);

  return `\n         Context: "${prefix}[ ${oldChange ? `\x1b[31m-${oldChange}\x1b[0m` : ''} ➔ ${newChange ? `\x1b[32m+${newChange}\x1b[0m` : ''} ]${suffixOld}"`;
}

export function mergeAndSortGenres(existingGenreStr, newGenreStr) {
  const existingSet = new Set(
    (existingGenreStr || '')
      .split(',')
      .map(g => g.trim())
      .filter(Boolean)
  );
  
  const newSet = new Set(
    (newGenreStr || '')
      .split(',')
      .map(g => g.trim())
      .filter(Boolean)
  );

  const combinedSet = new Set([...existingSet, ...newSet]);
  return Array.from(combinedSet).sort().join(', ');
}

export function loadLinkCache(cachePath) {
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch (err) {
      console.warn('⚠️ Failed to parse link cache, starting fresh:', err.message);
    }
  }
  return {};
}

export function saveLinkCache(cachePath, linkCache) {
  try {
    if (!fs.existsSync(path.dirname(cachePath))) {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(linkCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('⚠️ Failed to save link cache:', err.message);
  }
}

export function isUrlCachedAndValid(url, linkCache, expiryMs = 7 * 24 * 60 * 60 * 1000) {
  if (!url || !linkCache) return false;
  const cachedTime = linkCache[url];
  if (!cachedTime) return false;
  return (Date.now() - cachedTime) < expiryMs;
}

export function createBackup(dbData, options = {}) {
  const args = options.args || (typeof process !== 'undefined' ? process.argv : []);
  const isNoBackup = options.noBackup || args.includes('--no-backup');
  
  if (isNoBackup) {
    return null;
  }

  let targetDir = options.backupDir;
  
  // Parse --backup-dir flag from args if present
  const dirFlagIdx = args.indexOf('--backup-dir');
  if (dirFlagIdx !== -1 && args[dirFlagIdx + 1]) {
    targetDir = path.resolve(args[dirFlagIdx + 1]);
  } else if (!targetDir) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    targetDir = path.resolve(__dirname, '../backup');
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const prefix = options.prefix || 'data-backup';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(targetDir, `${prefix}-${timestamp}.json`);
  
  fs.writeFileSync(backupPath, JSON.stringify(dbData, null, 2), 'utf-8');
  console.log(`✓ Backup created successfully at: \x1b[90m${backupPath}\x1b[0m`);
  return backupPath;
}


