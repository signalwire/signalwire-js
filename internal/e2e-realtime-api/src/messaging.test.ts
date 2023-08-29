import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const context = process.env.MESSAGING_CONTEXT

    const client = await SignalWire({
      host: process.env.RELAY_HOST as string,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    const unsub = await client.messaging.listen({
      topics: [process.env.MESSAGING_CONTEXT!],
      async onMessageReceived(message) {
        console.log('message.received', message)
        if (message.body === 'Hello e2e!') {
          await unsub()

          client.disconnect()

          return resolve(0)
        }
        console.error('Invalid message on `message.received`', message)
        return reject(4)
      },
      onMessageUpdated(message) {
        // TODO: Test message.updated
        console.log('message.updated', message)
      },
    })

    // This should never run since the topics are wrong
    await client.messaging.listen({
      topics: ['wrong'],
      onMessageReceived(message) {
        console.error('Invalid message on `wrong` topic', message)
        return reject(4)
      },
    })

    const response = await client.messaging.send({
      context,
      from: process.env.MESSAGING_FROM_NUMBER as string,
      to: process.env.MESSAGING_TO_NUMBER as string,
      body: 'Hello e2e!',
    })

    console.log('Messaging Send Response', response)
    if (!response.messageId) {
      console.error('Missing messageId in response')
      return reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Messaging E2E',
    // testHandler: handler,
    testHandler: async () => {
      console.log('Messaging E2E Disabled!')
      return 0
    },
  })

  await runner.run()
}

main()
