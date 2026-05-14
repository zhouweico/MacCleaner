import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

function forceCjsFormat(entryName: string): Plugin {
  return {
    name: 'force-cjs',
    config(config) {
      if (config.build?.lib) {
        config.build.lib.formats = ['cjs'];
        config.build.lib.fileName = () => `${entryName}.cjs`;
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(args) {
          args.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
          plugins: [forceCjsFormat('main')],
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
          plugins: [forceCjsFormat('preload')],
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
