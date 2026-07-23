import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadLinkCache, saveLinkCache, isUrlCachedAndValid } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.resolve(__dirname, 'temp-test-cache-dir');
const TEMP_CACHE_FILE = path.join(TEMP_DIR, 'nested', 'link-cache.json');
const CORRUPT_CACHE_FILE = path.join(TEMP_DIR, 'corrupt.json');

test('Link Cache Utilities (utils.js)', async (t) => {
  t.before(() => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  t.after(() => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  await t.test('loadLinkCache - returns empty object if file does not exist', () => {
    const nonExistentPath = path.join(TEMP_DIR, 'does-not-exist.json');
    const cache = loadLinkCache(nonExistentPath);
    assert.deepStrictEqual(cache, {});
  });

  await t.test('loadLinkCache - returns empty object and warns on corrupt JSON', () => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.writeFileSync(CORRUPT_CACHE_FILE, '{ invalid json: ', 'utf-8');
    const cache = loadLinkCache(CORRUPT_CACHE_FILE);
    assert.deepStrictEqual(cache, {});
  });

  await t.test('saveLinkCache - creates directory and saves cache successfully', () => {
    const sampleCache = {
      'https://example.com/cover.jpg': 1700000000000
    };
    saveLinkCache(TEMP_CACHE_FILE, sampleCache);

    assert.ok(fs.existsSync(TEMP_CACHE_FILE), 'Cache file should be created');
    const loaded = loadLinkCache(TEMP_CACHE_FILE);
    assert.deepStrictEqual(loaded, sampleCache);
  });

  await t.test('isUrlCachedAndValid - checks URL cache TTL correctly', () => {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    
    const mockCache = {
      'https://example.com/recent.jpg': now - (1000 * 60 * 60), // 1 hour ago
      'https://example.com/expired.jpg': now - (SEVEN_DAYS_MS + 1000), // 7 days + 1 second ago
    };

    // Valid inputs
    assert.strictEqual(isUrlCachedAndValid('https://example.com/recent.jpg', mockCache), true, 'Recent URL should be valid');
    assert.strictEqual(isUrlCachedAndValid('https://example.com/expired.jpg', mockCache), false, 'Expired URL should be invalid');
    assert.strictEqual(isUrlCachedAndValid('https://example.com/uncached.jpg', mockCache), false, 'Uncached URL should be invalid');

    // Edge case / Invalid inputs
    assert.strictEqual(isUrlCachedAndValid(null, mockCache), false, 'Null URL should return false');
    assert.strictEqual(isUrlCachedAndValid('', mockCache), false, 'Empty URL should return false');
    assert.strictEqual(isUrlCachedAndValid('https://example.com/recent.jpg', null), false, 'Null cache object should return false');

    // Custom TTL expiryMs
    const customTtlMs = 1000 * 60 * 30; // 30 minutes
    assert.strictEqual(isUrlCachedAndValid('https://example.com/recent.jpg', mockCache, customTtlMs), false, '1-hour old URL should be invalid under 30-min TTL');
  });
});
