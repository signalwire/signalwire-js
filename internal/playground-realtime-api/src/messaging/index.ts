import { SignalWire } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      debug: {
        logWsTraffic: true,
      },
    })

    const unsubHomeListener = await client.messaging.listen({
      topics: ['home'],
      onMessageReceived: (payload) => {
        console.log('Message received under "home" context', payload)
      },
      onMessageUpdated: (payload) => {
        console.log('Message updated under "home" context', payload)
      },
    })

    try {
      const response = await client.messaging.send({
        from: process.env.FROM_NUMBER_MSG as string,
        to: process.env.TO_NUMBER_MSG as string,
        body: 'Hello World!',
      })
      console.log('>> send response', response)
    } catch (error) {
      console.log('>> send error', error)
    }

    console.log('Client Running..')

    setTimeout(async () => {
      await unsubHomeListener()
      console.log('Disconnect the client..')
      client.disconnect()
    }, 10_000)
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
