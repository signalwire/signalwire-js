import { SignalWire } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    try {
      const client = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
      })

      const firstPayload = {
        id: Date.now(),
        topic: 'home',
      }
      const secondPayload = {
        id: Date.now(),
        topic: 'home',
      }
      const thirdPayload = {
        id: Date.now(),
        topic: 'office',
      }

      let counter = 0
      const unsubHomeOffice = await client.task.listen({
        topics: ['home', 'office'],
        onTaskReceived: (payload) => {
          if (
            payload.topic !== 'home' ||
            payload.id !== firstPayload.id ||
            payload.id !== secondPayload.id ||
            counter > 3
          ) {
            console.error('Invalid payload on `home` context', payload)
            return reject(4)
          }
          counter++
        },
      })

      const unsubOffice = await client.task.listen({
        topics: ['office'],
        onTaskReceived: (payload) => {
          if (
            payload.topic !== 'office' ||
            payload.id !== thirdPayload.id ||
            counter > 3
          ) {
            console.error('Invalid payload on `home` context', payload)
            return reject(4)
          }
          counter++

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

      await unsubOffice()
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
