import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/khach/.gemini/antigravity/brain/c0ff3d13-e020-4219-9749-2c1d19e6e4af';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport size for consistent screenshot comparison
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('Navigating to http://localhost:5173/...');
  await page.goto('http://localhost:5173/');

  // Wait for the novel cards to load in the grid
  console.log('Waiting for novel grid to render...');
  await page.waitForSelector('.novel-card');

  // Capture baseline (Midnight theme)
  console.log('Theme 1: Midnight theme (baseline)...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'theme_midnight.png') });
  console.log('Midnight theme screenshot saved.');

  // Click Sakura theme
  console.log('Theme 2: Switching to Sakura...');
  await page.click('#theme-sakura');
  await page.waitForTimeout(500); // Wait for transition
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'theme_sakura.png') });
  console.log('Sakura theme screenshot saved.');

  // Click Neon theme
  console.log('Theme 3: Switching to Neon...');
  await page.click('#theme-cyberpunk');
  await page.waitForTimeout(500); // Wait for transition
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'theme_neon.png') });
  console.log('Neon theme screenshot saved.');

  // Switch back to Midnight theme
  console.log('Switching back to Midnight...');
  await page.click('#theme-midnight');
  await page.waitForTimeout(500);

  // Toggle Tag panel
  console.log('Tag Filters: Toggling tag panel...');
  await page.click('#tagToggleBtn');
  await page.waitForSelector('#tagPanel.tag-panel');
  await page.waitForTimeout(500);
  
  // Click the first tag to filter (e.g. Comedy, Romance, etc.)
  const firstTag = await page.$('.tag-pill');
  if (firstTag) {
    const tagName = await firstTag.textContent();
    console.log(`Clicking on first tag: "${tagName}"`);
    await firstTag.click();
    await page.waitForTimeout(500); // Wait for filter to apply
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'tag_filter.png') });
    console.log(`Filtered by tag "${tagName}". Screenshot saved.`);
    
    // Clear tag filters
    console.log('Clearing tag filters...');
    await page.click('#clearTagsBtn');
    await page.waitForTimeout(500);
  }

  // Perform search
  console.log('Search: Typing "Losers" into search box...');
  await page.fill('#searchInput', 'Losers');
  await page.waitForTimeout(600); // Wait for filter debounce (50ms + render)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'search_losers.png') });
  console.log('Search results screenshot saved.');

  // Click on the filtered novel card to open modal
  console.log('Modal: Clicking on the first novel card to open modal...');
  const card = await page.$('.novel-card');
  if (card) {
    await card.click();
    // Wait for modal to open
    await page.waitForSelector('#novelModal.show');
    await page.waitForTimeout(500); // Wait for modal slide/fade transition
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_open.png') });
    console.log('Modal details screenshot saved.');

    // Click inside the modal (e.g. favorite toggle)
    const favBtn = await page.$('#favToggleBtn');
    if (favBtn) {
      console.log('Toggling favorites in modal...');
      await favBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_favorite.png') });
      console.log('Toggled favorite. Screenshot saved.');
    }

    // Close the modal
    console.log('Closing modal...');
    await page.click('.close-btn');
    await page.waitForTimeout(500); // Wait for modal close transition
  }

  // Final page capture
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'final_state.png') });
  console.log('Final page state screenshot saved.');

  console.log('Closing browser...');
  await browser.close();
  console.log('Playwright run completed successfully!');
}

run().catch(err => {
  console.error('Error during run:', err);
  process.exit(1);
});
