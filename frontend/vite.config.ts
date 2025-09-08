import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // docs/ 配下のJSONをビルド時に読み込めるよう上位参照を許可
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
});

