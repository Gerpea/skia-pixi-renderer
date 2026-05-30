import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dts from 'vite-plugin-dts';
import commonjs from "@rollup/plugin-commonjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: '.',
  publicDir: 'public',

  plugins: [
    dts({
      include: ['src'],
      exclude: ['node_modules', 'vendor', 'example', 'dist'],
      staticImport: true,
      insertTypesEntry: true
    }),
    commonjs({
      include: /node_modules/,
      exclude: [/vendor\/canvaskit-wasm/, /node_modules\/canvaskit-wasm/],
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'skpxr': path.resolve(__dirname, '../src/index.ts'),
      'canvaskit-wasm': path.resolve(__dirname, '../vendor/canvaskit-wasm/index.js')
    }
  },

  server: {
    port: 3000,
    open: true,
    fs: {
      strict: false,
      allow: [
        path.resolve(__dirname, '..'),
        path.resolve(__dirname, '../vendor')
      ],
    }
  },

  optimizeDeps: {
    exclude: ['skpxr', 'canvaskit-wasm']
  },

  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler' }
    }
  }
});