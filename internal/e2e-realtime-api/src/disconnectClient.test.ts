import { PubSub } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve) => {
    const clientOptions = {
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT,
      token: process.env.RELAY_TOKEN,
    }

    const clientOne = new PubSub.Client({
      ...clientOptions,
      debug: {
        logWsTraffic: false,
      },
    })

    const channel = 'rw'
    const meta = { foo: 'bar' }
    const content = 'Hello World'

    await clientOne.publish({
      channel,
      content,
      meta,
    })

    clientOne.disconnect()

    const clientTwo = new PubSub.Client({
      ...clientOptions,
      debug: {
        logWsTraffic: false,
      },
    })

    await clientTwo.subscribe(channel)
    clientTwo.on('message', (message) => {
      if (message.meta.foo === 'bar' && message.content === 'Hello World') {
        resolve(0)
      }
    })

    const clientThree = new PubSub.Client({
      ...clientOptions,
      debug: {
        logWsTraffic: false,
      },
    })
    await clientThree.publish({
      channel,
      content,
      meta,
    })
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Disconnect Client Tests',
    testHandler: handler,
  })

  await runner.run()
}

main()
