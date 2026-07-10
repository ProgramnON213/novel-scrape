import fs from 'fs';
import path from 'path';

// File paths
const MAIN_DB_PATH = path.resolve('public/data.json');
const BACKUP_DIR = path.resolve('backup');

// Help message check
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/sync-novels.js [path-to-json] [--merge]');
  console.log('Options:');
  console.log('  --merge      Merge the detected updates into public/data.json (creates a backup first)');
  console.log('  --help, -h   Show this help message');
  process.exit(0);
}

// Parse custom path from CLI arguments
const args = process.argv.slice(2).filter(arg => arg !== '--merge');
const customPath = args.length > 0 ? args[0] : null;
const NEW_DB_PATH = customPath ? path.resolve(customPath) : path.resolve('new-data.json');

/**
 * Normalizes a string for robust matching.
 */
function normalizeString(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

/**
 * Validates the loaded JSON structure.
 * Returns true if valid, false otherwise.
 */
function validateJSONSchema(data, filePath) {
  if (!Array.isArray(data)) {
    console.error(`\x1b[31mError in "${filePath}": Root element must be a JSON array.\x1b[0m`);
    return false;
  }

  let isValid = true;
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const indexStr = `at index ${i}`;

    if (typeof item !== 'object' || item === null) {
      console.error(`\x1b[31mError ${indexStr}: Element is not a valid object.\x1b[0m`);
      isValid = false;
      continue;
    }

    // Critical fields
    if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
      console.error(`\x1b[31mError ${indexStr}: Novel is missing a valid "title" string.\x1b[0m`);
      isValid = false;
    }

    // Check volumes if present
    if (item.volumes !== undefined) {
      if (!Array.isArray(item.volumes)) {
        console.error(`\x1b[31mError ${indexStr} ("${item.title || 'Unknown'}"): "volumes" must be an array.\x1b[0m`);
        isValid = false;
      } else {
        for (let j = 0; j < item.volumes.length; j++) {
          const vol = item.volumes[j];
          if (typeof vol !== 'object' || vol === null) {
            console.error(`\x1b[31mError ${indexStr} -> volume ${j}: Volume must be an object.\x1b[0m`);
            isValid = false;
          } else if (!vol.title || typeof vol.title !== 'string') {
            console.error(`\x1b[31mError ${indexStr} -> volume ${j}: Volume is missing a "title" string.\x1b[0m`);
            isValid = false;
          }
        }
      }
    }
  }

  return isValid;
}

/**
 * Loads and parses a JSON file.
 */
