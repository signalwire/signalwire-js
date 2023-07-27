import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    try {
      const client = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
        // logLevel: "trace",
        debug: {
          logWsTraffic: true,
        },
      })

      const firstPayload = {
        id: 'id.firstPayload',
        topic: 'home',
      }
      const secondPayload = {
        id: 'id.secondPayload',
        topic: 'home',
      }
      const thirdPayload = {
        id: 'id.thirdPayload',
        topic: 'office',
      }

      let counter = 0
      const unsubHomeOffice = await client.task.listen({
        topics: ['home', 'office'],
        onTaskReceived: async (payload) => {
          counter++

          if (counter === 2) {
            await unsubHomeOffice()
          }

          if (
            payload.topic !== 'home' ||
            (payload.id !== firstPayload.id &&
              payload.id !== secondPayload.id) ||
            counter > 2
          ) {
            console.error(
              'Invalid payload on ["home", "office"] context',
              payload
            )
            return reject(4)
          }
        },
      })

      const unsubOffice = await client.task.listen({
        topics: ['office'],
        onTaskReceived: async (payload) => {
          counter++

          await unsubOffice()

          if (
            payload.topic !== 'office' ||
            payload.id !== thirdPayload.id ||
            counter > 3
          ) {
            console.error('Invalid payload on ["office"] context', payload)
            return reject(4)
          }

          if (counter === 3) {
            return resolve(0)
          }
        },
      })

      await client.task.send({
        topic: 'home',
        message: firstPayload,
      })

      await client.task.send({
        topic: 'home',
        message: secondPayload,
      })

      // This message should not reach the listener since we unsub once we get 2 responses
      await client.task.send({
        topic: 'home',
        message: secondPayload,
      })

      await client.task.send({
        topic: 'office',
        message: thirdPayload,
      })
    } catch (error) {
      console.log('Task test error', error)
      reject(error)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Task E2E',
    testHandler: handler,
  })

  await runner.run()
}

main()
