import tap from 'tap'
import type { AuthError } from '@signalwire/core'
import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    let connectedTimeout: ReturnType<typeof setTimeout> | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let authErrorTimeout: ReturnType<typeof setTimeout> | null = null

    try {
      let connectedCount = 0
      let disconnectedCount = 0
      let reconnectingCount = 0

      let resolveConnected: (() => void) | null = null
      let rejectConnected: ((error: Error) => void) | null = null
      const connectedPromise = new Promise<void>((resolve, reject) => {
        resolveConnected = resolve
        rejectConnected = reject
      })
      connectedTimeout = setTimeout(() => {
        rejectConnected?.(
          new Error('onConnected was not called within timeout')
        )
      }, 5_000)

      const client = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
        listen: {
          onConnected: () => {
            connectedCount += 1
            if (connectedTimeout) {
              clearTimeout(connectedTimeout)
              connectedTimeout = null
            }
            resolveConnected?.()
          },
          onDisconnected: () => {
            disconnectedCount += 1
          },
          onReconnecting: () => {
            reconnectingCount += 1
          },
        },
      })

      await connectedPromise

      tap.equal(
        connectedCount,
        1,
        'constructor listen: onConnected called once'
      )

      let listenConnectedCount = 0
      let listenDisconnectedCount = 0
      let listenReconnectingCount = 0
      let unsubbedDisconnectedCount = 0
      let unsubbedConnectedCount = 0
      let unsubbedReconnectingCount = 0

      let reconnectResolve: (() => void) | null = null
      let reconnectReject: ((error: Error) => void) | null = null
      const reconnectPromise = new Promise<void>((resolve, reject) => {
        reconnectResolve = resolve
        reconnectReject = reject
      })
      reconnectTimeout = setTimeout(() => {
        reconnectReject?.(
          new Error('onReconnecting was not called within timeout')
        )
      }, 10_000)

      const unsub = client.listen({
        onConnected: () => {
          listenConnectedCount += 1
        },
        onDisconnected: () => {
          listenDisconnectedCount += 1
        },
        onReconnecting: () => {
          listenReconnectingCount += 1
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
            reconnectTimeout = null
          }
          reconnectResolve?.()
        },
      })

      const unsubToSkip = client.listen({
        onConnected: () => {
          unsubbedConnectedCount += 1
        },
        onDisconnected: () => {
          unsubbedDisconnectedCount += 1
        },
        onReconnecting: () => {
          unsubbedReconnectingCount += 1
        },
      })

      // Internal access: we don't have a public API to force reconnect.
      const sessionEmitter = client?._client?.sessionEmitter
      if (!sessionEmitter) {
        throw new Error('Missing sessionEmitter for reconnect test')
      }

      // Ensure unsub works: none of these callbacks should fire after this.
      unsubToSkip()

      // Simulate reconnect event to test the listener wiring deterministically.
      sessionEmitter.emit('session.reconnecting')

      await reconnectPromise

      await client.disconnect()

      tap.equal(
        disconnectedCount,
        1,
        'constructor listen: onDisconnected called once'
      )
      tap.equal(
        reconnectingCount,
        1,
        'constructor listen: onReconnecting called once'
      )
      tap.equal(
        listenDisconnectedCount,
        1,
        'client.listen: onDisconnected called once'
      )
      tap.equal(
        listenConnectedCount,
        0,
        'client.listen: onConnected not called after initial connect'
      )
      tap.equal(
        listenReconnectingCount,
        1,
        'client.listen: onReconnecting called once'
      )
      tap.equal(
        unsubbedDisconnectedCount,
        0,
        'client.listen: unsubbed listener not called'
      )
      tap.equal(
        unsubbedConnectedCount,
        0,
        'client.listen: unsubbed onConnected not called'
      )
      tap.equal(
        unsubbedReconnectingCount,
        0,
        'client.listen: unsubbed onReconnecting not called'
      )

      unsub()

      let authErrorResolve: ((error: AuthError) => void) | null = null
      let authErrorReject: ((error: Error) => void) | null = null
      const authErrorPromise = new Promise<AuthError>((resolve, reject) => {
        authErrorResolve = resolve
        authErrorReject = reject
      })
      authErrorTimeout = setTimeout(() => {
        authErrorReject?.(
          new Error('onAuthError was not called within timeout')
        )
      }, 10_000)

      // Use a separate client with a bad token to trigger an auth error.
      const badClient = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: `${process.env.RELAY_TOKEN as string}-invalid`,
        listen: {
          onAuthError: (error) => {
            if (authErrorTimeout) {
              clearTimeout(authErrorTimeout)
              authErrorTimeout = null
            }
            authErrorResolve?.(error)
          },
        },
      })

      const authError = await authErrorPromise

      tap.ok(authError, 'constructor listen: onAuthError called')
      tap.equal(
        authError.name,
        'AuthError',
        'constructor listen: AuthError received'
      )
      tap.equal(
        typeof authError.code,
        'number',
        'constructor listen: AuthError includes code'
      )

      await Promise.race([
        badClient.disconnect(),
        new Promise((resolveDisconnect) =>
          setTimeout(resolveDisconnect, 3_000)
        ),
      ])

      resolve(0)
    } catch (error) {
      if (connectedTimeout) {
        clearTimeout(connectedTimeout)
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (authErrorTimeout) {
        clearTimeout(authErrorTimeout)
      }
      console.error('SWClient listen error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'SWClient Listen E2E',
    testHandler: handler,
    executionTime: 20_000,
  })

  await runner.run()
}

main()
