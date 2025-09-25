import { uuid } from '@signalwire/core'
import { test, expect, CustomPage } from '../../fixtures'
import {
  createCFClient,
  dialAddress,
  disconnectClient,
  expectPageEvalToPass,
  leaveRoom,
  SERVER_URL,
} from '../../utils'
import { CallSession, SignalWireContract } from '@signalwire/client'
import { WSClientContract } from 'packages/client/src/unified/interfaces/wsClient'

interface WindowWithRunningWorkers extends Window {
  _runningWorkers: any[]
  _callObj: CallSession & {
    eventNames: () => string[]
    _runningWorkers: any[]
  }
}

interface SignalWireClient extends SignalWireContract {
  __wsClient: WSClientContract & {
    sessionEventNames: () => string[]
    _runningWorkers: any[]
  }
}

interface Watchers {
  clientListenersLength?: number
  clientWorkersLength?: number
  callListeners?: number
  callWorkersLength?: number
  globalWorkersLength?: number
}

test.describe('Clean up', () => {
  test('it should create a websocket client', async ({ createCustomPage }) => {
    let page = {} as CustomPage
    let websocketUrl: string | null = null
    let websocketClosed = false
    let waitForWebSocketClose: Promise<void>

    await test.step('setup page and websocket listeners', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      // Set up WebSocket monitoring
      waitForWebSocketClose = new Promise<void>((resolve) => {
        page.on('websocket', (ws) => {
          websocketUrl = ws.url()

          ws.on('close', () => {
            websocketClosed = true
            resolve()
          })
        })
      })

      expect(websocketUrl, 'websocket URL should initially be null').toBe(null)
      expect(websocketClosed, 'websocket should initially be open').toBe(false)
    })

    await test.step('create client', async () => {
      await createCFClient(page)
    })

    await test.step('disconnect client and verify websocket cleanup', async () => {
      await disconnectClient(page)

      // Wait for websocket to close
      await waitForWebSocketClose

      expect(websocketUrl, 'websocket URL should be captured').toBeTruthy()
      expect(websocketUrl, 'websocket should use secure protocol').toContain(
        'wss://'
      )
      expect(
        websocketClosed,
        'websocket should be closed after disconnect'
      ).toBeTruthy()
    })
  })

  test('it should cleanup session emitter and workers', async ({
    createCustomPage,
  }) => {
    let page = {} as CustomPage

    await test.step('setup page and create client with saga monitor', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      await createCFClient(page, { attachSagaMonitor: true })
    })

    await test.step('verify client has workers and listeners attached', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const client = window._client as SignalWireClient
          const windowWithWorkers =
            window as unknown as WindowWithRunningWorkers

          if (!client) {
            throw new Error('Client not found')
          }

          // Access internal properties for cleanup testing
          const wsClient = (client as SignalWireClient).__wsClient
          if (!wsClient) {
            throw new Error('WebSocket client not found')
          }

          const runningWorkers = windowWithWorkers._runningWorkers
          if (!runningWorkers) {
            throw new Error('Running workers not found')
          }

          return {
            clientListenersLength: wsClient.sessionEventNames().length,
            clientWorkersLength: wsClient._runningWorkers.length,
            globalWorkersLength: runningWorkers.length,
          } satisfies Watchers
        },
        assertionFn: (result) => {
          expect(result, 'initial watchers should be defined').toBeDefined()
          // TODO: what is the correct count of listeners?
          // expect(
          //   result.clientListenersLength,
          //   'client should have listeners attached initially'
          // ).toBe
          expect(
            result.clientWorkersLength,
            'client should have workers attached initially'
          ).toBeGreaterThan(0)
          expect(
            result.globalWorkersLength,
            'global workers should be attached initially'
          ).toBeGreaterThan(0)
        },
        message: 'expect to get initial client watchers',
      })
    })

    await test.step('disconnect client', async () => {
      await disconnectClient(page)
    })

    await test.step('verify client has no workers and listeners attached', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const client = window._client as SignalWireClient
          const windowWithWorkers =
            window as unknown as WindowWithRunningWorkers

          if (!client) {
            throw new Error('Client not found')
          }

          // Access internal properties for cleanup testing
          const wsClient = (client as SignalWireClient).__wsClient
          if (!wsClient) {
            throw new Error('WebSocket client not found')
          }

          const runningWorkers = windowWithWorkers._runningWorkers
          if (!runningWorkers) {
            throw new Error('Running workers not found')
          }

          return {
            clientListenersLength: wsClient.sessionEventNames().length,
            clientWorkersLength: wsClient._runningWorkers.length,
            globalWorkersLength: runningWorkers.length,
          } satisfies Watchers
        },
        assertionFn: (result) => {
          expect(result, 'final watchers should be defined').toBeDefined()
          expect(
            result.clientListenersLength,
            'client should have no listeners after disconnect'
          ).toBe(0)
          expect(
            result.clientWorkersLength,
            'client should have no workers after disconnect'
          ).toBe(0)
          expect(
            result.globalWorkersLength,
            'global workers should be cleaned up after disconnect'
          ).toBe(0)
        },
        message: 'expect client watchers to be cleaned up',
      })
    })
  })

  test('it should cleanup call emitter and workers without affecting the client', async ({
    createCustomPage,
    resource,
  }) => {
    let page = {} as CustomPage
    let initialWatchers = {} as Watchers

    await test.step('setup page and create client', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      const roomName = `e2e_${uuid()}`
      await resource.createVideoRoomResource(roomName)

      await createCFClient(page, { attachSagaMonitor: true })

      await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
      })
    })

    await test.step('get initial watcher counts after call is created', async () => {
      initialWatchers = await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const client = window._client as SignalWireClient
          const windowWithWorkers =
            window as unknown as WindowWithRunningWorkers

          if (!client) {
            throw new Error('Client not found')
          }

          return {
            clientListenersLength: client.__wsClient.sessionEventNames().length,
            clientWorkersLength: client.__wsClient._runningWorkers.length,
            callListeners: windowWithWorkers._callObj.eventNames().length,
            callWorkersLength:
              windowWithWorkers._callObj._runningWorkers.length,
            globalWorkersLength: windowWithWorkers._runningWorkers.length,
          }
        },
        assertionFn: (result) => {
          expect(result, 'initial watchers should be defined').toBeDefined()
          expect(
            result.clientListenersLength,
            'should have client listeners'
          ).toBeGreaterThan(0)
          expect(
            result.clientWorkersLength,
            'should have client workers'
          ).toBeGreaterThan(0)
          expect(
            result.callListeners,
            'should have call listeners'
          ).toBeGreaterThan(0)
          expect(
            result.callWorkersLength,
            'should have call workers'
          ).toBeGreaterThan(0)
          expect(
            result.globalWorkersLength,
            'should have global workers'
          ).toBeGreaterThan(0)
        },
        message: 'expect to get initial watcher counts after call is created',
      })
    })

    // leave room after call is created
    await test.step('leave room', async () => {
      await leaveRoom(page)
    })

    await test.step('call should not have workers or listeners attached', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: () => {
          const client = window._client as SignalWireClient
          const windowWithWorkers =
            window as unknown as WindowWithRunningWorkers

          if (!client) {
            throw new Error('Client not found')
          }

          return {
            callListeners: windowWithWorkers._callObj.eventNames().length,
            callWorkersLength:
              windowWithWorkers._callObj._runningWorkers.length,
            clientListenersLength: client.__wsClient.sessionEventNames().length,
            clientWorkersLength: client.__wsClient._runningWorkers.length,
            globalWorkersLength: windowWithWorkers._runningWorkers.length,
          }
        },
        assertionFn: (result) => {
          expect(
            result.callListeners,
            'call should have no listeners after leaving room'
          ).toBe(0)
          expect(
            result.callWorkersLength,
            'call should have no workers after leaving room'
          ).toBe(0)
          expect(
            result.clientListenersLength,
            'client should have same number of listeners as before leaving room'
          ).toBe(initialWatchers.clientListenersLength)
          expect(
            result.clientWorkersLength,
            'client should have same number of workers as before leaving room'
          ).toBe(initialWatchers.clientWorkersLength)
          expect(
            result.globalWorkersLength,
            'global workers should still be attached after leaving room'
          ).toBeGreaterThan(0)
        },
        message: 'expect client watchers to be cleaned up after leaving room',
      })
    })

    await test.step('disconnect client after leaving room', async () => {
      await disconnectClient(page)
    })

    await test.step('client should have no workers or listeners attached', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const client = window._client as SignalWireClient
          const windowWithWorkers =
            window as unknown as WindowWithRunningWorkers

          if (!client) {
            throw new Error('Client not found')
          }

          return {
            clientListenersLength: client.__wsClient.sessionEventNames().length,
            clientWorkersLength: client.__wsClient._runningWorkers.length,
            callListeners: windowWithWorkers._callObj.eventNames().length,
            callWorkersLength:
              windowWithWorkers._callObj._runningWorkers.length,
            globalWorkersLength: windowWithWorkers._runningWorkers.length,
          }
        },
        assertionFn: (result) => {
          expect(
            result.clientListenersLength,
            'client listeners should be cleaned up'
          ).toBe(0)
          expect(
            result.clientWorkersLength,
            'client workers should be cleaned up'
          ).toBe(0)
          expect(
            result.callListeners,
            'call listeners should be cleaned up'
          ).toBe(0)
          expect(
            result.callWorkersLength,
            'call workers should be cleaned up'
          ).toBe(0)
          expect(
            result.globalWorkersLength,
            'global workers should be cleaned up'
          ).toBe(0)
        },
        message:
          'expect client watchers, listeners, and global workers to be cleaned up after disconnect',
      })
    })
  })
})
