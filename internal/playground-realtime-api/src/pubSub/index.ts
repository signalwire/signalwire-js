import { PubSub } from '@signalwire/realtime-api'

async function run() {
  try {
    const pubSub = new PubSub.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      logLevel: 'trace',
      debug: {
        logWsTraffic: true,
      },
      // httpOptions: {
      //   proxy: "http://localhost:8888"
      // }
    })

    const channel = 'channel-name-here'

    pubSub.on('message', (message) => {
      console.log('message', message)
    })

    await pubSub.subscribe([channel])

    const pubRes = await pubSub.publish({
      content: 'Hello There',
      channel: channel,
      meta: {
        fooId: 'randomValue',
      },
    })

    console.log('Publish Result --->', pubRes)

    const unsubscribeRes = await pubSub.unsubscribe(channel)

    console.log('Unsubscribe Result --->', unsubscribeRes)

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
