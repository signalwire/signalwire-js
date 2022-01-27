import { Video } from '@signalwire/realtime-api'

async function run() {
  try {
    const video = new Video.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    video.on('room.started', (room) => {
      console.log('Room started --->', room.id, room.name)
    })

    video.on('room.ended', (room) => {
      console.log('🔴 ROOOM ENDED 🔴', `${room}`, room.name)
    })

    video._session.on('session.connected', () => {
      console.log('SESSION CONNECTED!')
    })

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
