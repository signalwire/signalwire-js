import { Voice } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = new Voice.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    // call.on('call.created', () => {})

    try {
      const call = await client.dial({
        devices: [
          [
            {
              type: 'phone',
              to: '+12083660792',
              from: '+15183601338',
              timeout: 30,
            },
          ],
        ],
      })

      console.log('Dial resolved!')

      setTimeout(async () => {
        console.log('Terminating the call')
        await call.hangup()
        console.log('Call terminated!')
      }, 3000)
    } catch (e) {
      console.log('---> E', JSON.stringify(e, null, 2))
    }

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
