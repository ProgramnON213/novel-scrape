import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_NEW_DATA_PATH = path.resolve(__dirname, 'temp-new-data.json');
const TEMP_BACKUP_DIR = path.resolve(__dirname, 'temp-sync-backups');
const CACHE_PATH = path.resolve(__dirname, 'temp-test-sync-cache.json');

function cleanup() {
  if (fs.existsSync(TEMP_NEW_DATA_PATH)) fs.unlinkSync(TEMP_NEW_DATA_PATH);
  if (fs.existsSync(TEMP_BACKUP_DIR)) fs.rmSync(TEMP_BACKUP_DIR, { recursive: true, force: true });
  if (fs.existsSync(CACHE_PATH)) fs.unlinkSync(CACHE_PATH);
}

test('Novel Sync Script Link Checking and Caching', async (t) => {
  if (fs.existsSync(CACHE_PATH)) {
    fs.unlinkSync(CACHE_PATH);
  }

  t.after(() => {
    cleanup();
  });

  await t.test('checks and populates link cache on cover updates and new titles', () => {
    const newData = [
      {
        id: "0000001",
        title: "Nekonoyama Neneko Becomes a Neko",
        cover: "https://animestuff.me/novel/Omiai/1.jpg",
        sourceUrl: "https://animestuff.me/docs/assets/html/Kamigami-ni-Sodaterareshi-Mono-Saikyou-to-Naru.html"
      },
      {
        title: "Brand New Unique Test Novel For Cache",
        cover: "https://animestuff.me/novel/Omiai/1.jpg",
        sourceUrl: "https://animestuff.me/docs/assets/html/Kamigami-ni-Sodaterareshi-Mono-Saikyou-to-Naru.html"
      }
    ];

    fs.writeFileSync(TEMP_NEW_DATA_PATH, JSON.stringify(newData, null, 2), 'utf-8');

    // Run sync-novels.js passing temp new data file
    const result = spawnSync('node', [
      path.resolve(__dirname, 'sync-novels.js'),
      TEMP_NEW_DATA_PATH,
      '--backup-dir',
      TEMP_BACKUP_DIR,
      '--cache-file',
      CACHE_PATH
    ], { encoding: 'utf-8' });

    console.log(result.stdout);
    assert.strictEqual(result.status, 0, 'sync-novels.js should exit with status 0');

    // Verify cache file was populated with the validated cover and sourceUrl
    assert.ok(fs.existsSync(CACHE_PATH), 'Cache file should be created');
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    assert.ok(cache["https://animestuff.me/novel/Omiai/1.jpg"], 'Valid cover should be in cache');
    assert.ok(cache["https://animestuff.me/docs/assets/html/Kamigami-ni-Sodaterareshi-Mono-Saikyou-to-Naru.html"], 'Valid sourceUrl should be in cache');
  });

  await t.test('uses link cache on subsequent runs to avoid re-checking', () => {
    const result = spawnSync('node', [
      path.resolve(__dirname, 'sync-novels.js'),
      TEMP_NEW_DATA_PATH,
      '--backup-dir',
      TEMP_BACKUP_DIR,
      '--cache-file',
      CACHE_PATH
    ], { encoding: 'utf-8' });

    console.log(result.stdout);
    assert.strictEqual(result.status, 0, 'sync-novels.js should exit with status 0 on cached run');

    // Verify output indicates network checks were skipped due to cache
    assert.ok(!result.stdout.includes('Checking if updated cover loads'), 'Should skip cover network check when URL is cached');
    assert.ok(!result.stdout.includes('Checking if cover image for new novel'), 'Should skip new novel cover check when cached');
  });
});
