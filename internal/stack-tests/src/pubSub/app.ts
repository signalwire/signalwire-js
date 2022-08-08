import { PubSub } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const pubSub = new PubSub.Client({
      // @ts-expect-error
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.RELAY_CONTEXT as string],
    })

    tap.ok(pubSub.on, 'pubSub.on is defined')
    tap.ok(pubSub.once, 'pubSub.once is defined')
    tap.ok(pubSub.off, 'pubSub.off is defined')
    tap.ok(pubSub.removeAllListeners, 'pubSub.removeAllListeners is defined')
    tap.ok(pubSub.publish, 'pubSub.publish is defined')
    tap.ok(pubSub.subscribe, 'pubSub.subscribe is defined')
    tap.ok(pubSub.unsubscribe, 'pubSub.unsubscribe is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
