/**
 * The goal here is to run Chat from `realtime-api` and `js` SDKs and make sure
 * they both receive the proper responses and events.
 * The `handler` method grab a CRT and connects a JS ChatClient and a RealtimeAPI ChatClient
 * and the consume all the methods asserting both SDKs receive the proper events.
 */
import { timeoutPromise, SWCloseEvent } from '@signalwire/core'
import { Chat as RealtimeAPIChat } from '@signalwire/realtime-api'
import { SignalWire as RealtimeSignalWire } from '@signalwire/realtime-api'
import type {
  Chat as RealtimeChat,
  SWClient as RealtimeSWClient,
} from '@signalwire/realtime-api'
import { Chat as JSChat } from '@signalwire/js'
import { WebSocket } from 'ws'
import { createTestRunner, createCRT, sessionStorageMock, sleep } from './utils'

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

type ChatClient = RealtimeChat | JSChat.Client

interface TestChatOptions {
  jsChat: JSChat.Client
  rtChat: RealtimeChat
  publisher?: 'JS' | 'RT'
}

const testSubscribe = ({ jsChat, rtChat }: TestChatOptions) => {
  const promise = new Promise<number>(async (resolve) => {
    console.log('Running subscribe..')
    let events = 0

    const resolveIfDone = () => {
      // wait 4 events (rt and js receive their own events + the other member)
      if (events === 4) {
        jsChat.off('member.joined')
        resolve(0)
      }
    }

    jsChat.on('member.joined', (member) => {
      // TODO: Check the member payload
      console.log('jsChat member.joined', member)
      events += 1
      resolveIfDone()
    })
    ;[unsubRTClient] = await Promise.all([
      rtChat.listen({
        channels: [channel],
        onMmemberJoined(member) {
          // TODO: Check the member payload
          console.log('rtChat member.joined', member)
          events += 1
          resolveIfDone()
        },
      }),
      jsChat.subscribe(channel),
    ])
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testPublish = ({ jsChat, rtChat, publisher }: TestChatOptions) => {
  const promise = new Promise<number>(async (resolve) => {
    console.log('Running publish..')
    let events = 0
    const resolveIfDone = () => {
      if (events === 2) {
        resolve(0)
      }
    }

    const now = Date.now()
    jsChat.once('message', (message) => {
      console.log('jsChat message', message)
      if (message.meta.now === now) {
        events += 1
        resolveIfDone()
      }
    })

    await Promise.all([
      jsChat.subscribe(channel),
      rtChat.listen({
        channels: [channel],
        onMessageReceived: (message) => {
          console.log('rtChat message', message)
          if (message.meta.now === now) {
            events += 1
            resolveIfDone()
          }
        },
      }),
    ])

    const publishClient = publisher === 'JS' ? jsChat : rtChat

    await publishClient.publish({
      content: 'Hello there!',
      channel,
      meta: {
        now,
        foo: 'bar',
      },
    })
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testUnsubscribe = ({ jsChat, rtChat }: TestChatOptions) => {
  const promise = new Promise<number>(async (resolve) => {
    console.log('Running unsubscribe..')
    let events = 0

    const resolveIfDone = () => {
      // Both of these events will occur due to the JS chat
      // RT chat will not trigger the `onMmemberLeft` when we unsubscribe RT client
      if (events === 2) {
        jsChat.off('member.left')
        resolve(0)
      }
    }

    jsChat.on('member.left', (member) => {
      // TODO: Check the member payload
      console.log('jsChat member.left', member)
      events += 1
      resolveIfDone()
    })

    const [unsubRTClient] = await Promise.all([
      rtChat.listen({
        channels: [channel],
        onMmemberLeft(member) {
          // TODO: Check the member payload
          console.log('rtChat member.left', member)
          events += 1
          resolveIfDone()
        },
      }),
      jsChat.subscribe(channel),
    ])

    await jsChat.unsubscribe(channel)
    await unsubRTClient()
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testChatMethod = async (client: ChatClient) => {
  console.log('Get Messages..')
  const jsMessagesResult = await client.getMessages({
    channel,
  })
  if (!jsMessagesResult.messages) {
    console.error('jsChat getMessages error')
    return 4
  }

  return 0
}

const testSetAndGetMemberState = ({
  jsChat,
  rtChat,
  publisher,
}: TestChatOptions) => {
  const promise = new Promise<number>(async (resolve, reject) => {
    console.log('Set member state..')
    let events = 0
    const resolveIfDone = () => {
      if (events === 2) {
        resolve(0)
      }
    }

    jsChat.once('member.updated', (member) => {
      // TODO: Check the member payload
      console.log('jsChat member.updated', member)
      if (member.state.email === 'e2e@example.com') {
        events += 1
        resolveIfDone()
      }
    })

    console.log('Get Member State..')
    const getStateResult = await jsChat.getMemberState({
      channels: [channel],
      memberId: params.memberId,
    })
    // TODO: Better compare getStateResult
    if (!getStateResult.channels.rw.state) {
      console.error('Invalid state', JSON.stringify(getStateResult))
      reject(4)
    }

    await Promise.all([
      jsChat.subscribe(channel),
      rtChat.listen({
        channels: [channel],
        onMmemberUpdated(member) {
          console.log('rtChat member.updated', member)
          if (member.state.email === 'e2e@example.com') {
            events += 1
            resolveIfDone()
          }
        },
      }),
    ])

    const publishClient = publisher === 'JS' ? jsChat : rtChat

    await publishClient.setMemberState({
      channels: [channel],
      memberId: params.memberId,
      state: {
        email: 'e2e@example.com',
      },
    })
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testDisconnectedRTClient = (rtClient: RealtimeSWClient) => {
  const promise = new Promise<number>(async (resolve, reject) => {
    try {
      await rtClient.chat.listen({
        channels: ['random'],
        onMessageReceived: (message) => {
          // Message should not be reached
          throw undefined
        },
      })

      rtClient.disconnect()

      await rtClient.chat.publish({
        content: 'Unreached message!',
        channel: 'random',
        meta: {
          foo: 'bar',
        },
      })

      reject(4)
    } catch (e) {
      resolve(0)
    }
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const handler = async () => {
  // Create JS Chat Client
  const CRT = await createCRT(params)
  const jsChat = new JSChat.Client({
    host: process.env.RELAY_HOST,
    // @ts-expect-error
    token: CRT.token,
  })

  const jsChatResultCode = await testChatMethod(jsChat)
  if (jsChatResultCode !== 0) {
    return jsChatResultCode
  }
  console.log('Created jsChat')

  // Create RT-API Client
  const rtClient = await RealtimeSignalWire({
    host: process.env.RELAY_HOST,
    project: process.env.RELAY_PROJECT as string,
    token: process.env.RELAY_TOKEN as string,
  })
  const rtChat = rtClient.chat

  const rtChatResultCode = await testChatMethod(rtChat)
  if (rtChatResultCode !== 0) {
    return rtChatResultCode
  }
  console.log('Created rtChat')

  // Test Subscribe
  const subscribeResultCode = await testSubscribe({ jsChat, rtChat })
  if (subscribeResultCode !== 0) {
    return subscribeResultCode
  }

  // Test Publish
  const jsPublishCode = await testPublish({
    jsChat,
    rtChat,
    publisher: 'JS',
  })
  if (jsPublishCode !== 0) {
    return jsPublishCode
  }
  const rtPublishCode = await testPublish({
    jsChat,
    rtChat,
    publisher: 'RT',
  })
  if (rtPublishCode !== 0) {
    return rtPublishCode
  }

  // Test Set/Get Member State
  const jsChatGetSetStateCode = await testSetAndGetMemberState({
    jsChat,
    rtChat,
    publisher: 'JS',
  })
  if (jsChatGetSetStateCode !== 0) {
    return jsChatGetSetStateCode
  }
  const rtChatGetSetStateCode = await testSetAndGetMemberState({
    jsChat,
    rtChat,
    publisher: 'RT',
  })
  if (rtChatGetSetStateCode !== 0) {
    return rtChatGetSetStateCode
  }

  // Test Unsubscribe
  const unsubscribeResultCode = await testUnsubscribe({ jsChat, rtChat })
  if (unsubscribeResultCode !== 0) {
    return unsubscribeResultCode
  }

  // Test diconnected client
  const disconnectedRTClient = await testDisconnectedRTClient(rtClient)
  if (disconnectedRTClient !== 0) {
    return disconnectedRTClient
  }

  return 0
}

async function main() {
  const runner = createTestRunner({
    name: 'Chat E2E',
    testHandler: handler,
  })

  await runner.run()
}

main()
