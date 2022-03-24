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

    client.on('messaging.receive', (message) => {
      console.log('messaging.receive', message)
    })

    client.on('messaging.state', (message) => {
      console.log('messaging.state', message)
    })

    try {
      const response = await client.send({
        context: 'office',
        from: '+15183601338',
        to: '+12062371092',
      })
      console.log('>> send response', response)
    } catch (error) {
      console.log('>> send error', error)
    }

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
