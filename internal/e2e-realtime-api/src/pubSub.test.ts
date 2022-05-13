/**
 * The goal here is to run PubSub from `realtime-api` and
 * `js` SDKs and make sure they both receive the proper
 * responses and events. The `handler` method grab a CRT and
 * connects a JS PubSubClient and a RealtimeAPI PubSubClient
 * and the consume all the methods asserting both SDKs
 * receive the proper events.
 */
import { timeoutPromise } from '@signalwire/core'
import { PubSub as RealtimeAPIPubSub } from '@signalwire/realtime-api'
import { PubSub as JSPubSub } from '@signalwire/js'
import { WebSocket } from 'ws'
import { createTestRunner, createCRT } from './utils'

// @ts-ignore
global.WebSocket = WebSocket

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

type PubSubClient = RealtimeAPIPubSub.Client | JSPubSub.Client
const testPubSubClientSubscribe = (
  firstClient: PubSubClient,
  secondClient: PubSubClient
) => {
  const promise = new Promise<number>(async (resolve, reject) => {
    console.log('Running subscribe..')

    firstClient.once('message', () => {})
    secondClient.once('message', () => {})
    try {
      await Promise.all([
        firstClient.subscribe(channel),
        secondClient.subscribe(channel),
      ])
      resolve(0)
    } catch (e) {
      reject(4)
    }
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testPubSubClientPublish = (
  firstClient: PubSubClient,
  secondClient: PubSubClient
) => {
  const promise = new Promise<number>(async (resolve) => {
    console.log('Running publish..')
    let events = 0
    const resolveIfDone = () => {
      if (events === 2) {
        resolve(0)
      }
    }

    const now = Date.now()
    firstClient.once('message', (message) => {
      console.log('jsPubSub message', message)
      if (message.meta.now === now) {
        events += 1
        resolveIfDone()
      }
    })
    secondClient.once('message', (message) => {
      console.log('rtPubSub message', message)
      if (message.meta.now === now) {
        events += 1
        resolveIfDone()
      }
    })

    await Promise.all([
      firstClient.subscribe(channel),
      secondClient.subscribe(channel),
    ])

    await firstClient.publish({
      content: 'Hello There',
      channel,
      meta: {
        now,
        foo: 'bar',
      },
    })
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testPubSubClientUnsubscribe = (
  firstClient: PubSubClient,
  secondClient: PubSubClient
) => {
  const promise = new Promise<number>(async (resolve, reject) => {
    console.log('Running unsubscribe..')

    try {
      await Promise.all([
        firstClient.subscribe(channel),
        secondClient.subscribe(channel),
      ])

      await firstClient.unsubscribe(channel)

      await secondClient.unsubscribe(channel)

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
  const rtPubSub = new RealtimeAPIPubSub.Client({
    // @ts-expect-error
    host: process.env.RELAY_HOST,
    project: process.env.RELAY_PROJECT as string,
    token: process.env.RELAY_TOKEN as string,
  })

  console.log('Created rtPubSub')

  // Test Subscribe
  const subscribeResultCode = await testPubSubClientSubscribe(
    jsPubSub,
    rtPubSub
  )
  if (subscribeResultCode !== 0) {
    return subscribeResultCode
  }

  // Test Publish
  const jsPubSubPublishCode = await testPubSubClientPublish(jsPubSub, rtPubSub)
  if (jsPubSubPublishCode !== 0) {
    return jsPubSubPublishCode
  }
  const rtPubSubPublishCode = await testPubSubClientPublish(rtPubSub, jsPubSub)
  if (rtPubSubPublishCode !== 0) {
    return rtPubSubPublishCode
  }

  // Test Unsubscribe
  const unsubscribeResultCode = await testPubSubClientUnsubscribe(
    jsPubSub,
    rtPubSub
  )
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
