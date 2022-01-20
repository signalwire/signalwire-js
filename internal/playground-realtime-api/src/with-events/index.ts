import { Video } from '@signalwire/realtime-api'

async function run() {
  try {
    // const client = await createClient({
    //   // @ts-expect-error
    //   host: process.env.HOST || 'relay.swire.io',
    //   project: process.env.PROJECT as string,
    //   token: process.env.TOKEN as string,
    //   logLevel: 'trace',
    // })
    const client = new Video.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      // logLevel: 'trace',
    })

    client.session.on('session.connected', () => {
      console.log('Session Connected!');
    })

    client.on('room.started', (room) => {
      console.log('Room started --->', room.id, room.name)
    })

    client.on('room.ended', (room) => {
      console.log('🔴 ROOOM ENDED 🔴', `${room}`, room.name)
    })

    // client.on('session.idle', () => {})

    // client.video.on('room.started', async (room) => {
    //   console.log('Room started --->', room.id, room.name)
    //   // console.log('Start Recording')
    //   // const rec = await room.startRecording()

    //   // setTimeout(() => {
    //   //   console.log('Stop Recording')
    //   //   rec.stop()
    //   // }, 10 * 1000)
    // })

    // client.video.on('room.ended', (room) => {
    //   console.log('🔴 ROOOM ENDED 🔴', `${room}`, room.name)
    // })

    // await client.connect()

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
