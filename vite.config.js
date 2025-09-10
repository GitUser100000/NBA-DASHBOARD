import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './frontend',  // Tell Vite to use frontend as root
  build: {
    outDir: '../dist',  // Output to root dist folder
    emptyOutDir: true
  }
})