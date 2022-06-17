import { Video } from '@signalwire/realtime-api'
import tap from 'tap'

async function run() {
  try {
    const video = new Video.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    tap.ok(video.on, 'video.on is defined')
    tap.ok(video.once, 'video.once is defined')
    tap.ok(video.off, 'video.off is defined')
    tap.ok(video.subscribe, 'video.subscribe is defined')
    tap.ok(video.removeAllListeners, 'video.removeAllListeners is defined')

    process.exit(0)
  } catch (error) {
    console.log('<Error>', error)
    process.exit(1)
  }
}

run()
