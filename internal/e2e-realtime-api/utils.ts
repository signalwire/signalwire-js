import { createServer } from 'vite'

export const SERVER_URL = 'http://localhost:1338'

export const createTestServer = async () => {
  const targetOptions = { path: './templates/blank', port: 1338 }
  const server = await createServer({
    configFile: false,
    root: targetOptions.path,
    server: {
      port: targetOptions.port,
    },
    logLevel: 'silent',
  })

  return {
    start: async () => {
      await server.listen()
    },
    close: async () => {
      await server.close()
    },
    url: `http://localhost:${targetOptions.port}`,
  }
}
