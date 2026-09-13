import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        feedback: resolve(process.cwd(), 'index.html'),
        weather: resolve(process.cwd(), 'weather/index.html'),
      },
    },
  },
})
