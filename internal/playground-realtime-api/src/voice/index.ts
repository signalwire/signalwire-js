import { Voice } from '@signalwire/realtime-api'

async function run() {
  try {
    const call = new Voice.Call({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    // call.on('call.created', () => {})

    try {
      const res = await call.dial({
        // to: '+12083660792',
        // from: '+15183601338',
        // tag: 'Custom client data',
        // tag: uuid(),
        // region: 'us',
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
      console.log('Dial resolved!', res);

    } catch (e) {
      console.log('---> E', JSON.stringify(e, null, 2))
    }

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
