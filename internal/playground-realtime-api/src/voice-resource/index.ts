import { Voice } from '@signalwire/realtime-api'

// const sleep = (ms = 3000) => {
//   return new Promise((r) => {
//     setTimeout(r, ms)
//   })
// }

// In this example you need to perform and outbound/inbound call
const RUN_DETECTOR = false

async function run() {
  try {
    const client = new Voice.Client({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      contexts: [process.env.RELAY_CONTEXT as string],
      // logLevel: 'trace',
      debug: {
        logWsTraffic: true,
      },
    })

    try {
      // Dial a resource
      const call = await client.dialResource({
        to: process.env.TO_RESOURCE as string,
        from: process.env.FROM_RESOURCE as string,
        timeout: 30,
      })

      console.log('Dial resolved!', call.id)

      // await sleep(1000)

      // await call.hangup()
    } catch (error) {
      console.log('Error:', error)
    }

    client.disconnect()
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
