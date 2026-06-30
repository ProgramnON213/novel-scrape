import { defineConfig } from 'vite';

export default defineConfig({
  // Use './' so all asset/fetch paths are relative.
  // This makes the build work correctly whether deployed to the root
  // (username.github.io) or a subpath (username.github.io/repo-name/).
  base: './',
});
