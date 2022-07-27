import { Messaging } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const context = process.env.MESSAGING_CONTEXT

    const client = new Messaging.Client({
      host: process.env.RELAY_HOST as string,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [context],
    })

    client.on('message.received', (message) => {
      console.log('message.received', message)
      if (message.state === 'received' && message.body === 'Hello e2e!') {
        return resolve(0)
      }
      console.error('Invalid message on `message.received`', message)
      return reject(4)
    })

    client.on('message.updated', (message) => {
      // TODO: Test message.updated
      console.log('message.updated', message)
    })

    const response = await client.send({
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
