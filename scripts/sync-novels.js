import fs from 'fs';
import path from 'path';

// File paths
const MAIN_DB_PATH = path.resolve('public/data.json');
const NEW_DB_PATH = path.resolve('new-data.json');
const BACKUP_DIR = path.resolve('backup');

/**
 * Normalizes a string for robust matching.
 */
function normalizeString(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
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
  console.log(`Loaded \x1b[36m${mainDb.length}\x1b[0m novels from the main database.`);

  // Load new database
  if (!fs.existsSync(NEW_DB_PATH)) {
    console.log(`\x1b[33mWarning: "${NEW_DB_PATH}" not found at project root.\x1b[0m`);
    console.log(`Please place your new/partial JSON file at the root named \x1b[36mnew-data.json\x1b[0m and run the script again.`);
    console.log(`\nAlternatively, specify a custom path: \x1b[90mnode scripts/sync-novels.js <path-to-json>\x1b[0m`);
    process.exit(1);
  }

  const newDb = loadJSON(NEW_DB_PATH);
  if (!newDb) {
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

    if (mainIndex === -1) {
      // It's a brand new novel
      newNovels.push(newNovel);
    } else {
      // Exist in main DB - compare details
      const existingNovel = mainDb[mainIndex];
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
        if (newNovel[field] !== undefined && newNovel[field] !== existingNovel[field]) {
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
    console.log('\x1b[32m✓ No new titles or volume updates found. Your main database is up to date with new-data.json!\x1b[0m\n');
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
    console.log('   \x1b[1mnode scripts/sync-novels.js --merge\x1b[0m\n');
  }
}

run();
