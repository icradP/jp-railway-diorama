import { defineConfig } from 'vite';
import { resolve } from 'path';

// Relative base so the build works on GitHub Pages project sites
// (https://<user>.github.io/<repo>/) and locally.
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
