import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient } from '../../utils'
import { SignalWireContract } from '@signalwire/js'

export const MAX_CALL_SETUP_TIME_MS = 5000

export const logCallStartTime = (ms: number) => {
  if (ms < MAX_CALL_SETUP_TIME_MS) {
    console.log(`\x1b[1;32m✅ call.start(): ${ms.toFixed(0)} ms\x1b[0m`)
  } else {
    console.log(`\x1b[1;31m❌ call.start(): ${ms.toFixed(0)} ms\x1b[0m`)
  }
}

test.describe('CallFabric Start Time', () => {
  test('should join a video room within 5 seconds', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const ms = await page.evaluate(
      async ({ address }) => {
        // @ts-expect-error
        const client: SignalWireContract = window._client

        const call = await client.dial({
          to: address,
          rootElement: document.getElementById('rootElement'),
        })
        // @ts-expect-error
        window._roomObj = call

        const t0 = performance.now()
        await call.start()

        return performance.now() - t0
      },
      {
        address: `/public/${roomName}?channel=video`,
      }
    )

    logCallStartTime(ms)

    expect(ms).toBeLessThan(MAX_CALL_SETUP_TIME_MS)
  })

  test('should join an audio-only room within 5 seconds', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const ms = await page.evaluate(
      async ({ address }) => {
        // @ts-expect-error
        const client: SignalWireContract = window._client

        const call = await client.dial({
          to: address,
        })
        // @ts-expect-error
        window._roomObj = call

        const t0 = performance.now()
        await call.start()

        return performance.now() - t0
      },
      {
        address: `/public/${roomName}?channel=audio`,
      }
    )

    logCallStartTime(ms)

    expect(ms).toBeLessThan(MAX_CALL_SETUP_TIME_MS)
  })
})
