import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import svgr from "vite-plugin-svgr";
import tsconfigPaths from 'vite-tsconfig-paths';

const scssVariables = resolve(__dirname, 'src/scss/_variables').replace(/\\/g, '/');
const scssMixins = resolve(__dirname, 'src/scss/mixins').replace(/\\/g, '/');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [ svgr(), react(), tsconfigPaths({root: __dirname})],
  resolve: {
    alias: {
      $fonts: resolve('./src/vendor/fonts'),
      $assets: resolve('./src/assets'),
    }
  },
  build: {
    assetsInlineLimit:0,
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: (source: string, filename: string) => {
          if (filename.includes('_variables') || filename.includes('mixins')) {
            return source;
          }
          return `@use "${scssVariables}" as *;\n@use "${scssMixins}";\n${source}`;
        },
      },
    }
  },

})