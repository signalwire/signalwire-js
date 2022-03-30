import { Voice } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = new Voice.Client({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      contexts: [process.env.RELAY_CONTEXT as string],
      // logLevel: 'trace',
      // debug: {
      //   logWsTraffic: true,
      // },
    })

    client.on('call.received', async (call) => {
      console.log('Got call', call.id, call.from, call.to, call.direction)

      try {
        await call.answer()
        console.log('Inbound call answered', call)
        setTimeout(async () => {
          console.log('Terminating the call')
          await call.hangup()
          console.log('Call terminated!')
        }, 3000)
      } catch (error) {
        console.error('Error answering inbound call', error)
      }
    })

    try {
      const call = await client.dial({
        devices: [
          [
            {
              type: 'phone',
              to: process.env.TO_NUMBER as string,
              from: process.env.FROM_NUMBER as string,
              timeout: 30,
            },
          ],
        ],
      })

      console.log('Dial resolved!', call.id)
      const sleep = () => {
        return new Promise((r) => {
          setTimeout(r, 3000)
        })
      }

      call.on('playback.started', (p) => {
        console.log('>> playback.started', p.id, p.state)
      })
      call.on('playback.updated', (p) => {
        console.log('>> playback.updated', p.id, p.state)
      })
      call.on('playback.ended', (p) => {
        console.log('>> playback.ended', p.id, p.state)
      })

      const playback = await call.play({
        media: [
          {
            type: 'audio',
            url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
          },
          { type: 'silence', duration: 5 },
          { type: 'tts', text: 'Thank you!' },
        ],
        volume: 2.0,
      })

      console.log('Playback STARTED!', playback.id)

      await sleep()
      await playback.pause()
      console.log('Playback PAUSED!')
      await sleep()
      await playback.resume()
      console.log('Playback RESUMED!')
      await sleep()
      await playback.stop()
      console.log('Playback STOPPED!')

      await call.hangup()
    } catch (e) {
      console.log('Error:', JSON.stringify(e, null, 2))
    }
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
