import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

const getHtmlList = (list: any) => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="https://signalwire.com/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SignalWire Playground</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>

  <body>
    <div id="root">
      <div class="flex flex-col max-w-4xl mx-auto mt-10">
        <h1 class="text-3xl font-bold text-indigo-900 mb-3">Playgrounds</h1>
        <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div
            class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8"
          >
            <div
              class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg"
            >
              <ul>
                ${list
                  .map(
                    (vv: any) => `<li><a href="src/${vv}" class="block mx-3 my-4 font-bold text-indigo-600">☞ ${vv}</a></li>`
                  )
                  .join('')}
                </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
  `
}

/**
 * Plugin for automatically listing the folders as HTML
 * items.
 */
function listPlugin() {
  return {
    name: 'sw-list-folders',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const { url } = req

        if (url === "/") {
          const pwd = path.join(__dirname, 'src')
          const folders = fs.readdirSync(pwd, {
            withFileTypes: true,
          })
          const list2 = folders.map((file) => {
            if (file.isDirectory()) {
              return file.name + '/'
            }
            return false
          }).filter(l => l)
          res.end(getHtmlList(list2))
        } else {
          next()
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [listPlugin()],
})
