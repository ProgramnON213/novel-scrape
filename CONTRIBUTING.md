# 🤝 Contributing to Novel Search

Thank you for your interest in contributing to **Novel Search (novel-scrape)**! This guide outlines our branching strategies, coding rules, commit practices, and verification steps for both human contributors and AI agents.

---

## 📐 Core Architecture Rules

Before writing code, review the foundational rules defined in [.agents/AGENTS.md](file:///d:/Download/novel-scrape/.agents/AGENTS.md) and [CLAUDE.md](file:///d:/Download/novel-scrape/CLAUDE.md):

1. **Zero Runtime Frameworks**: Stick strictly to vanilla HTML5, custom CSS properties, and native ES Module JavaScript. Do not introduce React, Vue, Svelte, Tailwind CSS, or runtime bundlers for frontend rendering.
2. **Single Module JS**: All core application logic must remain in [`main.js`](file:///d:/Download/novel-scrape/main.js). Do not introduce new frontend JS files or code-splitting without an approved ADR.
3. **CSS Custom Properties**: Maintain all styling, themes, and design tokens in [`style.css`](file:///d:/Download/novel-scrape/style.css) using CSS variables.
4. **Data Integrity**: Never edit [`public/data.json`](file:///d:/Download/novel-scrape/public/data.json) directly without running data standardization (`npm run clean:write` or `npm run sync:merge`).

---

## 🌿 Git Workflow & Branching

### Trunk-Based Development
- `main` is always deployable and triggers GitHub Pages deployment via CI/CD.
- Work in short-lived feature or fix branches:
  - `feature/<short-description>`
  - `fix/<short-description>`
  - `chore/<short-description>`
  - `docs/<short-description>`

### Commit Discipline
- Make **atomic commits** (each commit does one logical thing).
- Use conventional commit messages:
  - `feat: add volume filtering in modal`
  - `fix: resolve tag state cycle bug`
  - `docs: update user guide sync instructions`
  - `chore: bump dev dependencies`
- Write descriptive commit messages explaining *why*, not just *what*.

---

## 🏷️ Versioning & Releases

We adhere to **Semantic Versioning** (`MAJOR.MINOR.PATCH`):
- **MAJOR**: Breaking schema changes or incompatible storage migrations.
- **MINOR**: Backward-compatible new features (e.g., new theme, new filtering capability).
- **PATCH**: Backward-compatible bug fixes or minor documentation updates.

All releases must be tagged in git (e.g., `git tag -a v1.0.0 -m "Release 1.0.0"`) and documented in [`CHANGELOG.md`](file:///d:/Download/novel-scrape/CHANGELOG.md).

---

## 🧪 Verification & Testing

Before submitting a Pull Request, verify your changes pass all build and test steps:

```bash
# 1. Verify Vite production build
npm run build

# 2. Run data cleansing test suite
node scripts/clean-data.test.js

# 3. Run Playwright browser end-to-end tests
cd browser-test && npm install && node test.js
```
