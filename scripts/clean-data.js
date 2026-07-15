import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAIN_DB_PATH = path.resolve(__dirname, '../public/data.json');
const BACKUP_DIR = path.resolve(__dirname, '../backup');

const args = process.argv.slice(2);
const isWrite = args.includes('--write') || args.includes('--merge');

function healTitle(title) {
  if (!title || typeof title !== 'string') return title;
  let cleaned = title;
  
  cleaned = cleaned.replace(/[ÃÂ¢â€™œ…‰šžŸŒŽŠ•–—¬†‡ƒ‚\u0080-\u009f]{5,}(s|ll|m|t|re|ve|d)?/gi, (match, suffix) => {
    if (suffix) {
      return "'" + suffix;
    }
    const matchLower = match.toLowerCase();
    if (matchLower.includes("…") || matchLower.includes("•") || matchLower.includes("€") || matchLower.includes("¦")) {
      return "...";
    }
    return "'";
  });
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/(\w)'\s+(s|ll|m|t|re|ve|d)\b/gi, "$1'$2");
  
  cleaned = cleaned.replace(/\bI'\s+m\b/gi, "I'm");
  cleaned = cleaned.replace(/\bI'\s+Cheating\b/gi, "I'm Cheating");
  
  return cleaned;
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
  'Action', 'Adult', 'Adventure', 'Age Gap', 'Antihero Protagonist', 'Apocalypse',
  'Comedy', 'Dark Fantasy', 'Dragon', 'Drama', 'Ecchi', 'Fantasy', 'Gender Bender',
  'Harem', 'Historical', 'Horror', 'Isekai', 'Josei', 'Magic', 'Martial Arts',
  'Mature', 'Mecha', 'Mystery', 'Psychological', 'Romance', 'School Life', 'Sci-fi',
  'Seinen', 'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Slice of Life', 'Smut',
  'Supernatural', 'Tragedy', 'Yuri'
]);

const VALID_TAGS_MAP = {};
for (const tag of VALID_TAGS) {
  VALID_TAGS_MAP[tag.toLowerCase()] = tag;
}

function normalizeGenres(genreStr) {
  if (!genreStr || typeof genreStr !== 'string') return '';
  const normalizedList = genreStr
    .split(/[.,]/)
    .map(g => {
      const trimmed = g.trim();
      const lower = trimmed.toLowerCase();
      if (GENRE_MAPPINGS[lower]) return GENRE_MAPPINGS[lower];
      if (VALID_TAGS_MAP[lower]) return VALID_TAGS_MAP[lower];
      return trimmed
        .replace(/([^\s:\-]+)/g, (match) => {
          return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
        });
    })
    .filter(Boolean);
  return Array.from(new Set(normalizedList)).sort().join(', ');
}

function cleanSynopsis(synopsis) {
  if (!synopsis || typeof synopsis !== 'string') return synopsis;
  let cleaned = synopsis;

  cleaned = cleaned.replace(/<\/p>\s*<p[^>]*>/gi, '<br/><br/>');
  cleaned = cleaned.replace(/<p[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/p>/gi, '<br/><br/>');
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '<br/>');
  cleaned = cleaned.replace(/(<br\/>\s*){3,}/gi, '<br/><br/>');

  cleaned = cleaned.trim();
  while (cleaned.startsWith('<br/>')) {
    cleaned = cleaned.substring(5).trim();
  }
  while (cleaned.endsWith('<br/>')) {
    cleaned = cleaned.substring(0, cleaned.length - 5).trim();
  }

  return cleaned;
}

function normalizeString(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

function isDuplicate(a, b) {
  const titleA = normalizeString(a.title);
  const titleB = normalizeString(b.title);
  if (titleA && titleA === titleB) return true;

  const altA = normalizeString(a.alternative);
  const altB = normalizeString(b.alternative);

  const hasAltA = altA && altA !== 'na' && altA !== 'none';
  const hasAltB = altB && altB !== 'na' && altB !== 'none';

  if (titleA && hasAltB && titleA === altB) return true;
  if (hasAltA && titleB && altA === titleB) return true;
  if (hasAltA && hasAltB && altA === altB) return true;

  return false;
}

function countLinks(entry) {
  let count = 0;
  if (Array.isArray(entry.volumes)) {
    entry.volumes.forEach(vol => {
      if (vol.link1) count++;
      if (vol.link2) count++;
    });
  }
  return count;
}

function run() {
  console.log('--- database cleansing ---');
  if (!isWrite) {
    console.log('💡 Running in PREVIEW (dry-run) mode. No changes will be saved to disk.');
    console.log('   To save modifications, run: \x1b[36mnpm run clean:write\x1b[0m\n');
  } else {
    console.log('🚀 Running in WRITE mode. Changes will be saved to public/data.json.\n');
  }

  if (!fs.existsSync(MAIN_DB_PATH)) {
    console.error(`\x1b[31mError: Database file not found at ${MAIN_DB_PATH}\x1b[0m`);
    process.exit(1);
  }

  const dataRaw = fs.readFileSync(MAIN_DB_PATH, 'utf-8');
  let database;
  try {
    database = JSON.parse(dataRaw);
  } catch (err) {
    console.error(`\x1b[31mError: Failed to parse JSON from ${MAIN_DB_PATH}\x1b[0m`, err.message);
    process.exit(1);
  }

  if (!Array.isArray(database)) {
    console.error(`\x1b[31mError: Database root element is not an array.\x1b[0m`);
    process.exit(1);
  }

  console.log(`Loaded database containing ${database.length} entries.`);

  // Task 1: Backup if isWrite is active
  if (isWrite) {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `data-clean-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(database, null, 2), 'utf-8');
    console.log(`✓ Backup created successfully at: \x1b[90m${backupPath}\x1b[0m`);
  }

  // Task 2: Clean titles and alternative titles
  console.log('\n--- cleaning titles ---');
  let titleCleanCount = 0;
  let altCleanCount = 0;

  const titleCleanedDb = database.map(entry => {
    const newEntry = { ...entry };
    const cleanedTitle = healTitle(entry.title);
    if (cleanedTitle !== entry.title) {
      console.log(`🔧 Cleaned title:\n   Old: "${entry.title}"\n   New: "${cleanedTitle}"`);
      newEntry.title = cleanedTitle;
      titleCleanCount++;
    }

    if (entry.alternative) {
      const cleanedAlt = healTitle(entry.alternative);
      if (cleanedAlt !== entry.alternative) {
        console.log(`🔧 Cleaned alternative:\n   Old: "${entry.alternative}"\n   New: "${cleanedAlt}"`);
        newEntry.alternative = cleanedAlt;
        altCleanCount++;
      }
    }
    return newEntry;
  });

  console.log(`✓ Title cleaning completed. Cleaned ${titleCleanCount} titles and ${altCleanCount} alternative titles.`);

  // Task 3: Normalize tags/genres
  console.log('\n--- normalizing genre tags ---');
  let tagNormalizeCount = 0;
  const tagNormalizedDb = titleCleanedDb.map(entry => {
    const newEntry = { ...entry };
    const normalizedGenre = normalizeGenres(entry.genre);
    if (normalizedGenre !== entry.genre) {
      console.log(`🏷️ Normalized tags for "${newEntry.title}":\n   Old: "${entry.genre || ''}"\n   New: "${normalizedGenre}"`);
      newEntry.genre = normalizedGenre;
      tagNormalizeCount++;
    }
    return newEntry;
  });

  console.log(`✓ Tag normalization completed. Normalized genres for ${tagNormalizeCount} entries.`);

  // Task 3.5: Clean synopsis HTML tags
  console.log('\n--- cleaning synopsis HTML tags ---');
  let synopsisCleanCount = 0;
  const synopsisCleanedDb = tagNormalizedDb.map(entry => {
    const newEntry = { ...entry };
    const cleanedSynopsis = cleanSynopsis(entry.synopsis);
    if (cleanedSynopsis !== entry.synopsis) {
      console.log(`📝 Cleaned synopsis for "${newEntry.title}":\n   Old: "${entry.synopsis || ''}"\n   New: "${cleanedSynopsis}"`);
      newEntry.synopsis = cleanedSynopsis;
      synopsisCleanCount++;
    }
    return newEntry;
  });

  console.log(`✓ Synopsis cleaning completed. Cleaned synopses for ${synopsisCleanCount} entries.`);

  // Task 4: Deduplicate entries (crossover loose matching)
  console.log('\n--- detecting duplicate entries ---');
  const visited = new Set();
  const groups = [];

  for (let i = 0; i < synopsisCleanedDb.length; i++) {
    if (visited.has(i)) continue;
    const group = [synopsisCleanedDb[i]];
    visited.add(i);

    for (let j = i + 1; j < synopsisCleanedDb.length; j++) {
      if (visited.has(j)) continue;
      let matches = false;
      for (const item of group) {
        if (isDuplicate(item, synopsisCleanedDb[j])) {
          matches = true;
          break;
        }
      }
      if (matches) {
        group.push(synopsisCleanedDb[j]);
        visited.add(j);
      }
    }
    groups.push(group);
  }

  let duplicateGroupCount = 0;
  let discardedCount = 0;
  const dedupedDb = [];

  groups.forEach(group => {
    if (group.length === 1) {
      dedupedDb.push(group[0]);
    } else {
      duplicateGroupCount++;
      group.sort((a, b) => countLinks(b) - countLinks(a));
      
      const kept = group[0];
      const keptLinks = countLinks(kept);
      dedupedDb.push(kept);

      console.log(`👯 Duplicate group [${kept.title}] matched ${group.length} entries:`);
      console.log(`   KEEP:    "${kept.title}" (ID: ${kept.id}, Links: ${keptLinks})`);
      
      group.slice(1).forEach(discarded => {
        discardedCount++;
        console.log(`   DISCARD: "${discarded.title}" (ID: ${discarded.id}, Links: ${countLinks(discarded)})`);
      });
    }
  });

  console.log(`✓ Deduplication completed. Found ${duplicateGroupCount} duplicate groups; discarded ${discardedCount} redundant entries.`);

  // Task 5: Prune empty/linkless entries (no volumes AND no sourceUrl)
  console.log('\n--- pruning empty entries ---');
  let prunedCount = 0;
  const finalDb = [];

  dedupedDb.forEach(entry => {
    const hasVols = entry.volumes && entry.volumes.length > 0;
    const hasSource = !!entry.sourceUrl;
    if (!hasVols && !hasSource) {
      prunedCount++;
      console.log(`🗑️ Pruned empty entry: "${entry.title}" (ID: ${entry.id})`);
    } else {
      finalDb.push(entry);
    }
  });

  console.log(`✓ Pruning completed. Removed ${prunedCount} empty entries.`);

  // Task 6: Save back and print stats
  console.log('\n--- summary ---');
  console.log(`Loaded entries:       ${database.length}`);
  console.log(`Cleaned titles:       ${titleCleanCount}`);
  console.log(`Cleaned alt titles:   ${altCleanCount}`);
  console.log(`Normalized tags:      ${tagNormalizeCount}`);
  console.log(`Cleaned synopses:     ${synopsisCleanCount}`);
  console.log(`Discarded duplicates: ${discardedCount}`);
  console.log(`Pruned empty:         ${prunedCount}`);
  console.log(`Final database size:  ${finalDb.length}`);

  if (isWrite) {
    fs.writeFileSync(MAIN_DB_PATH, JSON.stringify(finalDb, null, 2), 'utf-8');
    console.log(`\n\x1b[32m✔ Cleansing successfully completed and saved to public/data.json!\x1b[0m`);
  } else {
    console.log(`\n💡 Dry-run completed. No files were modified.`);
  }
}

run();

