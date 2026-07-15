import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NOVEL_URL = 'https://animestuff.me/docs/assets/html/Kamigami-ni-Sodaterareshi-Mono-Saikyou-to-Naru.html';
const HOME_URL  = 'https://animestuff.me';

async function run() {
  console.log('Launching browser (headless)...');
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  // ── 1. Novel page ──────────────────────────────────────────────────────────
  console.log(`\nNavigating to novel page:\n  ${NOVEL_URL}`);
  await page.goto(NOVEL_URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(__dirname, 'animestuff-novel.png'), fullPage: true });
  console.log('Screenshot saved: animestuff-novel.png');

  // Extract full HTML of the novel page
  const novelHtml = await page.content();
  fs.writeFileSync(path.join(__dirname, 'animestuff-novel.html'), novelHtml, 'utf-8');
  console.log('Full HTML saved: animestuff-novel.html');

  // Extract all <a> tags that might be download links
  const links = await page.$$eval('a', els => els.map(el => ({
    text: el.textContent.trim(),
    href: el.href,
    class: el.className,
    id: el.id,
    dataset: Object.fromEntries(Object.entries(el.dataset))
  })));
  console.log(`\nFound ${links.length} <a> tags on the novel page.`);

  // Filter to likely download/epub/pdf links
  const downloadLinks = links.filter(l =>
    /epub|pdf|download|drive|mega|mediafire|drive\.google|zippyshare|gofile/i.test(l.href + l.text + l.class)
  );
  console.log(`  → ${downloadLinks.length} likely download links:`);
  downloadLinks.forEach(l => console.log(`    [${l.text}] ${l.href}`));

  // Extract any embedded JSON (script tags with data)
  const scriptData = await page.$$eval('script', scripts =>
    scripts
      .map(s => s.textContent.trim())
      .filter(t => t.length > 10 && (t.includes('{') || t.includes('[')))
  );
  console.log(`\nScript tags with data-like content: ${scriptData.length}`);
  scriptData.slice(0, 3).forEach((s, i) => {
    console.log(`  --- Script ${i + 1} (first 500 chars) ---`);
    console.log(`  ${s.substring(0, 500)}`);
  });

  // Try to extract volume structure from DOM
  console.log('\nLooking for volume/chapter rows...');
  const volumeRows = await page.$$eval(
    // Try common selectors for volume lists
    'tr, .volume, .chapter, [class*="vol"], [class*="chapter"], li',
    rows => rows.slice(0, 30).map(r => ({
      tag: r.tagName,
      class: r.className,
      text: r.textContent.trim().substring(0, 200),
      links: Array.from(r.querySelectorAll('a')).map(a => ({ text: a.textContent.trim(), href: a.href }))
    }))
  );
  console.log(`Found ${volumeRows.length} candidate rows (showing first 10):`);
  volumeRows.slice(0, 10).forEach((r, i) => {
    if (r.links.length > 0 || r.text.length > 5) {
      console.log(`  [${i}] <${r.tag}> class="${r.class}"`);
      console.log(`      text: "${r.text.substring(0, 100)}"`);
      r.links.forEach(l => console.log(`      link: [${l.text}] → ${l.href}`));
    }
  });

  // ── 2. Homepage ────────────────────────────────────────────────────────────
  console.log(`\nNavigating to homepage: ${HOME_URL}`);
  await page.goto(HOME_URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(__dirname, 'animestuff-home.png'), fullPage: true });
  console.log('Screenshot saved: animestuff-home.png');

  // Check if there's a JSON data file linked or loaded
  const homeLinks = await page.$$eval('a', els => els.slice(0, 50).map(el => ({
    text: el.textContent.trim().substring(0, 80),
    href: el.href
  })));
  console.log('\nFirst 20 homepage links:');
  homeLinks.slice(0, 20).forEach(l => console.log(`  [${l.text}] ${l.href}`));

  await browser.close();
  console.log('\nBrowser closed. Done!');
}

run().catch(err => {
  console.error('Scraper error:', err);
  process.exit(1);
});
