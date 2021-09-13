import { createClient } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = await createClient({
      host: 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    client.video.on('room.started', async (room) => {
      room.on('member.talking.started', (member) => {
        console.log('---> member.talking.started', member)
      })
      room.on('member.talking.ended', (member) => {
        console.log('---> member.talking.ended', member)
      })

      room.on('member.joined', async (member) => {
        console.log('---> member.joined', member)
        await member.videoMute()
      })

      room.on('room.updated', async (room) => {
        console.log('---> room.updated', room)
      })

      room.on('layout.changed', async (layout) => {
        console.log('---> layout.changed', layout)
      })

      room.on('member.updated', (member) => {
        // @ts-ignore
        console.log('---> member.updated', member.updated)
      })

      room.on('member.updated.audioMuted', (member) => {
        console.log('---> AUDIO MUTED', member)
      })
      room.on('member.updated.videoMuted', (member) => {
        console.log('---> VIDEO MUTED', member)
      })
      room.on('member.updated.visible', (member) => {
        console.log('---> VISIBLE', member.visible)
      })

      await room.run()

      console.log('🟢 ROOOM STARTED 🟢')
    })

    client.video.on('room.ended', (room) => {
      console.log('🔴 ROOOM ENDED 🔴', room)
    })

    await client.connect()

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
