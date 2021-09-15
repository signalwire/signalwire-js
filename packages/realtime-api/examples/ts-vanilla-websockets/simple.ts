import { createClient } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = await createClient({
      // host: 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      logLevel: 'trace',
    })

    client.video.on('room.started', async (room) => {
      // @ts-ignore
      console.log('Room started', room.id, room.name, room.roomSessionId)
      console.log('Starting now')
      const rec = await room.startRecording()

      setTimeout(() => {
        console.log('Stopping now')
        rec.stop()
      }, 10 * 1000)
    })

    client.video.on('room.ended', (room) => {
      console.log('🔴 ROOOM ENDED 🔴', room, room.name)
    })

    await client.connect()

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
