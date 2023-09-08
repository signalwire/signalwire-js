import { randomUUID } from 'node:crypto'
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
          logWsTraffic: true,
        },
      })

      const homeTopic = `home-${randomUUID()}`
      const officeTopic = `office-${randomUUID()}`

      const firstPayload = {
        id: 1,
        topic: homeTopic,
      }
      const secondPayload = {
        id: 2,
        topic: homeTopic,
      }
      const thirdPayload = {
        id: 3,
        topic: officeTopic,
      }

      let unsubHomeOfficeCount = 0

      const unsubHomeOffice = await client.task.listen({
        topics: [homeTopic, officeTopic],
        onTaskReceived: async (payload) => {
          if (
            payload.topic !== homeTopic ||
            (payload.id !== firstPayload.id && payload.id !== secondPayload.id)
          ) {
            tap.notOk(
              payload,
              "Message received on wrong ['home', 'office'] listener"
            )
          }

          tap.ok(payload, 'Message received on ["home", "office"] topics')
          unsubHomeOfficeCount++

          if (unsubHomeOfficeCount === 2) {
            await unsubHomeOffice()

            // This message should not reach the listener since we have unsubscribed
            await client.task.send({
              topic: homeTopic,
              message: secondPayload,
            })

            await client.task.send({
              topic: officeTopic,
              message: thirdPayload,
            })
          }
        },
      })

      const unsubOffice = await client.task.listen({
        topics: [officeTopic],
        onTaskReceived: async (payload) => {
          if (payload.topic !== officeTopic || payload.id !== thirdPayload.id) {
            tap.notOk(payload, "Message received on wrong ['office'] listener")
          }

          tap.ok(payload, 'Message received on ["office"] topics')

          await unsubOffice()

          client.disconnect()

          return resolve(0)
        },
      })

      await client.task.send({
        topic: homeTopic,
        message: firstPayload,
      })

      await client.task.send({
        topic: homeTopic,
        message: secondPayload,
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
    executionTime: 30_000,
  })

  await runner.run()
}

main()
