import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    host: true,
  },

  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        pos: './pos.html',
      },
    },
  },

  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],
})