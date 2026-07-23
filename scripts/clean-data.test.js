import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DB_PATH = path.resolve(__dirname, 'temp-test-db.json');
const CACHE_PATH = path.resolve(__dirname, '../public/link-cache.json');

function setupTempDb(data) {
  fs.writeFileSync(TEMP_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function cleanup() {
  if (fs.existsSync(TEMP_DB_PATH)) {
    fs.unlinkSync(TEMP_DB_PATH);
  }
}

test('Database Clean Script Link Checking and Caching', async (t) => {
  // Clear any existing cache before test
  if (fs.existsSync(CACHE_PATH)) {
    fs.unlinkSync(CACHE_PATH);
  }

  t.after(() => {
    cleanup();
  });

  await t.test('supports --check-links, clears dead URLs, and populates cache file', () => {
    const mockData = [
      {
        id: "0000001",
        title: "Test Novel 1 (Valid URLs)",
        cover: "https://animestuff.me/novel/Omiai/1.jpg",
        sourceUrl: "https://animestuff.me/docs/assets/html/Kamigami-ni-Sodaterareshi-Mono-Saikyou-to-Naru.html",
        volumes: []
      },
      {
        id: "0000002",
        title: "Test Novel 2 (Dead URLs)",
        cover: "https://nonexistent-url-site-dead-test.xyz/dead-cover.jpg",
        sourceUrl: "https://nonexistent-url-site-dead-test.xyz/dead-source.html",
        volumes: []
      }
    ];

    setupTempDb(mockData);

    // Run clean-data.js with the temp db in WRITE mode with --check-links
    const result = spawnSync('node', [
      path.resolve(__dirname, 'clean-data.js'),
      TEMP_DB_PATH,
      '--check-links',
      '--write'
    ], { encoding: 'utf-8' });

    console.log(result.stdout);
    if (result.status !== 0) {
      console.error(result.stderr);
    }

    assert.strictEqual(result.status, 0, 'clean-data.js should exit with status 0');

    // Verify database was cleaned (dead links emptied, valid links preserved)
    const cleanedDb = JSON.parse(fs.readFileSync(TEMP_DB_PATH, 'utf-8'));
    assert.strictEqual(cleanedDb[0].cover, "https://animestuff.me/novel/Omiai/1.jpg", "Valid cover should be preserved");
    assert.strictEqual(cleanedDb[0].sourceUrl, "https://animestuff.me/docs/assets/html/Kamigami-ni-Sodaterareshi-Mono-Saikyou-to-Naru.html", "Valid sourceUrl should be preserved");
    assert.strictEqual(cleanedDb[1].cover, "", "Dead cover should be cleared");
    assert.strictEqual(cleanedDb[1].sourceUrl, "", "Dead sourceUrl should be cleared");

    // Verify cache file was populated
    assert.ok(fs.existsSync(CACHE_PATH), 'Cache file should be created');
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    assert.ok(cache["https://animestuff.me/novel/Omiai/1.jpg"], 'Valid cover should be in cache');
    assert.ok(cache["https://animestuff.me/docs/assets/html/Kamigami-ni-Sodaterareshi-Mono-Saikyou-to-Naru.html"], 'Valid sourceUrl should be in cache');
    assert.strictEqual(cache["https://nonexistent-url-site-dead-test.xyz/dead-cover.jpg"], undefined, 'Dead cover should not be in cache');
  });

  await t.test('uses cache on subsequent runs to avoid network calls', () => {
    // Run clean-data.js again on the cleaned temp DB
    const result = spawnSync('node', [
      path.resolve(__dirname, 'clean-data.js'),
      TEMP_DB_PATH,
      '--check-links'
    ], { encoding: 'utf-8' });

    console.log(result.stdout);
    assert.strictEqual(result.status, 0, 'clean-data.js should exit with status 0 on cached run');

    // Verify stdout reports cache hits
    assert.ok(result.stdout.includes('Cache hits: 1'), 'Should report 1 cover cache hit');
    assert.ok(result.stdout.includes('Cache hits: 1'), 'Should report 1 sourceUrl cache hit');
  });

  await t.test('inherits sourceUrl from duplicate entry and validates it', () => {
    const mockData = [
      {
        id: "0000003",
        title: "Duplicate Novel",
        cover: "",
        sourceUrl: "",
        volumes: [
          { title: "Volume 1", link1: "https://link-center.net/vol1" }
        ]
      },
      {
        id: "0000004",
        title: "Duplicate Novel",
        cover: "",
        sourceUrl: "https://animestuff.me/docs/assets/html/Kamigami-ni-Sodaterareshi-Mono-Saikyou-to-Naru.html",
        volumes: []
      }
    ];

    setupTempDb(mockData);

    const result = spawnSync('node', [
      path.resolve(__dirname, 'clean-data.js'),
      TEMP_DB_PATH,
      '--check-links',
      '--write'
    ], { encoding: 'utf-8' });

    console.log(result.stdout);
    assert.strictEqual(result.status, 0, 'clean-data.js should exit with status 0 on duplicate run');

    const cleanedDb = JSON.parse(fs.readFileSync(TEMP_DB_PATH, 'utf-8'));
    assert.strictEqual(cleanedDb.length, 1, 'Should merge duplicate records into one');
    assert.strictEqual(cleanedDb[0].sourceUrl, "https://animestuff.me/docs/assets/html/Kamigami-ni-Sodaterareshi-Mono-Saikyou-to-Naru.html", "Survivor should inherit valid sourceUrl from discarded duplicate");
  });

  await t.test('inherits valid cover from duplicate entry if kept cover is broken or missing', () => {
    const mockData = [
      {
        id: "0000005",
        title: "Duplicate Cover Novel",
        cover: "https://nonexistent-url-site-dead-test.xyz/dead-cover.jpg",
        sourceUrl: "",
        volumes: [
          { title: "Volume 1", link1: "https://link-center.net/vol1" }
        ]
      },
      {
        id: "0000006",
        title: "Duplicate Cover Novel",
        cover: "https://animestuff.me/novel/Omiai/1.jpg",
        sourceUrl: "",
        volumes: []
      }
    ];

    setupTempDb(mockData);

    const result = spawnSync('node', [
      path.resolve(__dirname, 'clean-data.js'),
      TEMP_DB_PATH,
      '--check-links',
      '--write'
    ], { encoding: 'utf-8' });

    console.log(result.stdout);
    assert.strictEqual(result.status, 0, 'clean-data.js should exit with status 0 on duplicate run');

    const cleanedDb = JSON.parse(fs.readFileSync(TEMP_DB_PATH, 'utf-8'));
    assert.strictEqual(cleanedDb.length, 1, 'Should merge duplicate records into one');
    assert.strictEqual(cleanedDb[0].cover, "https://animestuff.me/novel/Omiai/1.jpg", "Survivor should replace broken cover with valid cover from discarded duplicate");
  });
});

