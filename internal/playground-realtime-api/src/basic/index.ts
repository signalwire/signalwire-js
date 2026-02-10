import { Video } from '@signalwire/realtime-api'

async function run() {
  try {
    const video = new Video.Client({
      // @ts-expect-error
      host: process.env.HOST,
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      // debug: { logWsTraffic: true },
    })

    video.on('room.started', async (roomSession) => {
      console.log('Room started', roomSession.id)

      roomSession.on('member.updated', async (member) => {
        console.log(member)
      })
    })

    video.on('room.ended', async (roomSession) => {
      console.log('Room ended', roomSession.id)
    })

    const { roomSessions } = await video.getRoomSessions()

    roomSessions.forEach(async (roomSession) => {
      console.log('RoomSession:', roomSession.id)
      const { recordings } = await roomSession.getRecordings()
      console.log('Recordings', recordings.length)
      recordings.forEach(async (rec) => {
        console.log('REC', rec.id, rec.roomSessionId, rec.state, rec.startedAt)
        if (rec.state === 'recording') {
          await rec.stop()
        }
      })
    })

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
