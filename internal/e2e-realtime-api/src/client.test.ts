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
  // --- Phase 1: Connect with constructor listen ---

  let connectedCount = 0
  let disconnectedCount = 0
  let reconnectingCount = 0

  const connected = promiseWithTimeout(5_000, 'onConnected')

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

  const store = client._client?.store
  if (!store) {
    throw new Error('Missing store')
  }

  // --- Phase 2: Reconnect + client.listen + unsub ---

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

  // Unsub before triggering events - these callbacks should never fire.
  unsubToSkip()

  // Wait for the session to fully reconnect before continuing.
  const reconnected = promiseWithTimeout(10_000, 'reconnected')
  const checkUnsub = client.listen({
    onConnected: () => {
      checkUnsub()
      reconnected.resolve()
    },
  })

  // Force close the WebSocket to trigger a real reconnect cycle.
  store.dispatch(actions.sessionForceCloseAction())

  await reconnecting.promise
  await reconnected.promise

  tap.equal(
    client.authStatus,
    'authorized',
    'authStatus is "authorized" after reconnect'
  )
  tap.equal(
    connectedCount,
    2,
    'constructor listen: onConnected called twice (initial + reconnect)'
  )
  tap.equal(
    reconnectingCount,
    1,
    'constructor listen: onReconnecting called once'
  )
  tap.equal(
    listenConnectedCount,
    1,
    'client.listen: onConnected called once after reconnect'
  )
  tap.equal(
    listenDisconnectedCount,
    0,
    'client.listen: onDisconnected not called during reconnect'
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

  // --- Phase 3: Auth error via client.listen (reconnect with bad token) ---
  // Reuse the same connected client. Inject a bad token and force a reconnect
  // so the signalwire.connect request fails with an auth error.

  const listenAuthError = promiseWithTimeout<AuthError>(
    10_000,
    'listen onAuthError'
  )

  const unsubAuthError = client.listen({
    onAuthError: (error) => {
      listenAuthError.resolve(error)
    },
  })

  store.dispatch(
    actions.setTokenAction({
      token: `${process.env.RELAY_TOKEN as string}-invalid`,
    })
  )
  store.dispatch(actions.sessionForceCloseAction())

  const listenError = await listenAuthError.promise

  tap.ok(listenError, 'client.listen: onAuthError called')
  tap.equal(listenError.name, 'AuthError', 'client.listen: AuthError received')
  tap.equal(
    typeof listenError.code,
    'number',
    'client.listen: AuthError includes code'
  )
  tap.equal(
    client.authStatus,
    'unauthorized',
    'authStatus is "unauthorized" after auth error'
  )

  unsubAuthError()

  await Promise.race([
    client.disconnect(),
    new Promise((r) => setTimeout(r, 3_000)),
  ])

  tap.equal(
    disconnectedCount,
    1,
    'constructor listen: onDisconnected called once'
  )

  // --- Phase 4: Auth error with bad token (constructor listen, new client) ---

  let badReconnectingCount = 0
  const authError = promiseWithTimeout<AuthError>(10_000, 'onAuthError')

  const badClient = await SignalWire({
    host: process.env.RELAY_HOST || 'relay.swire.io',
    project: process.env.RELAY_PROJECT as string,
    token: `${process.env.RELAY_TOKEN as string}-invalid`,
    listen: {
      onAuthError: (error) => {
        authError.resolve(error)
      },
      onReconnecting: () => {
        badReconnectingCount += 1
      },
    },
  })

  const error = await authError.promise

  tap.equal(
    badClient.authStatus,
    'unauthorized',
    'constructor listen: authStatus is "unauthorized" after auth error'
  )
  tap.ok(error, 'constructor listen: onAuthError called')
  tap.equal(error.name, 'AuthError', 'constructor listen: AuthError received')
  tap.equal(
    typeof error.code,
    'number',
    'constructor listen: AuthError includes code'
  )
  tap.equal(
    badReconnectingCount,
    0,
    'auth error must NOT trigger reconnecting (no retry on -32002)'
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
    executionTime: 60_000,
  })

  await runner.run()
}

main()
