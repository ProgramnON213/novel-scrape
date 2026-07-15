import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_JSON_PATH = path.resolve(__dirname, '../animestuff-data.json');
const REMOTE_DATA_URL = 'https://animestuff.me/novels.json';

async function run() {
  console.log('\x1b[35m==================================================');
  console.log('    📥 Fetching AnimeStuff Remote Data');
  console.log('==================================================\x1b[0m\n');

  try {
    console.log(`Fetching remote catalogue from: \x1b[36m${REMOTE_DATA_URL}\x1b[0m ...`);
    const response = await fetch(REMOTE_DATA_URL);
    if (!response.ok) {
      console.error(`\x1b[31mFailed to fetch: ${response.status} ${response.statusText}\x1b[0m`);
      process.exit(1);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error('\x1b[31mError: Fetched remote data is not a valid JSON array.\x1b[0m');
      process.exit(1);
    }

    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✓ Remote data saved successfully to: \x1b[90manimestuff-data.json\x1b[0m\n`);

    // Run the local sync-animestuff.js script using spawnSync, forwarding arguments
    const syncScriptPath = path.resolve(__dirname, 'sync-animestuff.js');
    console.log(`Executing local sync script: \x1b[32mnode ${path.relative(path.resolve(__dirname, '..'), syncScriptPath)}\x1b[0m ...\n`);

    const childArgs = [syncScriptPath, LOCAL_JSON_PATH, ...process.argv.slice(2)];
    const spawnResult = spawnSync('node', childArgs, { stdio: 'inherit' });

    if (spawnResult.error) {
      console.error('\x1b[31mError executing sync script:\x1b[0m', spawnResult.error.message);
      process.exit(1);
    }

    process.exit(spawnResult.status);
  } catch (error) {
    console.error(`\x1b[31mError during remote fetch-sync process:\x1b[0m`, error.message);
    process.exit(1);
  }
}

run();
