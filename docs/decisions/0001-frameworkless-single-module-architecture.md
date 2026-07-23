# ADR-001: Framework-less Single Module Frontend Architecture

## Status
Accepted

## Date
2026-07-23

## Context
`novel-scrape` is a static web application designed for browsing, searching, and managing personal light novel / web novel libraries. The project requires high performance, instant search response times, minimal bundle overhead, offline-first reliability, and seamless deployment on free static hosting (e.g., GitHub Pages).

Key requirements:
- Sub-100ms UI responsiveness during fast typing searches across hundreds of novel records.
- Zero external runtime server or complex framework lifecycle overhead.
- Simple, predictable state management without reactive state trees or virtual DOM diffing costs.
- High developer transparency for AI agents and human maintainers working on the codebase.

## Decision
We choose a **framework-less (vanilla) single module architecture**:
1. **Zero Runtime Frameworks**: Rely strictly on standard HTML5, custom CSS properties (Vanilla CSS), and native ES Module JavaScript.
2. **Single Module JS**: Centralize core application logic (initialization, tag state engine, search filtering, grid rendering, detail modal, local storage persistence, backup export/import, and encryption/sync handlers) in [`main.js`](file:///d:/Download/novel-scrape/main.js).
3. **Vanilla CSS Design Tokens**: Define all colors, typography, glassmorphism effects, and theme variables in [`style.css`](file:///d:/Download/novel-scrape/style.css) using standard CSS variables and `:root` / theme body classes.

## Alternatives Considered

### React / Vue / Svelte Frameworks
- **Pros**: Declarative component rendering, established ecosystem.
- **Cons**: Adds bundle size (react + react-dom / vue runtime), build complexity, virtual DOM overhead for simple grid rendering, and framework version drift.
- **Rejected**: Vanilla JS fulfills all component and modal interaction needs with zero framework dependency and maximum performance.

### Modular Code-Splitting across multiple JS files
- **Pros**: Smaller per-file line counts.
- **Cons**: Introduces import graph management, module binding complexity, cross-file circular dependency risks in vanilla JS, and multi-file context tracking overhead for AI coding assistants.
- **Rejected**: Single module [`main.js`](file:///d:/Download/novel-scrape/main.js) provides zero-friction state access and clear sequential control flow.

## Consequences
- **High Performance**: Initial load and grid rendering are virtually instantaneous, with zero framework hydration delays.
- **Zero Maintenance Overhead**: Upgrading runtime dependencies is unnecessary since there are no runtime UI frameworks.
- **AI Context Efficiency**: AI agents can inspect the entire frontend architecture in a single file ([`main.js`](file:///d:/Download/novel-scrape/main.js)), eliminating hallucinated imports or cross-module state bugs.
- **Discipline Required**: Developers and AI agents must maintain event delegation singletons and clear function organization within [`main.js`](file:///d:/Download/novel-scrape/main.js) to keep code readable.
