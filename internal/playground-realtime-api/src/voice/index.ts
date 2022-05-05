import { Voice } from '@signalwire/realtime-api'

const sleep = (ms = 3000) => {
  return new Promise((r) => {
    setTimeout(r, ms)
  })
}

// In this example you need to perform and outbound/inbound call
const RUN_DETECTOR = false

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
        console.log('Inbound call answered')
        await sleep(1000)

        // Send digits to trigger the detector
        await call.sendDigits('1w2w3')

        // Play media to mock an answering machine
        // await call.play({
        //   media: [
        //     {
        //       type: 'tts',
        //       text: 'Hello, please leave a message',
        //     },
        //     {
        //       type: 'silence',
        //       duration: 2,
        //     },
        //     {
        //       type: 'audio',
        //       url: 'https://www.soundjay.com/buttons/beep-01a.mp3',
        //     },
        //   ],
        //   volume: 2.0,
        // })

        // setTimeout(async () => {
        //   console.log('Terminating the call')
        //   await call.hangup()
        //   console.log('Call terminated!')
        // }, 3000)
      } catch (error) {
        console.error('Error answering inbound call', error)
      }
    })

    try {
      // Using "new Voice.Dialer" API
      // const dialer = new Voice.Dialer().add(
      //   Voice.Dialer.Phone({
      //     to: process.env.TO_NUMBER as string,
      //     from: process.env.FROM_NUMBER as string,
      //     timeout: 30,
      //   })
      // )
      // const call = await client.dial(dialer)

      // Using dialPhone Alias
      const call = await client.dialPhone({
        to: process.env.TO_NUMBER as string,
        from: process.env.FROM_NUMBER as string,
        timeout: 30,
      })

      console.log('Dial resolved!', call.id)

      if (RUN_DETECTOR) {
        // See the `call.received` handler
        const detect = await call.detectDigit()
        const result = await detect.waitForResult()
        console.log('Detect Result', result.type)

        await sleep()
      }

      try {
        const peer = await call.connect({
          devices: new Voice.DeviceBuilder().add(
            Voice.DeviceBuilder.Sip({
              from: 'sip:user1@domain.com',
              to: 'sip:user2@domain.com',
              timeout: 30,
            })
          ),
          ringback: new Voice.Playlist().add(
            Voice.Playlist.Ringtone({
              name: 'it',
            })
          ),
        })

        console.log('Peer:', peer.id, peer.type, peer.from, peer.to)

        console.log('Main:', call.id, call.type, call.from, call.to)

        // Wait until Main and Peer are connected
        await call.waitUntilConnected()

        const playlist = new Voice.Playlist({ volume: 2 }).add(
          Voice.Playlist.TTS({
            text: 'Thank you, you are now disconnected from the peer',
          })
        )
        await call.play(playlist)

        await sleep()
      } catch (error) {
        console.error('Connect Error', error)
      }

      call.on('tap.started', (p) => {
        console.log('>> tap.started', p.id, p.state)
      })

      call.on('tap.ended', (p) => {
        console.log('>> tap.ended', p.id, p.state)
      })

      const tap = await call.tapAudio({
        direction: 'both',
        device: {
          type: 'ws',
          uri: 'wss://example.domain.com/endpoint',
        },
      })

      await sleep(1000)
      console.log('>> Trying to stop', tap.id, tap.state)
      await tap.stop()

      call.on('prompt.started', (p) => {
        console.log('>> prompt.started', p.id)
      })
      call.on('prompt.updated', (p) => {
        console.log('>> prompt.updated', p.id)
      })
      call.on('prompt.failed', (p) => {
        console.log('>> prompt.failed', p.id, p.reason)
      })
      call.on('prompt.ended', (p) => {
        console.log(
          '>> prompt.ended',
          p.id,
          p.type,
          'Digits: ',
          p.digits,
          'Terminator',
          p.terminator
        )
      })

      const prompt = await call.prompt({
        media: [
          {
            type: 'tts',
            text: 'Welcome to SignalWire! Please enter your 4 digits PIN',
          },
        ],
        volume: 1.0,
        digits: {
          max: 4,
          digitTimeout: 10,
          terminators: '#',
        },
      })

      /** Wait for the result - sync way */
      // const { type, digits, terminator } = await prompt.waitForResult()
      // console.log('Prompt Output:', type, digits, terminator)

      console.log('Prompt STARTED!', prompt.id)
      await prompt.setVolume(2.0)
      await sleep()
      await prompt.stop()
      console.log('Prompt STOPPED!', prompt.id)

      call.on('recording.started', (r) => {
        console.log('>> recording.started', r.id)
      })
      call.on('recording.failed', (r) => {
        console.log('>> recording.failed', r.id, r.state)
      })
      call.on('recording.ended', (r) => {
        console.log(
          '>> recording.ended',
          r.id,
          r.state,
          r.size,
          r.duration,
          r.url
        )
      })

      const recording = await call.recordAudio()
      console.log('Recording STARTED!', recording.id)

      call.on('playback.started', (p) => {
        console.log('>> playback.started', p.id, p.state)
      })
      call.on('playback.updated', (p) => {
        console.log('>> playback.updated', p.id, p.state)
      })
      call.on('playback.ended', (p) => {
        console.log('>> playback.ended', p.id, p.state)
      })

      const playlist = new Voice.Playlist({ volume: 2 })
        .add(
          Voice.Playlist.Audio({
            url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
          })
        )
        .add(
          Voice.Playlist.Silence({
            duration: 5,
          })
        )
        .add(
          Voice.Playlist.TTS({
            text: 'Thank you, you are now disconnected from the peer',
          })
        )
      const playback = await call.play(playlist)

      // To wait for the playback to end (without pause/resume/stop it)
      // await playback.waitForEnded()

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

      await sleep()
      await recording.stop()
      console.log(
        'Recording STOPPED!',
        recording.id,
        recording.state,
        recording.size,
        recording.duration,
        recording.url
      )

      await call.hangup()
    } catch (error) {
      console.log('Error:', error)
    }
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
