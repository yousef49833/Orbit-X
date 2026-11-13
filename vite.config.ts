import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(projectRoot),
      },
    },
    server: {
      // HMR can be disabled via DISABLE_HMR for local performance tuning.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Keep file watching active unless the environment explicitly disables it.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
