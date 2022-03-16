import { Voice } from '@signalwire/realtime-api'

async function run() {
  try {
    const call = new Voice.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    call.on('call.created', () => {})

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
