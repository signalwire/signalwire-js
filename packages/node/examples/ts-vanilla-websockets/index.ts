import { createWebSocketClient } from '@signalwire/node'

async function run() {
  try {
    const client = await createWebSocketClient({
      host: 'relay.swire.io',
      project: '<project-id>',
      token: '<project-token>',
    })

    client.video.on('room.started', async (room) => {
      room.on('member.talking', (member) => {
        console.log('---> MEMBER TALKING!!!')
        setTimeout(async () => {
          console.log('---> MUTE ME?')
          await member.audioMute()
          console.log('---> OK - MUTED!')
        }, 3000)
      })

      room.on('member.joined', async (member) => {
        console.log('---> member.joined', member)
        await member.videoMute()
      })

      room.on('member.updated', (member) => {
        // @ts-ignore
        console.log('---> member.updated', member.updated)
      })

      room.on('member.updated.audio_muted', (member) => {
        console.log('---> AUDIO MUTED', member)
      })
      room.on('member.updated.video_muted', (member) => {
        console.log('---> VIDEO MUTED', member)
      })
      room.on('member.updated.visible', (member) => {
        console.log('---> VISIBLE', member.visible)
      })

      await room.run()

      console.log('🟢 ROOOM STARTED 🟢')
    })

    client.video.on('room.ended', (room) => {
      console.log('🔴 ROOOM ENDED 🔴', room.name, room)
    })

    await client.connect()

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
