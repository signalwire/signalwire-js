import { SignalWire } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    tap.ok(client.messaging, 'client.messaging is defined')
    tap.ok(client.messaging.listen, 'client.messaging.listen is defined')
    tap.ok(client.messaging.send, 'message.send is defined')
    tap.ok(client.disconnect, 'client.disconnect is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
