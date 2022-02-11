import { Compat } from '@signalwire/realtime-api'
console.log(Compat)
// @ts-ignore
// async function run() {
//   try {
//     const client = new Compat.RelayClient({
//       host: process.env.HOST || 'relay.swire.io',
//       project: process.env.PROJECT as string,
//       token: process.env.TOKEN as string,
//       contexts: ['office'],
//       logLevel: 'debug',
//       debug: {
//         logWsTraffic: true,
//       },
//     })

//     client.on('signalwire.ready', (client) => {
//       console.log('READY!!', client)
//     })

//     await client.connect()

//     console.log('Client Running..')
//   } catch (error) {
//     console.log('<Error>', error)
//   }
// }

// run()

const consumer = new Compat.RelayConsumer({
  host: process.env.HOST || 'relay.swire.io',
  project: process.env.PROJECT as string,
  token: process.env.TOKEN as string,
  contexts: ['office'],
  ready: async (consumer) => {
    console.log('Ready...')
    // try {
    //   const result = await consumer.client.messaging.send({
    //     context: 'office',
    //     from: '+1..',
    //     to: '+1..',
    //     body: 'Welcome!!',
    //   })

    //   console.log(
    //     'SendResult',
    //     result.successful,
    //     result.messageId,
    //     result.errors
    //   )
    // } catch (error) {
    //   console.error('Messaging Send Error', error)
    // }
  },
  teardown: (_consumer: any) => {
    console.log('Teardown!!')
  },
  setup: (_consumer: any) => {
    console.log('Setup!!')
  },
  onTask: async (task: any) => {
    console.log('onTask', task)
  },
  onIncomingMessage: async (message: any) => {
    console.log('onIncomingMessage', message.id, message.state, message.body)
  },
  onMessageStateChange: async (message: any) => {
    console.log('onMessageStateChange', message.id, message.state, message.body)
  },
  onIncomingCall: async (call: any) => {
    console.log('onIncomingCall', call.id, call.from, call.to)
  },
})
console.log('Running', consumer.project, consumer.token)

consumer.run()
