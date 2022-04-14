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
      room.on('room.subscribed', (room) => {
        console.log(
          'Room Subscribed --->',
          room.id,
          room.members[0].id,
          room.members[0].name
        )
        room.members[0].audioMute()
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
