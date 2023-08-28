import { SignalWire } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    tap.ok(client.pubSub, 'client.pubSub is defined')
    tap.ok(client.pubSub.listen, 'client.pubSub.listen is defined')
    tap.ok(client.pubSub.publish, 'client.pubSub.publish is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
