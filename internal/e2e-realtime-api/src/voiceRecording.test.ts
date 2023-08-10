import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const CALL_RECORDING_GETTERS = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'state',
  'url',
  'size',
  'duration',
  'record',
]
const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    // Expect exact num of tests
    tap.plan(CALL_RECORDING_GETTERS.length + 9)

    const client = new Voice.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
      debug: {
        logWsTraffic: true,
      },
    })

    let waitForTheAnswerResolve: (value: void) => void
    const waitForTheAnswer = new Promise((resolve) => {
      waitForTheAnswerResolve = resolve
    })
    // let waitForRecordStartResolve: (value: void) => void
    // const waitForRecordStart = new Promise((resolve) => {
    //   waitForRecordStartResolve = resolve
    // })
    let waitForRecordEndResolve: (value: void) => void
    const waitForRecordEnd = new Promise((resolve) => {
      waitForRecordEndResolve = resolve
    })

    client.on('call.received', async (call) => {
      console.log(
        'Inbound - Got call',
        call.id,
        call.from,
        call.to,
        call.direction
      )

      try {
        const resultAnswer = await call.answer()
        tap.ok(resultAnswer.id, 'Inbound - Call answered')
        tap.equal(
          call.id,
          resultAnswer.id,
          'Inbound - Call answered gets the same instance'
        )

        // Resolve the answer promise to inform the caller
        waitForTheAnswerResolve()

        call.on('recording.ended', (recording) => {
          // console.log('HERE', recording)
          CALL_RECORDING_GETTERS.forEach((property) => {
            tap.hasProp(recording, property)
          })
          tap.equal(
            recording.state,
            'no_input',
            'Outbound - Recording has ended'
          )
          tap.equal(
            recording.callId,
            call.id,
            'Outbound - Recording has the same callId'
          )
          waitForRecordEndResolve()
        })

        // Start the recording
        const recording = await call.recordAudio({
          // initialTimeout: 0,
          // endSilenceTimeout: 0,
          direction: 'both',
          terminators: '#',
        })
        tap.equal(
          call.id,
          recording.callId,
          'Inbound - Recording returns the same instance'
        )

        const playback = await call.playTTS({
          text: 'Hello, this is the callee side. How can i help you?',
        })

        await playback.ended()

        // Stop the recording using terminator
        await call.sendDigits('#')

        // Wait for the outbound recording to end
        await waitForRecordEnd

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        console.error('Inbound - Error', error)
        reject(4)
      }
    })

    try {
      // Make an outbound call
      const call = await client.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      // Wait until callee answers the call
      await waitForTheAnswer

      // Play a valid audio
      const playlist = new Voice.Playlist({ volume: 2 })
        .add(
          Voice.Playlist.TTS({
            text: 'Hello, this is an automated welcome message. Enjoy!',
          })
        )
        .add(
          Voice.Playlist.TTS({
            text: 'Thank you for listening the welcome message.',
          })
        )
      const playback = await call.play(playlist)

      await playback.ended()

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

      resolve(0)
    } catch (error) {
      console.error('Outbound - voiceRecording error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Recording E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
