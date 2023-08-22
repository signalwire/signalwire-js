import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    try {
      const client = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
        debug: {
          // logWsTraffic: true,
        },
      })

      const firstPayload = {
        id: 1,
        topic: 'home',
      }
      const secondPayload = {
        id: 2,
        topic: 'home',
      }
      const thirdPayload = {
        id: 3,
        topic: 'office',
      }

      let counter = 0
      const unsubHomeOffice = await client.task.listen({
        topics: ['home', 'office'],
        onTaskReceived: (payload) => {
          if (
            payload.topic !== 'home' ||
            (payload.id !== firstPayload.id &&
              payload.id !== secondPayload.id) ||
            counter > 3
          ) {
            tap.notOk(
              payload,
              "Message received on wrong ['home', 'office'] listener"
            )
          }

          counter++
        },
      })

      const unsubOffice = await client.task.listen({
        topics: ['office'],
        onTaskReceived: async (payload) => {
          if (
            payload.topic !== 'office' ||
            payload.id !== thirdPayload.id ||
            counter > 3
          ) {
            tap.notOk(payload, "Message received on wrong ['office'] listener")
          }

          counter++

          if (counter === 3) {
            await unsubOffice()

            client.disconnect()

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

      await unsubHomeOffice()

      // This message should not reach the listener
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
