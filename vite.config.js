import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'OakView',
      formats: ['es', 'umd'],
      fileName: (format) => `oakview.${format}.js`
    },
    rollupOptions: {
      external: ['lightweight-charts'],
      output: {
        globals: {
          'lightweight-charts': 'LightweightCharts'
        }
      }
    }
  }
});
