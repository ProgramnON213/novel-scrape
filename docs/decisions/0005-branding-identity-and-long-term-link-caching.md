# ADR-005: Branding Identity, Source Attribution, and 90-Day Link Caching

## Status
Accepted (supersedes ADR-004 section 4 link cache duration)

## Date
2026-09-08

## Context
1. **Application Identity & Attribution**: Novel Search previously lacked an integrated favicon and visual brand emblem in the UI header. Furthermore, the dataset aggregates titles from external catalogues (specifically EsNovels and Animestuff), but lacked explicit on-page source attribution for users browsing the collection.
2. **Link Verification Cache Invalidation Rate**: In ADR-004, network verification cached tested cover images and source URLs in `public/link-cache.json` with a 7-day expiration. In practice, web novel cover images and catalogue URLs are highly stable and infrequently deleted. Re-verifying thousands of URLs every 7 days imposed unnecessary network latency and rate-limit risks during regular sync/cleansing script runs.

## Decision
1. **Vector Branding Emblem & Favicon**:
   - Create a scalable SVG emblem (`public/icon.svg`) representing an illuminated book with theme-adaptive accents.
   - Link `icon.svg` as the browser tab favicon via `<link rel="icon" type="image/svg+xml" href="/icon.svg">` in `index.html`.
   - Render the emblem in the desktop and mobile header adjacent to `<h1>Novel Search</h1>`, wired to reset active search and filters upon click.
2. **Semantic Source Attribution Footer**:
   - Add a semantic `<footer class="app-footer">` to `index.html` with outbound links (`target="_blank" rel="noopener noreferrer"`) to:
     - [EsNovels](https://esnovels.github.io/EsNovels1/index.html)
     - [Animestuff](https://animestuff.me/)
   - Style the footer in `style.css` using theme CSS variables (`--card-border`, `--card-bg`, `--accent-primary`, `--text-muted`, `--pill-active-bg`) to maintain visual consistency across Midnight Abyss, Sakura Cozy, and Cyberpunk Neon themes.
3. **90-Day Link Validation Cache TTL (Superseding ADR-004 section 4)**:
   - Extend the link validation cache TTL from 7 days to 90 days (`90 * 24 * 60 * 60 * 1000`) across all utility and sync scripts (`scripts/utils.js`, `scripts/clean-data.js`, `scripts/sync-novels.js`, `scripts/sync-animestuff.js`).
   - Valid URLs will not trigger redundant HTTP HEAD/GET checks for 3 months, drastically accelerating routine deduplication and cleansing operations.

## Alternatives Considered

### Bitmapped PNG/ICO Icon Assets
- **Pros**: Traditional multi-resolution `.ico` compatibility.
- **Cons**: Larger file footprint, raster scaling artifacts on high-DPI displays.
- **Rejected**: Modern browsers natively support SVG favicons (`type="image/svg+xml"`), providing crisp vector rendering at any scale under 2KB.

### Header Subtitle for Attribution vs Footer
- **Pros**: High initial visibility.
- **Cons**: Competes with search bar and filter controls in the limited above-the-fold mobile header space.
- **Rejected**: A clean, accessible footer provides permanent attribution without cluttering the primary search and reading workflow.

### Indefinite (Infinite) Link Caching
- **Pros**: Zero re-checks ever.
- **Cons**: CDN domain rotations or permanent 404s would never be caught on subsequent maintenance runs.
- **Rejected**: 90 days strikes the ideal balance between performance optimization and data freshness.

## Consequences
- **Enhanced Brand Recognition**: Distinct tab favicon and header emblem improve user recall and visual polish.
- **Clear Attribution**: Direct external links acknowledge source catalogues transparently.
- **Maintenance Performance**: Routine `--check-links` runs execute in milliseconds for all entries verified within the last 90 days.
