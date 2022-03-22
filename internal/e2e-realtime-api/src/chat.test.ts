/**
 * The goal here is to run Chat from `realtime-api` and `js` SDKs and make sure
 * they both receive the proper responses and events.
 * The `handler` method grab a CRT and connects a JS ChatClient and a RealtimeAPI ChatClient
 * and the consume all the methods asserting both SDKs receive the proper events.
 */
import { timeoutPromise } from '@signalwire/core'
import { Chat as RealtimeAPIChat } from '@signalwire/realtime-api'
import { Chat as JSChat } from '@signalwire/js'
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

type ChatClient = RealtimeAPIChat.ChatClient | JSChat.Client
const testChatClientSubscribe = (
  firstClient: ChatClient,
  secondClient: ChatClient
) => {
  const promise = new Promise<number>(async (resolve) => {
    console.log('Running subscribe..')
    let events = 0
    const resolveIfDone = () => {
      // wait 4 events (rt and js receive their own events + the other member)
      if (events === 4) {
        firstClient.off('member.joined')
        secondClient.off('member.joined')
        resolve(0)
      }
    }

    firstClient.on('member.joined', (member) => {
      // TODO: Check the member payload
      console.log('jsChat member.joined', member)
      events += 1
      resolveIfDone()
    })
    secondClient.on('member.joined', (member) => {
      // TODO: Check the member payload
      console.log('rtChat member.joined', member)
      events += 1
      resolveIfDone()
    })

    await Promise.all([
      firstClient.subscribe(channel),
      secondClient.subscribe(channel),
    ])
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testChatClientPublish = (
  firstClient: ChatClient,
  secondClient: ChatClient
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
      console.log('jsChat message', message)
      if (message.meta.now === now) {
        events += 1
        resolveIfDone()
      }
    })
    secondClient.once('message', (message) => {
      console.log('rtChat message', message)
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

const testChatClientUnsubscribe = (
  firstClient: ChatClient,
  secondClient: ChatClient
) => {
  const promise = new Promise<number>(async (resolve) => {
    console.log('Running unsubscribe..')
    let events = 0
    const resolveIfDone = () => {
      /**
       * waits for 3 events:
       * - first one generates 2 events on leave
       * - second one generates only 1 event
       */
      if (events === 3) {
        firstClient.off('member.left')
        secondClient.off('member.left')
        resolve(0)
      }
    }

    firstClient.on('member.left', (member) => {
      // TODO: Check the member payload
      console.log('jsChat member.left', member)
      events += 1
      resolveIfDone()
    })
    secondClient.on('member.left', (member) => {
      // TODO: Check the member payload
      console.log('rtChat member.left', member)
      events += 1
      resolveIfDone()
    })

    await Promise.all([
      firstClient.subscribe(channel),
      secondClient.subscribe(channel),
    ])

    await firstClient.unsubscribe(channel)

    await secondClient.unsubscribe(channel)
  })

  return timeoutPromise(promise, promiseTimeout, promiseException)
}

const testChatClientMethods = async (client: ChatClient) => {
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

const testChatClientSetAndGetMemberState = (
  firstClient: ChatClient,
  secondClient: ChatClient
) => {
  const promise = new Promise<number>(async (resolve, reject) => {
    console.log('Set member state..')
    let events = 0
    const resolveIfDone = () => {
      if (events === 2) {
        resolve(0)
      }
    }

    firstClient.once('member.updated', (member) => {
      // TODO: Check the member payload
      console.log('jsChat member.updated', member)
      if (member.state.email === 'e2e@example.com') {
        events += 1
        resolveIfDone()
      }
    })
    secondClient.once('member.updated', (member) => {
      console.log('rtChat member.updated', member)
      if (member.state.email === 'e2e@example.com') {
        events += 1
        resolveIfDone()
      }
    })

    console.log('Get Member State..')
    const getStateResult = await firstClient.getMemberState({
      channels: [channel],
      memberId: params.memberId,
    })
    // TODO: Better compare getStateResult
    if (!getStateResult.channels.rw.state) {
      console.error('Invalid state', JSON.stringify(getStateResult))
      reject(4)
    }

    await Promise.all([
      firstClient.subscribe(channel),
      secondClient.subscribe(channel),
    ])

    await firstClient.setMemberState({
      channels: [channel],
      memberId: params.memberId,
      state: {
        email: 'e2e@example.com',
      },
    })
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

  const jsChatResultCode = await testChatClientMethods(jsChat)
  if (jsChatResultCode !== 0) {
    return jsChatResultCode
  }
  console.log('Created jsChat')

  // Create RT-API Chat Client
  const rtChat = new RealtimeAPIChat.Client({
    // @ts-expect-error
    host: process.env.RELAY_HOST,
    project: process.env.RELAY_PROJECT as string,
    token: process.env.RELAY_TOKEN as string,
  })

  const rtChatResultCode = await testChatClientMethods(rtChat)
  if (rtChatResultCode !== 0) {
    return rtChatResultCode
  }
  console.log('Created rtChat')

  // Test Subscribe
  const subscribeResultCode = await testChatClientSubscribe(jsChat, rtChat)
  if (subscribeResultCode !== 0) {
    return subscribeResultCode
  }

  // Test Publish
  const jsChatPublishCode = await testChatClientPublish(jsChat, rtChat)
  if (jsChatPublishCode !== 0) {
    return jsChatPublishCode
  }
  const rtChatPublishCode = await testChatClientPublish(rtChat, jsChat)
  if (rtChatPublishCode !== 0) {
    return rtChatPublishCode
  }

  // Test Set/Get Member State
  const jsChatGetSetStateCode = await testChatClientSetAndGetMemberState(
    jsChat,
    rtChat
  )
  if (jsChatGetSetStateCode !== 0) {
    return jsChatGetSetStateCode
  }
  const rtChatGetSetStateCode = await testChatClientSetAndGetMemberState(
    rtChat,
    jsChat
  )
  if (rtChatGetSetStateCode !== 0) {
    return rtChatGetSetStateCode
  }

  // Test Unsubscribe
  const unsubscribeResultCode = await testChatClientUnsubscribe(jsChat, rtChat)
  if (unsubscribeResultCode !== 0) {
    return unsubscribeResultCode
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
