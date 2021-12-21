import { RelayClient } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = new RelayClient({
      host: 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      contexts: ['office'],
      logLevel: 'debug',
      debug: {
        logWsTraffic: true,
      },
    })

    // @ts-expect-error
    client.on('signalwire.ready', (client) => {
      console.log('READY!!', client)
    })

    await client.connect()

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

// const consumer = new RelayConsumer({
//   host: 'relay.swire.io',
//   project: process.env.PROJECT as string,
//   token: process.env.TOKEN as string,
//   contexts: ['office'],
//   ready: (_consumer: any) => {
//     console.log('Ready...')
//   },
//   teardown: (_consumer: any) => {
//     console.log('Teardown!!')
//   },
//   setup: (_consumer: any) => {
//     console.log('Setup??', _consumer)
//   },
//   onTask: async (message: any) => {
//     console.log('TASK', message, consumer)
//   },
// })
// console.log('Running', consumer.project, consumer.token)

// consumer.run()

run()
