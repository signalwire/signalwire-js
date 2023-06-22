/**
 * The goal here is to run PubSub from `realtime-api` and
 * `js` SDKs and make sure they both receive the proper
 * responses and events. The `handler` method grab a CRT and
 * connects a JS PubSubClient and a RealtimeAPI PubSubClient
 * and the consume all the methods asserting both SDKs
 * receive the proper events.
 */
import { timeoutPromise, SWCloseEvent } from '@signalwire/core'
import { PubSub as RealtimeAPIPubSub } from '@signalwire/realtime-api'
import {
  SignalWire as RealtimeSignalWire,
  SWClient as RealtimeSWClient,
} from '@signalwire/realtime-api'
import { PubSub as JSPubSub } from '@signalwire/js'
import { WebSocket } from 'ws'
import { createTestRunner, createCRT, sessionStorageMock } from './utils'

// @ts-ignore
global.WebSocket = WebSocket
// @ts-ignore
global.CloseEvent = SWCloseEvent
// @ts-ignore
global.window = { sessionStorage: sessionStorageMock() }

const promiseTimeout = 4_000
const promiseException = 4 // error code to identify the Promise timeout
// TODO: pass as argument
const channel = 'rw'

const params = {
  memberId: 'e2e-uuid-here',
  channels: {
    rw: {
      read: true,
      write: true,
    },
    r: {
      read: true,
    },
    w: {
      write: true,
    },
  },
}

interface TestPubSubOptions {
  jsPubSub: JSPubSub.Client
  rtClient: RealtimeSWClient
  publisher?: 'JS' | 'RT'
}

const testSubscribe = ({ jsPubSub, rtClient }: TestPubSubOptions) => {
  const promise = new Promise<number>(async (resolve, reject) => {
    console.log('Running subscribe..')

    jsPubSub.once('message', () => {})
    try {
      await Promise.all([
        jsPubSub.subscribe(channel),
        rtClient.pubSub.listen({ channels: [channel] }),
      ])
      resolve(0)
    } catch (e) {
      reject(4)
    }
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testPublish = ({ jsPubSub, rtClient, publisher }: TestPubSubOptions) => {
  const promise = new Promise<number>(async (resolve) => {
    console.log('Running publish..')
    let events = 0
    const resolveIfDone = () => {
      if (events === 2) {
        resolve(0)
      }
    }

    const now = Date.now()
    jsPubSub.once('message', (message) => {
      console.log('jsPubSub message', message)
      if (message.meta.now === now) {
        events += 1
        resolveIfDone()
      }
    })

    await Promise.all([
      jsPubSub.subscribe(channel),
      rtClient.pubSub.listen({
        channels: [channel],
        onMessageReceived: (message) => {
          console.log('rtPubSub message', message)
          if (message.meta.now === now) {
            events += 1
            resolveIfDone()
          }
        },
      }),
    ])

    if (publisher === 'JS') {
      await jsPubSub.publish({
        content: 'Hello there from JS',
        channel,
        meta: {
          now,
          foo: 'bar',
        },
      })
    } else {
      await rtClient.pubSub.publish({
        content: 'Hello there from RT',
        channel,
        meta: {
          now,
          foo: 'bar',
        },
      })
    }
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testUnsubscribe = ({ jsPubSub, rtClient }: TestPubSubOptions) => {
  const promise = new Promise<number>(async (resolve, reject) => {
    console.log('Running unsubscribe..')

    try {
      const [unsubRTClient] = await Promise.all([
        rtClient.pubSub.listen({ channels: [channel] }),
        jsPubSub.subscribe(channel),
      ])

      await jsPubSub.unsubscribe(channel)
      await unsubRTClient()

      resolve(0)
    } catch (e) {
      reject(4)
    }
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const handler = async () => {
  // Create JS PubSub Client
  const CRT = await createCRT(params)
  const jsPubSub = new JSPubSub.Client({
    host: process.env.RELAY_HOST,
    // @ts-expect-error
    token: CRT.token,
  })
  console.log('Created jsPubSub')

  // Create RT-API PubSub Client
  const rtClient = await RealtimeSignalWire({
    host: process.env.RELAY_HOST,
    project: process.env.RELAY_PROJECT as string,
    token: process.env.RELAY_TOKEN as string,
  })
  console.log('Created rtClient')

  // Test Subscribe
  const subscribeResultCode = await testSubscribe({ jsPubSub, rtClient })
  if (subscribeResultCode !== 0) {
    return subscribeResultCode
  }

  // Test Publish from JS
  const jsPublishResultCode = await testPublish({
    jsPubSub,
    rtClient,
    publisher: 'JS',
  })
  if (jsPublishResultCode !== 0) {
    return jsPublishResultCode
  }

  // Test Publish from RT
  const rtPublishResultCode = await testPublish({
    jsPubSub,
    rtClient,
    publisher: 'RT',
  })
  if (rtPublishResultCode !== 0) {
    return rtPublishResultCode
  }

  // Test Unsubscribe
  const unsubscribeResultCode = await testUnsubscribe({ jsPubSub, rtClient })
  if (unsubscribeResultCode !== 0) {
    return unsubscribeResultCode
  }

  return 0
}

async function main() {
  const runner = createTestRunner({
    name: 'PubSub E2E',
    testHandler: handler,
  })

  await runner.run()
}

main()
