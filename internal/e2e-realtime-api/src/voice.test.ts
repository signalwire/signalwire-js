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

    let waitForInboundAnswerResolve: (value: void) => void
    const waitForInboundAnswer = new Promise((resolve) => {
      waitForInboundAnswerResolve = resolve
    })
    let waitForPeerAnswerResolve: (value: void) => void
    const waitForPeerAnswer = new Promise((resolve) => {
      waitForPeerAnswerResolve = resolve
    })
    let waitForSendDigitResolve
    const waitForSendDigit = new Promise((resolve) => {
      waitForSendDigitResolve = resolve
    })
    let waitForPromptStartResolve: (value: void) => void
    const waitForPromptStart = new Promise((resolve) => {
      waitForPromptStartResolve = resolve
    })
    let waitForPeerSendDigitResolve
    const waitForPeerSendDigit = new Promise((resolve) => {
      waitForPeerSendDigitResolve = resolve
    })

    let callsReceived = new Set()

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
        tap.equal(call.state, 'answered', 'Inbound call state is "answered"')
        tap.ok(resultAnswer.id, 'Inboud call answered')
        tap.equal(
          call.id,
          resultAnswer.id,
          'Call answered gets the same instance'
        )

        if (callsReceived.size === 2) {
          // Resolve the 2nd inbound call promise to inform the caller (inbound)
          waitForPeerAnswerResolve()
          console.log(`Sending digits from call: ${call.id}`)

          const sendDigitResult = await call.sendDigits('1#')
          tap.equal(
            call.id,
            sendDigitResult.id,
            'Peer - sendDigit returns the same instance'
          )

          // Resolve the send digit promise to inform the caller
          waitForPeerSendDigitResolve()
          return
        }

        // Resolve the 1st inbound call promise to inform the caller (outbound)
        waitForInboundAnswerResolve()

        const recording = await call.recordAudio({
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
        const playback = await call.play(playlist)
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

        call.on('prompt.started', (p) => {
          tap.ok(p.id, 'Prompt has started')
        })
        call.on('prompt.ended', (p) => {
          tap.ok(p.id, 'Prompt has ended')
        })

        const prompt = await call.prompt({
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

        // Resolve the prompt start promise to let the caller know
        waitForPromptStartResolve()

        // Wait until the caller send digits
        await waitForSendDigit

        const promptEndedResult = await prompt.ended()
        tap.equal(prompt.id, promptEndedResult.id, 'Instances are the same')
        tap.equal(
          promptEndedResult.digits,
          '123',
          'Correct Digits were entered'
        )

        console.log(
          `Connecting ${process.env.VOICE_DIAL_FROM_NUMBER} to ${process.env.VOICE_CONNECT_TO_NUMBER}`
        )
        const ringback = new Voice.Playlist().add(
          Voice.Playlist.Ringtone({
            name: 'it',
          })
        )
        const peer = await call.connectPhone({
          from: process.env.VOICE_DIAL_FROM_NUMBER!,
          to: process.env.VOICE_CONNECT_TO_NUMBER!,
          timeout: 30,
          ringback, // optional
          maxPricePerMinute: 10,
        })
        tap.equal(peer.connected, true, 'Peer connected is true')
        tap.equal(call.connected, true, 'Call connected is true')
        tap.equal(
          call.connectState,
          'connected',
          'Call connected is "connected"'
        )

        console.log('Peer:', peer.id, peer.type, peer.from, peer.to)
        console.log('Main:', call.id, call.type, call.from, call.to)

        // Wait until the peer answers the call
        await waitForPeerAnswer

        const detector = await call.detectDigit({
          digits: '1',
        })

        // Wait until the peer send digits
        await waitForPeerSendDigit

        const resultDetector = await detector.ended()
        // TODO: update this once the backend can send us the actual result
        tap.equal(
          // @ts-expect-error
          resultDetector.detect.params.event,
          'finished',
          'Detect digit is finished'
        )

        console.log('Finishing the calls.')
        call.disconnected().then(async () => {
          console.log('Call has been disconnected')
          await call.hangup()
          tap.equal(call.state, 'ended', 'Inbound call state is "ended"')
        })

        // Peer hangs up a call
        await peer.hangup()
      } catch (error) {
        console.error('Error', error)
        reject(4)
      }
    })

    try {
      const call = await client.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
        maxPricePerMinute: 10,
      })
      tap.ok(call.id, 'Call resolved')
      tap.equal(call.state, 'answered', 'Outbound call state is "answered"')

      // Wait until callee answers the call
      await waitForInboundAnswer

      // Wait until callee starts the prompt
      await waitForPromptStart

      const sendDigitResult = await call.sendDigits('1w2w3w#')
      tap.equal(
        call.id,
        sendDigitResult.id,
        'sendDigit returns the same instance'
      )

      // Resolve the send digit start promise to let the callee know
      waitForSendDigitResolve()

      // Resolve if the call has ended or ending
      const waitForParams = ['ended', 'ending', ['ending', 'ended']] as const
      const results = await Promise.all(
        waitForParams.map((params) => call.waitFor(params as any))
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
      tap.equal(call.state, 'ended', 'Outbound call state is "ended"')
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
