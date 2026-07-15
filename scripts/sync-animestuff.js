import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  normalizeString, 
  normalizeGenres, 
  checkUrlExists, 
  loadJSON, 
  formatId, 
  getNextId 
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// File paths
const MAIN_DB_PATH = path.resolve(__dirname, '../public/data.json');
const BACKUP_DIR   = path.resolve(__dirname, '../backup');
const REMOTE_DATA_URL = 'https://animestuff.me/novels.json';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/sync-animestuff.js [path-to-json] [--merge] [--fetch]');
  console.log('');
  console.log('Imports NEW novels from an animeStuff catalogue JSON into public/data.json.');
  console.log('Existing novels (matched by title) are skipped untouched.');
  console.log('');
  console.log('Options:');
  console.log('  --fetch      Fetch the latest catalogue from remote website first');
  console.log('  --merge      Write changes to public/data.json (creates a backup first)');
  console.log('  --help, -h   Show this help message');
  console.log('');
  console.log('Input format (animeStuff catalogue JSON):');
  console.log('  [ { "title", "url", "cover", "genres": [...], "status" }, ... ]');
  process.exit(0);
}

const isMerge   = process.argv.includes('--merge');
const isFetch   = process.argv.includes('--fetch');
const args      = process.argv.slice(2).filter(a => a !== '--merge' && a !== '--fetch');
let inputPath   = args.length > 0
  ? path.resolve(args[0])
  : path.resolve(__dirname, '../animestuff-data.json');

