import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  createCFClient,
  dialAddress,
  disconnectClient,
  leaveRoom,
  SERVER_URL,
} from '../../utils'

test.describe('Clean up', () => {
  test('it should create a webscoket client', async ({ createCustomPage }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    let websocketUrl: string | null = null
    let websocketClosed = false

    // A promise to wait for the WebSocket close event
    const waitForWebSocketClose = new Promise<void>((resolve) => {
      page.on('websocket', (ws) => {
        websocketUrl = ws.url()

        ws.on('close', () => {
          websocketClosed = true
          resolve()
        })
      })
    })

    expect(websocketUrl).toBe(null)

    await createCFClient(page)

    await disconnectClient(page)

    await waitForWebSocketClose
    expect(websocketUrl).toBeTruthy()
    expect(websocketUrl).toContain('wss://')
    expect(websocketClosed).toBeTruthy()
  })

  test('it should cleanup session emitter and workers', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page, { attachSagaMonitor: true })

    await test.step('the client should have workers and listeners attached', async () => {
      const watchers: Record<string, number> = await page.evaluate(() => {
        const client = window._client!

        return {
          // @ts-expect-error
          clientListenersLength: client.__wsClient.sessionEventNames().length,
          // @ts-expect-error
          clientWorkersLength: client.__wsClient._runningWorkers.length,
          // @ts-expect-error
          globalWorkersLength: window._runningWorkers.length,
        }
      })

      expect(watchers.clientWorkersLength).toBeGreaterThan(0)
      expect(watchers.globalWorkersLength).toBeGreaterThan(0)
    })

    await disconnectClient(page)

    await test.step('the client should not have workers and listeners attached', async () => {
      const watchers: Record<string, number> = await page.evaluate(() => {
        const client = window._client!

        return {
          // @ts-expect-error
          clientListenersLength: client.__wsClient.sessionEventNames().length,
          // @ts-expect-error
          clientWorkersLength: client.__wsClient._runningWorkers.length,
          // @ts-expect-error
          globalWorkersLength: window._runningWorkers.length,
        }
      })

      expect(watchers.clientListenersLength).toBe(0)
      expect(watchers.clientWorkersLength).toBe(0)
      expect(watchers.globalWorkersLength).toBe(0)
    })
  })

  test('it should cleanup call emitter and workers without affecting the client', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page, { attachSagaMonitor: true })

    // Dial an address and join a video room
    await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    const { beforeClientListenersLength, beforeClientWorkersLength } =
      await test.step('call and client should have watchers attached', async () => {
        const watchers: Record<string, number> = await page.evaluate(() => {
          const client = window._client!

          return {
            // @ts-expect-error
            clientListenersLength: client.__wsClient.sessionEventNames().length,
            // @ts-expect-error
            clientWorkersLength: client.__wsClient._runningWorkers.length,

            // @ts-expect-error
            callListeners: window._roomObj.eventNames().length,
            // @ts-expect-error
            callWorkersLength: window._roomObj._runningWorkers.length,

            // @ts-expect-error
            globalWorkersLength: window._runningWorkers.length,
          }
        })

        expect(watchers.clientListenersLength).toBeGreaterThan(0)
        expect(watchers.clientWorkersLength).toBeGreaterThan(0)
        expect(watchers.callListeners).toBeGreaterThan(0)
        expect(watchers.callWorkersLength).toBeGreaterThan(0)
        expect(watchers.globalWorkersLength).toBeGreaterThan(0)

        return {
          beforeClientListenersLength: watchers.clientListenersLength,
          beforeClientWorkersLength: watchers.clientWorkersLength,
        }
      })

    await leaveRoom(page)

    await test.step('call should not have any watchers attached', async () => {
      const watchers: Record<string, number> = await page.evaluate(() => {
        const client = window._client!

        return {
          // @ts-expect-error
          clientListenersLength: client.__wsClient.sessionEventNames().length,
          // @ts-expect-error
          clientWorkersLength: client.__wsClient._runningWorkers.length,

          // @ts-expect-error
          callListeners: window._roomObj.eventNames().length,
          // @ts-expect-error
          callWorkersLength: window._roomObj._runningWorkers.length,

          // @ts-expect-error
          globalWorkersLength: window._runningWorkers.length,
        }
      })

      expect(watchers.clientListenersLength).toBe(beforeClientListenersLength)
      expect(watchers.clientWorkersLength).toBe(beforeClientWorkersLength)
      expect(watchers.callListeners).toBe(0)
      expect(watchers.callWorkersLength).toBe(0)
      expect(watchers.globalWorkersLength).toBeGreaterThan(0)
    })

    await disconnectClient(page)

    await test.step('client should not have any watchers attached', async () => {
      const watchers: Record<string, number> = await page.evaluate(() => {
        const client = window._client!

        return {
          // @ts-expect-error
          clientListenersLength: client.__wsClient.sessionEventNames().length,
          // @ts-expect-error
          clientWorkersLength: client.__wsClient._runningWorkers.length,

          // @ts-expect-error
          callListeners: window._roomObj.eventNames().length,
          // @ts-expect-error
          callWorkersLength: window._roomObj._runningWorkers.length,

          // @ts-expect-error
          globalWorkersLength: window._runningWorkers.length,
        }
      })

      expect(watchers.clientListenersLength).toBe(0)
      expect(watchers.clientWorkersLength).toBe(0)
      expect(watchers.callListeners).toBe(0)
      expect(watchers.callWorkersLength).toBe(0)
      expect(watchers.globalWorkersLength).toBe(0)
    })
  })
})
