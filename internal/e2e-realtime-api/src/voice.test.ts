import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const sleep = (ms = 3000) => {
  return new Promise((r) => {
    setTimeout(r, ms)
  })
}

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
        const resultAnswer = await call.answer()
        tap.ok(resultAnswer.id, 'Inboud call answered')
        tap.equal(
          call.id,
          resultAnswer.id,
          'Call answered gets the same instance'
        )

        if (callsReceived.size === 2) {
          await sleep()
          console.log(`Sending digits from call: ${call.id}`)
          await call.sendDigits('1#')
          return
        }

        const recording = await call.recordAudio()
        tap.ok(recording.id, 'Recording started')

        const playlist = new Voice.Playlist({ volume: 2 }).add(
          Voice.Playlist.TTS({
            text: 'Message is getting recorded',
          })
        )
        const playback = await call.play(playlist)
        tap.ok(playback.id, 'Playback')

        console.log('Waiting for Playback to end')
        await playback.ended()
        tap.pass('Playback ended')

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

        const result = await prompt.ended()

        tap.equal(prompt.id, result.id, 'Instances are the same')
        tap.equal(result.digits, '123', 'Correct Digits were entered')

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
        })

        console.log('Peer:', peer.id, peer.type, peer.from, peer.to)
        console.log('Main:', call.id, call.type, call.from, call.to)

        const detector = await call.detectDigit({
          digits: '1',
        })

        const resultDetector = await detector.ended()

        // TODO: update this once the backend can send us
        // the actual result
        tap.equal(
          // @ts-expect-error
          resultDetector.detect.params.event,
          'finished',
          'Detect digit is finished'
        )

        // TODO: not currently working
        // console.log('Stopping the recording.')
        // recording.stop()
        // await recording.ended()

        console.log('Finishing the calls.')
        await peer.hangup()
        await call.hangup()
      } catch (error) {
        console.error('Error', error)
        reject(4)
      }
    })

    const call = await client.dialPhone({
      to: process.env.VOICE_DIAL_TO_NUMBER as string,
      from: process.env.VOICE_DIAL_FROM_NUMBER as string,
      timeout: 30,
    })
    tap.ok(call.id, 'Call resolved')

    await sleep(3000)

    const sendDigitResult = await call.sendDigits('1w2w3w#')
    tap.equal(
      call.id,
      sendDigitResult.id,
      'sendDigit returns the same instance'
    )

    const waitForParams = ['ended', 'ending', ['ending', 'ended']] as const
    const results = await Promise.all(
      waitForParams.map((params) => call.waitFor(params as any))
    )
    waitForParams.forEach((value, i) => {
      if (typeof value === 'string') {
        tap.ok(results[i], `"${value}": completed successfully.`)
      } else {
        tap.ok(results[i], `${JSON.stringify(value)}: completed successfully.`)
      }
    })
    resolve(0)
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
