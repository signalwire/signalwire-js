import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
      // logLevel: "trace",
      debug: {
        logWsTraffic: true,
      },
    })

    let callsReceived = new Set()
    let inboundCall: Voice.Call
    let outboundCall: Voice.Call
    let peerCall: Voice.Call

    const performDigitDetect = async (
      caller: Voice.Call,
      callee: Voice.Call
    ) => {
      try {
        if (!caller || !callee) {
          throw new Error('One of the calls is not resolved!')
        }

        const detector = await caller.detectDigit({
          digits: '1',
        })
        const sendDigitResult = await callee.sendDigits('1#')
        tap.equal(
          callee.id,
          sendDigitResult.id,
          'Peer - sendDigit returns the same instance'
        )
        const resultDetector = await detector.ended()
        tap.equal(
          // @ts-expect-error
          resultDetector.detect.params.event,
          'finished',
          'Detect digit is finished'
        )
      } catch (error) {
        throw error
      }
    }

    const performPromptAndDetect = async (
      caller: Voice.Call,
      callee: Voice.Call
    ) => {
      if (!caller || !callee) {
        throw new Error('One of the calls is not resolved!')
      }

      const prompt = await callee.prompt({
        playlist: new Voice.Playlist({ volume: 1.0 }).add(
          Voice.Playlist.TTS({
            text: 'Welcome to SignalWire! Please enter your 4 digits PIN',
          })
        ),
        digits: {
          max: 4,
          digitTimeout: 100,
          terminators: '#',
        },
      })
      const sendDigitResult = await caller.sendDigits('1w2w3w#')
      tap.equal(
        caller.id,
        sendDigitResult.id,
        'sendDigit returns the same instance'
      )
      const promptEndedResult = await prompt.ended()
      tap.equal(prompt.id, promptEndedResult.id, 'Instances are the same')
      tap.equal(promptEndedResult.digits, '123', 'Correct Digits were entered')
    }

    client.on('call.received', async (call) => {
      callsReceived.add(call.id)
      console.log(
        `Got call number: ${callsReceived.size}`,
        call.id,
        call.from,
        call.to,
        call.direction
      )

      try {
        tap.equal(call.state, 'created', 'Inbound call state is "created"')
        const resultAnswer = await call.answer()

        // Size 2 means this the second (peer) call
        if (callsReceived.size === 2) {
          peerCall = call

          tap.equal(peerCall.state, 'answered', 'Peer call state is "answered"')
          tap.ok(resultAnswer.id, 'Peer call answered')
          tap.equal(
            peerCall.id,
            resultAnswer.id,
            'Peer call answered gets the same instance'
          )

          await performDigitDetect(inboundCall, peerCall)
          return
        }

        inboundCall = call

        tap.equal(
          inboundCall.state,
          'answered',
          'Inbound call state is "answered"'
        )
        tap.ok(resultAnswer.id, 'Inboud call answered')
        tap.equal(
          inboundCall.id,
          resultAnswer.id,
          'Inbound call answered gets the same instance'
        )

        const recording = await inboundCall.recordAudio({
          direction: 'speak',
          inputSensitivity: 60,
        })
        tap.ok(recording.id, 'Recording started')
        tap.equal(
          recording.state,
          'recording',
          'Recording state is "recording"'
        )

        const playlist = new Voice.Playlist({ volume: 2 }).add(
          Voice.Playlist.TTS({
            text: 'Message is getting recorded',
          })
        )
        const playback = await inboundCall.play(playlist)
        tap.ok(playback.id, 'Playback')

        // console.log('Waiting for Playback to end')
        const playbackEndedResult = await playback.ended()
        tap.equal(playback.id, playbackEndedResult.id, 'Instances are the same')
        tap.equal(
          playbackEndedResult.state,
          'finished',
          'Playback state is "finished"'
        )
        tap.pass('Playback ended')

        console.log('Stopping the recording')
        recording.stop()
        const recordingEndedResult = await recording.ended()
        tap.equal(
          recordingEndedResult.state,
          'finished',
          'Recording state is "finished"'
        )

        inboundCall.on('prompt.started', (p) => {
          tap.ok(p.id, 'Prompt has started')
        })
        inboundCall.on('prompt.ended', (p) => {
          tap.ok(p.id, 'Prompt has ended')
        })

        // Start a prompt and detect what caller has sent
        await performPromptAndDetect(outboundCall, inboundCall)

        console.log(
          `Connecting ${process.env.VOICE_DIAL_FROM_NUMBER} to ${process.env.VOICE_CONNECT_TO_NUMBER}`
        )
        const ringback = new Voice.Playlist().add(
          Voice.Playlist.Ringtone({
            name: 'it',
          })
        )
        const peer = await inboundCall.connectPhone({
          from: process.env.VOICE_DIAL_FROM_NUMBER!,
          to: process.env.VOICE_CONNECT_TO_NUMBER!,
          timeout: 30,
          ringback, // optional
          maxPricePerMinute: 10,
        })
        tap.equal(peer.connected, true, 'Peer connected is true')
        tap.equal(inboundCall.connected, true, 'Call connected is true')
        tap.equal(
          inboundCall.connectState,
          'connected',
          'Call connected is "connected"'
        )

        console.log('Peer:', peer.id, peer.type, peer.from, peer.to)
        console.log(
          'Main:',
          inboundCall.id,
          inboundCall.type,
          inboundCall.from,
          inboundCall.to
        )

        console.log('Finishing the calls.')
        inboundCall.disconnected().then(async () => {
          console.log('Call has been disconnected')
          await inboundCall.hangup()
          tap.equal(inboundCall.state, 'ended', 'Inbound call state is "ended"')
        })

        // Peer hangs up a call
        await peer.hangup()
      } catch (error) {
        console.error('Error', error)
        reject(4)
      }
    })

    try {
      outboundCall = await client.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
        maxPricePerMinute: 10,
      })
      tap.ok(outboundCall.id, 'Call resolved')
      tap.equal(
        outboundCall.state,
        'answered',
        'Outbound call state is "answered"'
      )

      // Resolve if the call has ended or ending
      const waitForParams = ['ended', 'ending', ['ending', 'ended']] as const
      const results = await Promise.all(
        waitForParams.map((params) => outboundCall.waitFor(params as any))
      )
      waitForParams.forEach((value, i) => {
        if (typeof value === 'string') {
          tap.ok(results[i], `"${value}": completed successfully.`)
        } else {
          tap.ok(
            results[i],
            `${JSON.stringify(value)}: completed successfully.`
          )
        }
      })
      tap.equal(outboundCall.state, 'ended', 'Outbound call state is "ended"')
      resolve(0)
    } catch (error) {
      console.error('Outbound - voice error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
