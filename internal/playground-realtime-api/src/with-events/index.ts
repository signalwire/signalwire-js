import { Video, SignalWire } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      debug: {
        // logWsTraffic: true,
      },
    })

    const unsubVideo = await client.video.listen({
      onRoomStarted(room) {
        console.log('🟢 onRoomStarted 🟢', room.id, room.name)
        roomSessionHandler(room)
      },
      onRoomEnded(room) {
        console.log('🔴 onRoomEnded 🔴', room.id, room.name)
      },
    })

    const roomSessionHandler = async (room: Video.RoomSession) => {
      const unsubRoom = await room.listen({
        onRoomSubscribed: (room) => {
          console.log('onRoomSubscribed', room.id, room.name)
        },
        onRoomStarted: (room) => {
          console.log('onRoomStarted', room.id, room.name)
        },
        onRoomUpdated: (room) => {
          console.log('onRoomUpdated', room.id, room.name)
        },
        onRoomEnded: (room) => {
          console.log('onRoomEnded', room.id, room.name)
        },
        onMemberJoined: async (member) => {
          console.log('onMemberJoined --->', member.id, member.name)

          const play = await room
            .play({
              url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
              listen: {
                onStarted: (playback) => {
                  console.log('onStarted', playback.id, playback.url)
                },
                onUpdated: (playback) => {
                  console.log('onUpdated', playback.id, playback.url)
                },
                onEnded: (playback) => {
                  console.log('onEnded', playback.id, playback.url)
                },
              },
            })
            .onStarted()
          console.log('play', play.id)

          setTimeout(async () => {
            await play.pause()

            setTimeout(async () => {
              await play.stop()
            }, 5000)
          }, 10000)
        },
        onMemberUpdated: (member) => {
          console.log('onMemberUpdated', member.id, member.name)
        },
        onMemberTalking: (member) => {
          console.log('onMemberTalking', member.id, member.name)
        },
        onMemberLeft: (member) => {
          console.log('onMemberLeft', member.id, member.name)
        },
        onPlaybackStarted: (playback) => {
          console.log('onPlaybackStarted', playback.id, playback.url)
        },
        onPlaybackUpdated: (playback) => {
          console.log('onPlaybackUpdated', playback.id, playback.url)
        },
        onPlaybackEnded: (playback) => {
          console.log('onPlaybackEnded', playback.id, playback.url)
        },
      })
    }

    // @ts-expect-error
    client.video._client.session.on('session.connected', () => {
      console.log('SESSION CONNECTED!')
    })

    console.log('Client Running..')

    const { roomSessions } = await client.video.getRoomSessions()

    roomSessions.forEach(async (room: Video.RoomSession) => {
      console.log('>> Room Session: ', room.id, room.displayName)
      roomSessionHandler(room)

      const r = await room.getMembers()
      console.log('Members:', r)
      // await room.removeAllMembers()

      const { roomSession } = await client.video.getRoomSessionById(room.id)
      console.log('Room Session By ID:', roomSession.displayName)
    })
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
