import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tsVanilla: resolve(__dirname, 'ts-vanilla/index.html'),
        heroku: resolve(__dirname, 'heroku/index.html'),
        // vanilla: resolve(__dirname, 'vanilla/index.html'),
        webrtcUtils: resolve(__dirname, 'ts-vanilla-webrtc-utils/index.html'),
      },
    },
  },
})
