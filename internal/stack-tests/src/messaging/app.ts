import { Messaging } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const message = new Messaging.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.RELAY_CONTEXT as string],
    })

    tap.ok(message.on, 'message.on is defined')
    tap.ok(message.once, 'message.once is defined')
    tap.ok(message.off, 'message.off is defined')
    tap.ok(message.removeAllListeners, 'message.removeAllListeners is defined')
    tap.ok(message.addContexts, 'message.addContexts is defined')
    tap.ok(message.send, 'message.send is defined')
    tap.ok(message.disconnect, 'message.disconnect is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
