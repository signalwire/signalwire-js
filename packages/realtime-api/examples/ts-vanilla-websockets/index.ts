import { createClient } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = await createClient({
      host: 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    client.video.on('room.started', async (room) => {
      // room.on('member.talking.started', (member) => {
      //   console.log('---> member.talking.started', member)
      // })
      // room.on('member.talking.ended', (member) => {
      //   console.log('---> member.talking.ended', member)
      // })

      room.on('member.joined', async (member) => {
        console.log('---> member.joined', member.id, member.name)
        await member.videoMute()
      })

      room.on('member.left', async (member) => {
        console.log('---> member.left', member.id, member.name)
      })

      room.on('room.updated', async (room) => {
        // @ts-expect-error
        console.log('---> room.updated', room.id, room.name, room.updated)
      })

      room.on('layout.changed', async (layout) => {
        console.log('---> layout.changed', layout, layout.name)
      })

      room.on('member.updated', (member) => {
        console.log(
          '---> member.updated',
          member.id,
          member.name,
          // @ts-expect-error
          member.updated
        )
      })

      // @ts-expect-error
      room.on('member.updated.audio_muted', (member) => {
        console.log('---> audio_muted', member.id, member.audioMuted)
      })
      room.on('member.updated.audioMuted', (member) => {
        console.log('---> audioMuted', member.id, member.audioMuted)
      })

      // @ts-expect-error
      room.on('member.updated.video_muted', (member) => {
        console.log('---> video_muted', member.id, member.videoMuted)
      })
      room.on('member.updated.videoMuted', (member) => {
        console.log('---> videoMuted', member.id, member.videoMuted)
      })
      room.on('member.updated.visible', (member) => {
        console.log('---> visible', member.id, member.visible)
      })

      room.on('recording.started', (rec) => {
        console.log('recording.started', rec.id, rec.state, rec.startedAt)
      })

      room.on('recording.updated', (rec) => {
        console.log('recording.updated', rec.id, rec.state, rec.startedAt)
      })

      room.on('recording.ended', (rec) => {
        console.log(
          'recording.ended',
          rec.id,
          rec.state,
          rec.startedAt,
          rec.endedAt,
          rec.duration
        )
      })
      await room.run()

      const rec = await room.startRecording()

      setTimeout(async () => {
        const list = await room.getRecordings()
        console.log('Recordings', JSON.stringify(list, null, 2))

        setTimeout(async () => {
          await rec.stop()
          console.log('Recording STOPPED')
        }, 6000)
      }, 2000)

      console.log('🟢 ROOOM STARTED 🟢')
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
