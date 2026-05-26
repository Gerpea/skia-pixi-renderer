import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'PixiSkiaRenderer',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['pixi.js-legacy'],
      output: {
        globals: {
          'pixi.js-legacy': 'PIXI',
        }
      }
    },
    sourcemap: true,
    minify: false
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/tests/setup.ts']
  }
});