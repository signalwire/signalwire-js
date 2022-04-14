import { Messaging } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = new Messaging.Client({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      contexts: ['office'],
      debug: {
        logWsTraffic: true,
      },
    })

    client.on('message.received', (message) => {
      console.log('message.received', message)
    })

    client.on('message.updated', (message) => {
      console.log('message.updated', message)
    })

    try {
      const response = await client.send({
        from: '+1xxx',
        to: '+1yyy',
        body: 'Hello World!',
      })
      console.log('>> send response', response)
    } catch (error) {
      console.log('>> send error', error)
    }

    console.log('Client Running..')

    setTimeout(async () => {
      console.log('Disconnect the client..')
      client.disconnect()
    }, 10_000)
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
