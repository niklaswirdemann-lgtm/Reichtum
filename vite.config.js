import { defineConfig } from 'vite';

// relative base so the build works from any sub-path (e.g. GitHub Pages /Reichtum/)
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 800 },
});