function loadJSON(filePath) {
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

/**
 * Formats ID to 7-digit zero-padded string.
 */
function formatId(num) {
  return String(num).padStart(7, '0');
}

/**
 * Gets the next available ID by scanning the existing database.
 */
function getNextId(db) {
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

const GENRE_MAPPINGS = {
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

const VALID_TAGS = new Set([
  'Action',
  'Adult',
  'Adventure',
  'Age Gap',
  'Antihero Protagonist',
  'Apocalypse',
  'Comedy',
  'Dark Fantasy',
  'Dragon',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Gender Bender',
  'Harem',
  'Historical',
  'Horror',
  'Isekai',
  'Josei',
  'Magic',
  'Martial Arts',
  'Mature',
  'Mecha',
  'Mystery',
  'Psychological',
  'Romance',
  'School Life',
  'Sci-fi',
  'Seinen',
  'Shoujo',
  'Shoujo Ai',
  'Shounen',
  'Shounen Ai',
  'Slice of Life',
  'Smut',
  'Supernatural',
  'Tragedy',
  'Yuri'
]);

const VALID_TAGS_MAP = {};
for (const tag of VALID_TAGS) {
  VALID_TAGS_MAP[tag.toLowerCase()] = tag;
}

/**
 * Standardizes genre names to match the database conventions (e.g. Scifi -> Sci-fi, casing, etc.) and sorts them.
 * Supports comma and dot delimiters.
 */
function normalizeGenres(genreStr) {
  if (!genreStr || typeof genreStr !== 'string') return '';
  
  const normalizedList = genreStr
    .split(/[.,]/)
    .map(g => {
      const trimmed = g.trim();
      const lower = trimmed.toLowerCase();
      
      // Check in mappings
      if (GENRE_MAPPINGS[lower]) {
        return GENRE_MAPPINGS[lower];
      }

      // Check in valid tags map
      if (VALID_TAGS_MAP[lower]) {
        return VALID_TAGS_MAP[lower];
      }
      
      // Fallback: title case the genre words (e.g. "slice of life" -> "Slice of Life")
      return trimmed
        .replace(/([^\s:\-]+)/g, (match) => {
          return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
        });
    })
    .filter(Boolean);
    
  // Sort alphabetically to maintain consistency across the entire DB
  return Array.from(new Set(normalizedList)).sort().join(', ');
}

/**
 * Checks if all tags/genres in the genre string are valid.
 * A tag is valid if it is in the VALID_TAGS set or has a known mapping.
 * Returns { isValid: boolean, invalidTags: string[] }
 */
function checkTagsValidity(genreStr) {
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

/**
 * Merges two comma-separated genre strings, keeping unique values, and sorts them alphabetically.
 */
function mergeAndSortGenres(existingGenreStr, newGenreStr) {
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

/**
 * Normalizes novel data from external sources (like animeStuff) to conform to the standard schema.
 */
function normalizeNovelData(data) {
  if (!Array.isArray(data)) return data;
  
  return data.map(item => {
    if (typeof item !== 'object' || item === null) return item;
    
    const normalized = { ...item };
    
    // Convert 'genres' array to comma-separated 'genre' string
    if (Array.isArray(normalized.genres)) {
      normalized.genre = normalized.genres.join(', ');
      delete normalized.genres;
    }
    
    // Normalize and standardize genre/tag naming
    if (normalized.genre) {
      normalized.genre = normalizeGenres(normalized.genre);
    }
    
    // Strip external url fields
    if (normalized.url !== undefined) {
      delete normalized.url;
    }

    // Default missing fields for new novels
    if (normalized.type === undefined) normalized.type = 'Light Novel';
    if (normalized.status === undefined) normalized.status = 'Ongoing';
    if (normalized.volumes === undefined) normalized.volumes = [];
    if (normalized.volumesCount === undefined) {
      normalized.volumesCount = String(normalized.volumes.length);
    }
    
    return normalized;
  });
}

function run() {
  const isMerge = process.argv.includes('--merge');

  console.log('\x1b[35m==================================================');
  console.log('       📚 Novel Database Sync & Comparison');
  console.log('==================================================\x1b[0m\n');

  // Load current database
  const mainDb = loadJSON(MAIN_DB_PATH);
  if (!mainDb) {
    console.error('\x1b[31mCannot proceed without the main database (public/data.json).\x1b[0m');
    process.exit(1);
  }

  // Normalize main database genres to clean up any legacy typos on load
  mainDb.forEach(novel => {
    if (novel.genre) {
      novel.genre = normalizeGenres(novel.genre);
    }
  });

  console.log(`Loaded \x1b[36m${mainDb.length}\x1b[0m novels from the main database.`);

  // Load new database
  if (!fs.existsSync(NEW_DB_PATH)) {
    console.error(`\x1b[31mError: File not found at "${NEW_DB_PATH}"\x1b[0m`);
    if (customPath) {
      console.log(`Please ensure the path you provided is correct: \x1b[36m${customPath}\x1b[0m`);
    } else {
      console.log(`Please place your new/partial JSON file at the root named \x1b[36mnew-data.json\x1b[0m and run the script again.`);
      console.log(`\nAlternatively, specify a custom path: \x1b[90mnode scripts/sync-novels.js <path-to-json>\x1b[0m`);
    }
    process.exit(1);
  }

  let newDb = loadJSON(NEW_DB_PATH);
  if (!newDb) {
    process.exit(1);
  }

  // Normalize incoming novel data structure (e.g. animeStuff format compatibility)
  newDb = normalizeNovelData(newDb);

  // Validate database schema
  if (!validateJSONSchema(newDb, NEW_DB_PATH)) {
    console.error('\x1b[31mValidation failed: The input JSON file contains schema errors.\x1b[0m');
    process.exit(1);
  }

  console.log(`Loaded \x1b[36m${newDb.length}\x1b[0m novels from the new/partial file.\n`);

  // Build lookup index for main DB
  const idMap = new Map();
  const titleMap = new Map();
  const normalizedTitleMap = new Map();

  mainDb.forEach((novel, index) => {
    if (novel.id) idMap.set(novel.id, index);
    if (novel.title) {
      titleMap.set(novel.title.trim(), index);
      normalizedTitleMap.set(normalizeString(novel.title), index);
    }
  });

  const newNovels = [];
  const updatedNovels = [];
  const noChangeNovels = [];

  // Compare each novel in the new database
  for (const newNovel of newDb) {
    let mainIndex = -1;

    // 1. Try matching by ID
    if (newNovel.id && idMap.has(newNovel.id)) {
      mainIndex = idMap.get(newNovel.id);
    } 
    // 2. Try matching by exact title
    else if (newNovel.title && titleMap.has(newNovel.title.trim())) {
      mainIndex = titleMap.get(newNovel.title.trim());
    } 
    // 3. Try matching by normalized title
    else if (newNovel.title && normalizedTitleMap.has(normalizeString(newNovel.title))) {
      mainIndex = normalizedTitleMap.get(normalizeString(newNovel.title));
    }

    const existingNovel = mainIndex !== -1 ? mainDb[mainIndex] : null;

    // Check and filter tags before suggesting merge / comparison
    if (newNovel.genre) {
      const { isValid, invalidTags } = checkTagsValidity(newNovel.genre);
      if (!isValid) {
        if (existingNovel) {
          console.log(`\x1b[33m⚠️  [Tag Filter] "${newNovel.title}" contains invalid tags: [${invalidTags.join(', ')}]. Keeping old tags: "${existingNovel.genre || 'None'}"\x1b[0m`);
          newNovel.genre = existingNovel.genre || '';
        } else {
          // New novel - try to remove invalid ones and keep only valid/corrected ones
          const cleanGenres = newNovel.genre.split(/[.,]/)
            .map(g => g.trim())
            .filter(Boolean)
            .map(g => {
              const lower = g.toLowerCase();
              return GENRE_MAPPINGS[lower] || VALID_TAGS_MAP[lower] || null;
            })
            .filter(Boolean);
          
          const cleanGenreStr = Array.from(new Set(cleanGenres)).sort().join(', ');
          console.log(`\x1b[33m⚠️  [Tag Filter] New novel "${newNovel.title}" contains invalid tags: [${invalidTags.join(', ')}]. Discarding invalid tags, keeping: "${cleanGenreStr}"\x1b[0m`);
          newNovel.genre = cleanGenreStr;
        }
      } else {
        // Tag is valid or fully correctable, normalize it to proper casing/sorting
        newNovel.genre = normalizeGenres(newNovel.genre);
      }
    }

    if (mainIndex === -1) {
      // It's a brand new novel
      newNovels.push(newNovel);
    } else {
      // Exist in main DB - compare details
      const volumeChanges = [];
      const fieldChanges = [];

      // Compare volumes
      const existingVols = existingNovel.volumes || [];
      const newVols = newNovel.volumes || [];
      const mergedVols = [...existingVols];

      newVols.forEach(newVol => {
        // Look for matching volume by normalized title
        const existingVolIdx = mergedVols.findIndex(
          ev => normalizeString(ev.title) === normalizeString(newVol.title)
        );

        if (existingVolIdx === -1) {
          // New volume added
          volumeChanges.push({
            type: 'added',
            volume: newVol.title || 'Unknown Volume',
            details: `EPUB: ${newVol.link1 ? '✓' : '✖'}, PDF: ${newVol.link2 ? '✓' : '✖'}`
          });
          if (isMerge) {
            mergedVols.push(newVol);
          }
        } else {
          // Existing volume - check for link updates
          const ev = mergedVols[existingVolIdx];
          const link1Changed = newVol.link1 && newVol.link1 !== ev.link1;
          const link2Changed = newVol.link2 && newVol.link2 !== ev.link2;

          if (link1Changed || link2Changed) {
            const changeDetails = [];
            if (link1Changed) changeDetails.push(`EPUB Link updated`);
            if (link2Changed) changeDetails.push(`PDF Link updated`);

            volumeChanges.push({
              type: 'updated',
              volume: ev.title,
              details: changeDetails.join(', ')
            });

            if (isMerge) {
              mergedVols[existingVolIdx] = {
                ...ev,
                ...(newVol.link1 ? { link1: newVol.link1 } : {}),
                ...(newVol.link2 ? { link2: newVol.link2 } : {})
              };
            }
          }
        }
      });

      // Check general field changes (status, cover, etc.) if they are defined in newNovel
      const fieldsToCheck = ['status', 'cover', 'genre', 'synopsis', 'alternative', 'authors', 'artist', 'translationGroup'];
      fieldsToCheck.forEach(field => {
        if (newNovel[field] !== undefined) {
          // Special rule for genres: merge existing and new, sort alphabetically, compare
          if (field === 'genre') {
            const existingSorted = (existingNovel.genre || '')
              .split(',')
              .map(g => g.trim())
              .filter(Boolean)
              .sort()
              .join(', ');

            const mergedSorted = mergeAndSortGenres(existingNovel.genre, newNovel.genre);

            if (mergedSorted !== existingSorted) {
              fieldChanges.push({
                field,
                oldVal: existingNovel.genre || '',
                newVal: mergedSorted
              });
            }
            return;
          }

          if (newNovel[field] !== existingNovel[field]) {
            // Special rule for cover image: if existing has a cover, don't overwrite it
            if (field === 'cover') {
              const currentCoverAvailable = existingNovel.cover && existingNovel.cover.trim() !== '';
              if (currentCoverAvailable) {
                return; // skip updating cover
              }
            }
            // ignore empty fields in new data replacing non-empty fields in existing
            if (newNovel[field] === '' && existingNovel[field] !== '') {
              return;
            }
            fieldChanges.push({
              field,
              oldVal: existingNovel[field],
              newVal: newNovel[field]
            });
          }
        }
      });

      if (volumeChanges.length > 0 || fieldChanges.length > 0) {
        updatedNovels.push({
          mainIndex,
          title: existingNovel.title,
          id: existingNovel.id,
          volumeChanges,
          fieldChanges,
          mergedVols,
          newNovelData: newNovel
        });
      } else {
        noChangeNovels.push(existingNovel);
      }
    }
  }

  // --- REPORT SECTION ---
  console.log('--------------------------------------------------');
  console.log(`📋 COMPARISON REPORT:`);
  console.log(`  • New Titles Found: \x1b[32m${newNovels.length}\x1b[0m`);
  console.log(`  • Titles with Updates (Volumes/Fields): \x1b[33m${updatedNovels.length}\x1b[0m`);
  console.log(`  • Unchanged Matching Titles: \x1b[37m${newDb.length - newNovels.length - updatedNovels.length}\x1b[0m`);
  console.log('--------------------------------------------------\n');

  if (newNovels.length > 0) {
    console.log('\x1b[32m➕ NEW TITLES DETECTED:\x1b[0m');
    newNovels.forEach((n, idx) => {
      const volCount = n.volumes ? n.volumes.length : 0;
      console.log(`  ${idx + 1}. \x1b[1m${n.title}\x1b[0m (${n.type || 'Novel'})`);
      console.log(`     Genres: ${n.genre || 'None'}`);
      console.log(`     Volumes: ${volCount} volumes detected.`);
    });
    console.log();
  }

  if (updatedNovels.length > 0) {
    console.log('\x1b[33m🔄 UPDATED VOLUMES / METADATA DETECTED:\x1b[0m');
    updatedNovels.forEach((u, idx) => {
      console.log(`  ${idx + 1}. \x1b[1m${u.title}\x1b[0m (ID: ${u.id})`);
      if (u.volumeChanges.length > 0) {
        console.log(`     \x1b[36mVolume Changes:\x1b[0m`);
        u.volumeChanges.forEach(vc => {
          const icon = vc.type === 'added' ? '🟢 [New]' : '🟡 [Edit]';
          console.log(`       ${icon} ${vc.volume} (${vc.details})`);
        });
      }
      if (u.fieldChanges.length > 0) {
        console.log(`     \x1b[35mMetadata Changes:\x1b[0m`);
        u.fieldChanges.forEach(fc => {
          console.log(`       • ${fc.field}: "${fc.oldVal || ''}" ➔ "${fc.newVal || ''}"`);
        });
      }
    });
    console.log();
  }

  if (newNovels.length === 0 && updatedNovels.length === 0) {
    console.log(`\x1b[32m✓ No new titles or volume updates found. Your main database is up to date with ${path.basename(NEW_DB_PATH)}!\x1b[0m\n`);
    return;
  }

  // --- MERGE EXECUTION ---
  if (isMerge) {
    console.log('\x1b[36mProcessing merge into public/data.json...\x1b[0m');

    // Create backup directory if needed
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Write backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `data-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(mainDb, null, 2), 'utf-8');
    console.log(`✓ Backup created at: \x1b[90m${backupPath}\x1b[0m`);

    // Prepare updated DB structure
    const updatedDb = [...mainDb];

    // Apply updates to existing novels
    updatedNovels.forEach(u => {
      const existing = updatedDb[u.mainIndex];
      
      // Update fields
      u.fieldChanges.forEach(fc => {
        existing[fc.field] = fc.newVal;
      });

      // Update volumes and count
      existing.volumes = u.mergedVols;
      existing.volumesCount = String(u.mergedVols.length);
      existing.newUpdate = 'yes'; // flag it as recently updated
    });

    // Add new novels
    let nextIdVal = parseInt(getNextId(mainDb), 10);
    newNovels.forEach(n => {
      const newNovelWithId = {
        ...n,
        id: n.id || formatId(nextIdVal++),
        newUpdate: 'yes',
        volumesCount: String(n.volumes ? n.volumes.length : 0)
      };
      updatedDb.unshift(newNovelWithId); // add to top so it shows up in main grid
    });

    // Write updated database back to disk
    fs.writeFileSync(MAIN_DB_PATH, JSON.stringify(updatedDb, null, 2), 'utf-8');
    console.log(`\n\x1b[32m✔ Merged successfully! public/data.json has been updated with ${newNovels.length} new titles and ${updatedNovels.length} updated items.\x1b[0m`);
    console.log(`Run \x1b[36mnpm run dev\x1b[0m to test the changes in the UI.`);
  } else {
    console.log('💡 \x1b[36mTip:\x1b[0m To merge these changes automatically into your database, run:');
    const pathArg = customPath ? ` ${customPath}` : '';
    console.log(`   \x1b[1mnode scripts/sync-novels.js${pathArg} --merge\x1b[0m\n`);
  }
}

run();
