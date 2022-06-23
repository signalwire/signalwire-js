import { Video } from '@signalwire/realtime-api'

async function run() {
  try {
    const video = new Video.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      debug: {
        logWsTraffic: true,
      },
    })

    const roomSessionHandler = (room: Video.RoomSession) => {
      console.log('Room started --->', room.id, room.name, room.members)
      room.on('room.subscribed', (room) => {
        console.log('Room Subscribed --->', room.id, room.members)
      })

      room.on('member.updated', () => {
        console.log('Member updated --->')
      })

      room.on('member.joined', (member) => {
        console.log('Member joined --->', member.id, member.name)
      })

      room.on('member.left', (member) => {
        console.log('Member left --->', member.id, member.name)
      })
    }
    video.on('room.started', roomSessionHandler)

    video.on('room.ended', (room) => {
      console.log('🔴 ROOOM ENDED 🔴', `${room}`, room.name)
    })

    video._session.on('session.connected', () => {
      console.log('SESSION CONNECTED!')
    })

    console.log('Client Running..')

    const { roomSessions } = await video.getRoomSessionsInProgress()

    roomSessions.forEach(async (room: any) => {
      console.log('>> Room Session: ', room.id, room.displayName)
      roomSessionHandler(room)

      const { roomSession } = await video.getRoomSession({
        id: room.id,
      })
      console.log('Room Session By ID:', roomSession.displayName)
    })
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
