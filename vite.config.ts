import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      types: resolve('src/types'),
      common: resolve('src/common'),
      request: resolve('src/request'),
    },
  },
  build: {
    lib: {
      entry: {
        reviewManager: resolve('src/processes/reviewManagerProcess/index.ts'),
        fileWatch: resolve('src/processes/fileWatchProcess/index.ts'),
      },
      formats: ['cjs'],
      fileName: (format: string, entryName: string) => {
        return `${entryName}.${format}`;
      },
    },
  },
  plugins: [dts()],
});
