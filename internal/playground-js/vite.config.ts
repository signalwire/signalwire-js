import { defineConfig, ViteDevServer } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { IncomingMessage, ServerResponse } from 'node:http'

// ESM-friendly approach as compared to the Node's __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createFolderList() {
  const pwd = path.join(__dirname, 'src')
  const folders = fs.readdirSync(pwd, { withFileTypes: true })

  // Filter directories only
  const folderNames: string[] = folders
    .map((file) => (file.isDirectory() ? file.name + '/' : ''))
    .filter((name) => !!name)

  // Build an <ul> with links
  return `
    <ul>
      ${folderNames
        .map(
          (name) =>
            `<li><a href="src/${name}" class="block mx-3 my-4 font-bold text-indigo-600">☞ ${name}</a></li>`
        )
        .join('')}
    </ul>`
}

/**
 * Custom plugin that lists subfolders of /src at the root URL.
 */
function listPlugin() {
  return {
    name: 'sw-list-folders',
    // Inject the list into the HTML template
    transformIndexHtml(html: string) {
      const folderListMarkup = createFolderList()

      const target = '<div id="folder-list"></div>'
      if (html.includes(target)) {
        return html.replace(
          target,
          `<div id="folder-list">${folderListMarkup}</div>`
        )
      }

      return html
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [listPlugin()],
  base: process.env.VITE_BASE ?? '/',
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        video: path.resolve(__dirname, 'src/video/index.html'),
        chat: path.resolve(__dirname, 'src/chat/index.html'),
        fabric: path.resolve(__dirname, 'src/fabric/index.html'),
        pubSub: path.resolve(__dirname, 'src/pubSub/index.html'),
        videoManager: path.resolve(__dirname, 'src/videoManager/index.html'),
        fabricHttp: path.resolve(__dirname, 'src/fabric-http/index.html'),
        fabricCallee: path.resolve(__dirname, 'src/fabric-callee/index.html'),
        sw: path.resolve(__dirname, 'src/fabric-callee/sw.js'),
      },
      output: {
        entryFileNames: (assetInfo) => {
          return ['sw'].includes(assetInfo.name)
            ? 'src/fabric-callee/[name].js' // put service worker in the correct folder
            : 'assets/[name]-[hash].js' // others in `assets/` as default
        },
      },
    },
  },
})
