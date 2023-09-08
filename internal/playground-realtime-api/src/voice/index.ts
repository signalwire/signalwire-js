import { SignalWire, Voice } from '@signalwire/realtime-api'

const sleep = (ms = 3000) => {
  return new Promise((r) => {
    setTimeout(r, ms)
  })
}

// In this example you need to perform and outbound/inbound call
const RUN_DETECTOR = false

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

    let inboundCall: Voice.Call

    const unsubVoice = await client.voice.listen({
      topics: [process.env.RELAY_CONTEXT as string],
      async onCallReceived(call) {
        console.log('Got call', call.id, call.from, call.to, call.direction)

        try {
          inboundCall = call
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
      },
    })

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
    const call = await client.voice.dialPhone({
      to: process.env.TO_NUMBER as string,
      from: process.env.FROM_NUMBER as string,
      timeout: 30,
    })
    console.log('Dial resolved!', call.id)

    if (RUN_DETECTOR) {
      // See the `call.received` handler
      const detect = await call.detectDigit()
      const result = await detect.ended()
      console.log('Detect Result', result.type)

      await sleep()
    }

    try {
      const ringback = new Voice.Playlist().add(
        Voice.Playlist.Ringtone({
          name: 'it',
        })
      )
      console.log('call.connectPhone')
      const peer = await call.connectPhone({
        from: process.env.FROM_NUMBER!,
        to: process.env.CONNECT_NUMBER!,
        timeout: 30,
        ringback, // optional
        maxPricePerMinute: 10,
      })
      console.log('call.connectPhone resolve')
      // const peer = await call.connect({
      //   devices: new Voice.DeviceBuilder().add(
      //     Voice.DeviceBuilder.Sip({
      //       from: 'sip:user1@domain.com',
      //       to: 'sip:user2@domain.com',
      //       timeout: 30,
      //     })
      //   ),
      //   ringback,
      // })

      console.log('Peer:', peer.id, peer.type, peer.from, peer.to)
      console.log('Main:', call.id, call.type, call.from, call.to)

      // Wait until Main and Peer are connected
      await call.disconnected()

      console.log('call.disconnected')

      const playlist = new Voice.Playlist({ volume: 2 }).add(
        Voice.Playlist.TTS({
          text: 'Thank you, you are now disconnected from the peer',
        })
      )
      const pb = await call.play({ playlist })

      console.log('call.play')

      await pb.ended()

      console.log('pb.ended')
    } catch (error) {
      console.error('Connect Error', error)
    }

    try {
      const tap = await call.tapAudio({
        direction: 'both',
        device: {
          type: 'ws',
          uri: 'wss://example.domain.com/endpoint',
        },
        listen: {
          onStarted(p) {
            console.log('>> tap.started', p.id, p.state)
          },
          onEnded(p) {
            console.log('>> tap.ended', p.id, p.state)
          },
        },
      })

      await sleep(1000)
      console.log('>> Trying to stop', tap.id, tap.state)
      await tap.stop()
    } catch (error) {
      console.log('Tap failed', error)
    }

    const prompt = await call.prompt({
      playlist: new Voice.Playlist({ volume: 1.0 }).add(
        Voice.Playlist.TTS({
          text: 'Welcome to SignalWire! Please enter your 4 digits PIN',
        })
      ),
      digits: {
        max: 4,
        digitTimeout: 10,
        terminators: '#',
      },
      listen: {
        onStarted(p) {
          console.log('>> prompt.started', p.id)
        },
        onUpdated(p) {
          console.log('>> prompt.updated', p.id)
        },
        onFailed(p) {
          console.log('>> prompt.failed', p.id, p.reason)
        },
        onEnded(p) {
          console.log(
            '>> prompt.ended',
            p.id,
            p.type,
            'Digits: ',
            p.digits,
            'Terminator',
            p.terminator
          )
        },
      },
    })

    /** Wait for the result - sync way */
    // const { type, digits, terminator } = await prompt.ended()
    // console.log('Prompt Output:', type, digits, terminator)

    console.log('Prompt STARTED!', prompt.id)
    await prompt.setVolume(2.0)
    await sleep()
    await prompt.stop()
    console.log('Prompt STOPPED!', prompt.id)

    const recording = await call.recordAudio({
      listen: {
        onStarted(r) {
          console.log('>> recording.started', r.id)
        },
        onFailed(r) {
          console.log('>> recording.failed', r.id, r.state)
        },
        onEnded(r) {
          console.log(
            '>> recording.ended',
            r.id,
            r.state,
            r.size,
            r.duration,
            r.url
          )
        },
      },
    })
    console.log('Recording STARTED!', recording.id)

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
    const playback = await call.play({
      playlist,
      listen: {
        onStarted(p) {
          console.log('>> playback.started', p.id, p.state)
        },
        onUpdated(p) {
          console.log('>> playback.updated', p.id, p.state)
        },
        onEnded(p) {
          console.log('>> playback.ended', p.id, p.state)
        },
      },
    })

    // To wait for the playback to end (without pause/resume/stop it)
    // await playback.ended()

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

    client.disconnect()
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
