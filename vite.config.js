import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.', // Serve from project root to allow access to all examples
  server: {
    fs: {
      // Allow serving files from parent directory (oakscript-engine)
      allow: [
        // Search up for workspace root
        resolve(__dirname, '..'),
        // Allow the oakscript-engine folder
        'C:/Users/otrem/PycharmProjects/oakscript-engine'
      ]
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'OakView',
      formats: ['es', 'umd'],
      fileName: (format) => `oakview.${format}.js`
    },
    rollupOptions: {
      // Ensure lightweight-charts is bundled (not externalized)
      // This makes it easier to use as a standalone script
      output: {
        globals: {}
      }
    }
  }
});
