import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/oakview-chart.js'),
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
