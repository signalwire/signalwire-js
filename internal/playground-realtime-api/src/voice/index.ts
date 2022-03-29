import { Voice } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = new Voice.Client({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      contexts: [process.env.RELAY_CONTEXT as string],
      // logLevel: 'trace',
      // debug: {
      //   logWsTraffic: true,
      // },
    })

    client.on('call.received', async (call) => {
      console.log('Got call', call.id, call.from, call.to, call.direction)

      try {
        await call.answer()
        console.log('Inbound call answered', call)
        setTimeout(async () => {
          console.log('Terminating the call')
          await call.hangup()
          console.log('Call terminated!')
        }, 3000)
      } catch (error) {
        console.error('Error answering inbound call', error)
      }
    })

    try {
      const call = await client.dial({
        devices: [
          [
            {
              type: 'phone',
              to: process.env.TO_NUMBER as string,
              from: process.env.FROM_NUMBER as string,
              timeout: 30,
            },
          ],
        ],
      })

      // @ts-expect-error
      call.on('call.state', (params) => {
        console.log('OMG!!', params)
      })

      console.log('Dial resolved!', call)
    } catch (e) {
      console.log('---> E', JSON.stringify(e, null, 2))
    }

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
