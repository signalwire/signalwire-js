import { Task } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const context = 'task-e2e'
    const firstPayload = {
      id: Date.now(),
      item: 'first',
    }
    const lastPayload = {
      id: Date.now(),
      item: 'last',
    }

    const client = new Task.Client({
      host: process.env.RELAY_HOST as string,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [context],
    })

    let counter = 0

    client.on('task.received', (payload) => {
      if (payload.id === firstPayload.id && payload.item === 'first') {
        return counter++
      }
      if (payload.id === firstPayload.id && payload.item === 'last') {
        return counter++
      }
      if (counter === 2) {
        return resolve(0)
      }
      console.error('Invalid payload on `task.received`', payload)
      return reject(4)
    })

    await Task.send({
      host: process.env.RELAY_HOST as string,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      context,
      message: firstPayload,
    })

    await Task.send({
      host: process.env.RELAY_HOST as string,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      context,
      message: lastPayload,
    })
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
