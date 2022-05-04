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
      host: process.env.VOICE_HOST || 'relay.swire.io',
      project: process.env.VOICE_PROJECT as string,
      token: process.env.VOICE_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
      // debug: {
      //   logWsTraffic: true,
      // },
    })

    client.on('call.received', async (call) => {
      console.log('Got call', call.id, call.from, call.to, call.direction)

      try {
        const resultAnswer = await call.answer()
        tap.ok(resultAnswer.id, 'Inboud call answered')
        tap.equal(
          call.id,
          resultAnswer.id,
          'Call answered gets the same instance'
        )

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
        // TODO: waitForEnded should probably accept a timeout
        await playback.waitForEnded()
        tap.pass('Playback ended')

        call.on('prompt.started', (p) => {
          tap.ok(p.id, 'Prompt has started')
        })
        call.on('prompt.ended', (p) => {
          tap.ok(p.id, 'Prompt has ended')
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
            digitTimeout: 100,
            terminators: '#',
          },
        })

        const result = await prompt.waitForResult()

        tap.equal(prompt.id, result.id, 'Instances are the same')
        tap.equal(result.digits, '123', 'Correct Digits were entered')

        console.log('Finishing the call.')
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
    executionTime: 30_000,
  })

  await runner.run()
}

main()