// ---------------------------------------------------------------------------
// Normalize animeStuff entry → internal schema
// ---------------------------------------------------------------------------
function normalizeEntry(item) {
  if (typeof item !== 'object' || item === null) return null;

  // Require at minimum a title
  if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') return null;

  // genres[] → genre string
  let genre = '';
  if (Array.isArray(item.genres)) {
    genre = normalizeGenres(item.genres.join(', '));
  } else if (typeof item.genre === 'string') {
    genre = normalizeGenres(item.genre);
  }

  return {
    title:        item.title.trim(),
    cover:        typeof item.cover  === 'string' ? item.cover.trim()  : '',
    genre,
    type:         typeof item.type   === 'string' ? item.type.trim()   : 'Light Novel',
    status:       typeof item.status === 'string' ? item.status.trim() : 'Ongoing',
    // sourceUrl preserves the animestuff page URL for future reference / volume scraping
    sourceUrl:    typeof item.url    === 'string' ? item.url.trim()    : '',
    volumes:      [],
    volumesCount: '0',
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  console.log('\x1b[35m==================================================');
  console.log('   📥  AnimeStuff → Novel DB Import Tool');
  console.log('==================================================\x1b[0m\n');

  if (isFetch) {
    console.log(`Fetching remote catalogue from: \x1b[36m${REMOTE_DATA_URL}\x1b[0m ...`);
    try {
      const response = await fetch(REMOTE_DATA_URL);
      if (!response.ok) {
        console.error(`\x1b[31mFailed to fetch remote catalogue: ${response.status} ${response.statusText}\x1b[0m`);
        process.exit(1);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error('\x1b[31mError: Fetched remote data is not a valid JSON array.\x1b[0m');
        process.exit(1);
      }
      
      inputPath = path.resolve(__dirname, '../animestuff-data.json');
      fs.writeFileSync(inputPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`✓ Remote data saved successfully to: \x1b[90manimestuff-data.json\x1b[0m\n`);
    } catch (error) {
      console.error(`\x1b[31mError during remote fetch:\x1b[0m`, error.message);
      process.exit(1);
    }
  }

  // Load main DB
  const mainDb = loadJSON(MAIN_DB_PATH);
  if (!mainDb || !Array.isArray(mainDb)) {
    console.error('\x1b[31mCannot proceed: public/data.json is missing or invalid.\x1b[0m');
    process.exit(1);
  }
  console.log(`Loaded \x1b[36m${mainDb.length}\x1b[0m novels from main database.\n`);

  // Build lookup sets (ID + normalized title) for fast duplicate detection
  const idSet            = new Set(mainDb.map(n => n.id).filter(Boolean));
  const normalizedTitles = new Set(mainDb.map(n => normalizeString(n.title)));
  const exactTitles      = new Set(mainDb.map(n => (n.title || '').trim()));

  // Load animeStuff input
  console.log(`Input file: \x1b[90m${inputPath}\x1b[0m`);
  const raw = loadJSON(inputPath);
  if (!raw || !Array.isArray(raw)) {
    console.error('\x1b[31mInput file must be a JSON array.\x1b[0m');
    process.exit(1);
  }
  console.log(`Loaded \x1b[36m${raw.length}\x1b[0m entries from animeStuff catalogue.\n`);

  // Normalize + filter to only genuinely new novels
  let skipped = 0;
  let invalid  = 0;
  const newNovels = [];

  for (const item of raw) {
    const entry = normalizeEntry(item);

    if (!entry) {
      invalid++;
      continue;
    }

    // Skip if already in DB by normalized title or exact title
    const isExact      = exactTitles.has(entry.title);
    const isNormalized = normalizedTitles.has(normalizeString(entry.title));

    if (isExact || isNormalized) {
      skipped++;
    } else {
      // Check if new cover actually loads before keeping it
      if (entry.cover && entry.cover.startsWith('http')) {
        console.log(`Checking if cover image for new novel "${entry.title}" loads: ${entry.cover}`);
        const exists = await checkUrlExists(entry.cover);
        if (!exists) {
          console.log(`\x1b[33m⚠️  [Cover Check Failed] "${entry.title}" cover did not load. Setting cover to empty.\x1b[0m`);
          entry.cover = '';
        }
      }
      newNovels.push(entry);
    }
  }

  // --- Report ---
  console.log('--------------------------------------------------');
  console.log('📋 IMPORT REPORT:');
  console.log(`  • Already in database (skipped): \x1b[37m${skipped}\x1b[0m`);
  console.log(`  • Invalid / missing title (skipped): \x1b[31m${invalid}\x1b[0m`);
  console.log(`  • New novels to import: \x1b[32m${newNovels.length}\x1b[0m`);
  console.log('--------------------------------------------------\n');

  if (newNovels.length === 0) {
    console.log('\x1b[32m✓ Nothing to import — your database already contains all detected titles.\x1b[0m\n');
    return;
  }

  // Show preview of new novels
  console.log('\x1b[32m➕ NEW NOVELS DETECTED:\x1b[0m');
  newNovels.forEach((n, i) => {
    console.log(`  ${i + 1}. \x1b[1m${n.title}\x1b[0m`);
    console.log(`     Genre:  ${n.genre || 'None'}`);
    console.log(`     Status: ${n.status}`);
    console.log(`     URL:    \x1b[90m${n.sourceUrl || '—'}\x1b[0m`);
  });
  console.log();

  // --- Merge ---
  if (isMerge) {
    console.log('\x1b[36mProcessing merge into public/data.json...\x1b[0m');

    // Backup
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const timestamp  = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `data-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(mainDb, null, 2), 'utf-8');
    console.log(`✓ Backup created: \x1b[90m${backupPath}\x1b[0m`);

    // Assign IDs and prepend
    const updatedDb = [...mainDb];
    let nextIdVal   = parseInt(getNextId(mainDb), 10);

    for (const n of newNovels) {
      updatedDb.unshift({
        ...n,
        id:        formatId(nextIdVal++),
        newUpdate: 'yes',
      });
    }

    fs.writeFileSync(MAIN_DB_PATH, JSON.stringify(updatedDb, null, 2), 'utf-8');
    console.log(`\n\x1b[32m✔ Merged successfully! Added \x1b[1m${newNovels.length}\x1b[0m\x1b[32m new titles to public/data.json.\x1b[0m`);
    console.log(`Run \x1b[36mnpm run dev\x1b[0m to see the changes in the UI.\n`);
  } else {
    console.log('💡 \x1b[36mTip:\x1b[0m To write these changes to your database, run:');
    const pathArg = args.length > 0 ? ` ${args[0]}` : '';
    console.log(`   \x1b[1mnode scripts/sync-animestuff.js${pathArg} --merge\x1b[0m\n`);
    console.log('   or:');
    console.log(`   \x1b[1mnpm run sync:animestuff:merge\x1b[0m\n`);
  }
}

run();
