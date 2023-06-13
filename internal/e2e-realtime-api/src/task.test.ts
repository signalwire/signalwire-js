import { Task } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'
import { SignalWire } from '@signalwire/realtime-api'

const handler = async () => {
  return new Promise<number>(async (resolve, reject) => {
    const client = await SignalWire({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    const topic = 'task-e2e'
    const firstPayload = {
      id: Date.now(),
      item: 'first',
    }
    const lastPayload = {
      id: Date.now(),
      item: 'last',
    }
    let counter = 0

    const unsub = await client.task.listen({
      topics: [topic],
      onTaskReceived: (payload) => {
        if (payload.id === firstPayload.id && payload.item === 'first') {
          counter++
        } else if (payload.id === lastPayload.id && payload.item === 'last') {
          counter++
        } else {
          console.error('Invalid payload on `onTaskReceived`', payload)
          return reject(4)
        }

        if (counter === 2) {
          return resolve(0)
        }
      },
    })

    await client.task.send({
      topic: topic,
      message: firstPayload,
    })

    await client.task.send({
      topic: topic,
      message: lastPayload,
    })

    await unsub()
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
