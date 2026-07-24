import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, '../backup');

// Max size threshold for test artifact backups (in bytes). Real backups are > 500KB.
const TEST_BACKUP_SIZE_THRESHOLD = 50 * 1024; // 50 KB

const args = process.argv.slice(2);
const isWrite = args.includes('--write');

async function run() {
  console.log('\x1b[35m==================================================');
  console.log('       🧹 Backup Directory Cleanup Tool');
  console.log('==================================================\x1b[0m\n');

  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backup directory found.');
    return;
  }

  const files = fs.readdirSync(BACKUP_DIR);
  let totalFiles = 0;
  let testBackupsFound = 0;
  let bytesSaved = 0;

  console.log(`Scanning \x1b[36m${files.length}\x1b[0m backup files in \x1b[90m${BACKUP_DIR}\x1b[0m...\n`);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    totalFiles++;

    const filePath = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(filePath);

    if (stat.size < TEST_BACKUP_SIZE_THRESHOLD) {
      testBackupsFound++;
      bytesSaved += stat.size;

      if (isWrite) {
        fs.unlinkSync(filePath);
        console.log(`  🗑️ Deleted test backup: \x1b[90m${file}\x1b[0m (${stat.size} bytes)`);
      } else {
        console.log(`  🔍 Found test backup: \x1b[90m${file}\x1b[0m (${stat.size} bytes)`);
      }
    }
  }

  console.log('\n--------------------------------------------------');
  console.log(`Total backup files scanned: ${totalFiles}`);
  console.log(`Test artifact backups found: \x1b[33m${testBackupsFound}\x1b[0m`);
  console.log(`Space to reclaim:           \x1b[32m${(bytesSaved / 1024).toFixed(2)} KB\x1b[0m`);
  console.log('--------------------------------------------------\n');

  if (!isWrite && testBackupsFound > 0) {
    console.log('💡 \x1b[36mTip:\x1b[0m To delete these test backup files, run:');
    console.log('   \x1b[1mnode scripts/clean-backups.js --write\x1b[0m\n');
  } else if (isWrite) {
    console.log('\x1b[32m✔ Successfully cleaned up test backup files!\x1b[0m\n');
  } else {
    console.log('\x1b[32m✔ Backup folder is clean — no test backup artifacts found.\x1b[0m\n');
  }
}

run();
