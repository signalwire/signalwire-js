import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tsVanilla: resolve(__dirname, 'ts-vanilla/index.html')
      }
    }
  }
})
