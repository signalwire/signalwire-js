import { createClient } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = await createClient({
      // host: 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    client.video.on('room.started', async (roomSession) => {
      roomSession.on('member.joined', async (member) => {
        console.log('member.joined', member.id, member.name)
        await member.videoMute()
        await member.audioMute()
        await member.setDeaf(true)
      })

      roomSession.on('member.left', async (member) => {
        console.log('member.left', member.id, member.name)
      })

      roomSession.on('room.updated', async (roomSession) => {
        console.log('room.updated', roomSession.id, roomSession.name)
      })

      roomSession.on('layout.changed', async (layout) => {
        console.log('layout.changed', layout.name, layout.layers.length)
      })

      roomSession.on('member.updated', (member) => {
        console.log('-member.updated', member.id, member.name, member.updated)
      })

      roomSession.on('recording.started', (rec) => {
        console.log('recording.started', rec.id, rec.state, rec.startedAt)
      })

      roomSession.on('recording.updated', (rec) => {
        console.log('recording.updated', rec.id, rec.state, rec.startedAt)
      })

      roomSession.on('recording.ended', (rec) => {
        console.log(
          'recording.ended',
          rec.id,
          rec.state,
          rec.startedAt,
          rec.endedAt,
          rec.duration
        )
      })
      await roomSession.subscribe()

      const rec = await roomSession.startRecording()

      setTimeout(async () => {
        const list = await roomSession.getRecordings()
        console.log('Recordings', JSON.stringify(list, null, 2))

        setTimeout(async () => {
          await rec.stop()
          console.log('Recording STOPPED')
        }, 10 * 1000)
      }, 2000)

      console.log('🟢 ROOOM STARTED 🟢', roomSession.id, roomSession.name)
    })

    client.video.on('room.ended', (roomSession) => {
      console.log('🔴 ROOOM ENDED 🔴', roomSession.id, roomSession.name)
    })

    await client.connect()

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
