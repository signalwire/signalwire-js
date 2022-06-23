import { Voice } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const voice = new Voice.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.RELAY_CONTEXT as string],
    })

    tap.ok(voice.on, 'voice.on is defined')
    tap.ok(voice.once, 'voice.once is defined')
    tap.ok(voice.off, 'voice.off is defined')
    tap.ok(voice.removeAllListeners, 'voice.removeAllListeners is defined')
    tap.ok(voice.dial, 'voice.dial is defined')
    tap.ok(voice.dialPhone, 'voice.dialPhone is defined')
    tap.ok(voice.dialSip, 'voice.dialSip is defined')
    tap.ok(voice.disconnect, 'voice.disconnect is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
