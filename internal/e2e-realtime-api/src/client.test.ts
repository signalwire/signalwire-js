import tap from 'tap'
import { actions } from '@signalwire/core'
import { SignalWire, type AuthError } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

/**
 * Creates a promise that resolves via the returned `resolve` callback
 * or rejects if the timeout elapses first.
 */
function promiseWithTimeout<T = void>(ms: number, label: string) {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((_resolve, reject) => {
    resolve = _resolve
    const timer = setTimeout(
      () => reject(new Error(`${label}: timed out after ${ms}ms`)),
      ms
    )
    // Allow Node to exit even if the timer is still pending.
    if (typeof timer === 'object' && 'unref' in timer) timer.unref()
  })
  return { promise, resolve }
}

const handler = async () => {
  let connectedCount = 0
  let disconnectedCount = 0
  let reconnectingCount = 0

  const connected = promiseWithTimeout(5_000, 'onConnected')

  console.log({ host: process.env.RELAY_HOST, project: process.env.RELAY_PROJECT })
  console.log({
      host_length: process.env.RELAY_HOST?.length,
      host_starts: process.env.RELAY_HOST?.slice(0, 4),
      host_ends: process.env.RELAY_HOST?.slice(-4),
      project: process.env.RELAY_PROJECT,
    })

  const client = await SignalWire({
    host: process.env.RELAY_HOST || 'relay.swire.io',
    project: process.env.RELAY_PROJECT as string,
    token: process.env.RELAY_TOKEN as string,
    listen: {
      onConnected: () => {
        connectedCount += 1
        connected.resolve()
      },
      onDisconnected: () => {
        disconnectedCount += 1
      },
      onReconnecting: () => {
        reconnectingCount += 1
      },
    },
  })

  await connected.promise

  tap.equal(
    client.authStatus,
    'authorized',
    'authStatus is "authorized" after connect'
  )
  tap.equal(connectedCount, 1, 'constructor listen: onConnected called once')

  // --- Test client.listen + unsub + reconnect ---

  let listenConnectedCount = 0
  let listenDisconnectedCount = 0
  let listenReconnectingCount = 0
  let unsubbedDisconnectedCount = 0
  let unsubbedConnectedCount = 0
  let unsubbedReconnectingCount = 0

  const reconnecting = promiseWithTimeout(10_000, 'onReconnecting')

  const unsub = client.listen({
    onConnected: () => {
      listenConnectedCount += 1
    },
    onDisconnected: () => {
      listenDisconnectedCount += 1
    },
    onReconnecting: () => {
      listenReconnectingCount += 1
      reconnecting.resolve()
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
  const store = client?._client?.store
  if (!store) {
    throw new Error('Missing store for reconnect test')
  }

  // Ensure unsub works: none of these callbacks should fire after this.
  unsubToSkip()

  // Force close the WebSocket to trigger a real reconnect cycle.
  store.dispatch(actions.sessionForceCloseAction())

  await reconnecting.promise

  // Wait for the session to fully reconnect before disconnecting.
  const reconnected = promiseWithTimeout(10_000, 'reconnected')
  const checkUnsub = client.listen({
    onConnected: () => {
      checkUnsub()
      reconnected.resolve()
    },
  })
  await reconnected.promise

  tap.equal(
    client.authStatus,
    'authorized',
    'authStatus is "authorized" after reconnect'
  )

  await client.disconnect()

  tap.equal(
    client.authStatus,
    'unauthorized',
    'authStatus is "unauthorized" after disconnect'
  )

  tap.equal(
    connectedCount,
    2,
    'constructor listen: onConnected called twice (initial + reconnect)'
  )
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
    1,
    'client.listen: onConnected called once after reconnect'
  )
  tap.equal(
    listenReconnectingCount,
    1,
    'client.listen: onReconnecting called once'
  )
  tap.equal(
    unsubbedDisconnectedCount,
    0,
    'unsubbed listener: onDisconnected not called'
  )
  tap.equal(
    unsubbedConnectedCount,
    0,
    'unsubbed listener: onConnected not called'
  )
  tap.equal(
    unsubbedReconnectingCount,
    0,
    'unsubbed listener: onReconnecting not called'
  )

  unsub()

  // --- Test auth error with bad token ---

  const authError = promiseWithTimeout<AuthError>(10_000, 'onAuthError')

  const badClient = await SignalWire({
    host: process.env.RELAY_HOST || 'relay.swire.io',
    project: process.env.RELAY_PROJECT as string,
    token: `${process.env.RELAY_TOKEN as string}-invalid`,
    listen: {
      onAuthError: (error) => {
        authError.resolve(error)
      },
    },
  })

  const error = await authError.promise

  tap.equal(
    badClient.authStatus,
    'unauthorized',
    'authStatus is "unauthorized" after auth error'
  )
  tap.ok(error, 'constructor listen: onAuthError called')
  tap.equal(error.name, 'AuthError', 'constructor listen: AuthError received')
  tap.equal(
    typeof error.code,
    'number',
    'constructor listen: AuthError includes code'
  )

  await Promise.race([
    badClient.disconnect(),
    new Promise((r) => setTimeout(r, 3_000)),
  ])

  return 0
}

async function main() {
  const runner = createTestRunner({
    name: 'SWClient Listen E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
