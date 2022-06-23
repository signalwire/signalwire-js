import { Task } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const task = new Task.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.RELAY_CONTEXT as string],
    })

    tap.ok(task.on, 'task.on is defined')
    tap.ok(task.once, 'task.once is defined')
    tap.ok(task.off, 'task.off is defined')
    tap.ok(task.removeAllListeners, 'task.removeAllListeners is defined')
    tap.ok(task.addContexts, 'task.addContexts is defined')
    tap.ok(task.disconnect, 'task.disconnect is defined')
    tap.ok(task.removeContexts, 'task.removeContexts is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
