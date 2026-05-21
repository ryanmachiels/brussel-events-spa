import { defineConfig } from 'vite';

// Vanilla JS project: index.html in de root is automatisch het entry point.
// We zetten een relatieve base zodat de build (dist/) ook werkt wanneer de
// app niet vanaf de domein-root wordt geserveerd.
export default defineConfig({
  base: './',
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});
