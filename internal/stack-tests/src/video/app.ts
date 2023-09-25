import { SignalWire } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
    })

    tap.ok(client.video, 'client.video is defined')
    tap.ok(client.video.listen, 'client.video.listen is defined')
    tap.ok(client.video.getRoomSessions, 'video.getRoomSessions is defined')
    tap.ok(
      client.video.getRoomSessionById,
      'video.getRoomSessionById is defined'
    )
    tap.ok(client.disconnect, 'video.disconnect is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
