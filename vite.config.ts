import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/indraWeek5/',
  build: {
    outDir: '.',
    emptyOutDir: false,
  },
  plugins: [react()],
})
