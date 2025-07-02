import type { FullConfig } from '@playwright/test'
import { createTestServer } from './utils'

async function globalSetup(_config: FullConfig) {
  const server = await createTestServer()
  await server.start()

  return async () => {
    await server.close()
  }
}

export default globalSetup
