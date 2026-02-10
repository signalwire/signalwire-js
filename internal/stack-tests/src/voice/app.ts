import { SignalWire } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    tap.ok(client.voice, 'client.voice is defined')
    tap.ok(client.voice.listen, 'client.voice.listen is defined')
    tap.ok(client.voice.dial, 'voice.dial is defined')
    tap.ok(client.voice.dialPhone, 'voice.dialPhone is defined')
    tap.ok(client.voice.dialSip, 'voice.dialSip is defined')
    tap.ok(client.disconnect, 'voice.disconnect is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
