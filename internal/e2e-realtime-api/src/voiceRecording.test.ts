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
      debug: {
        logWsTraffic: true,
      },
    })

    let waitForTheAnswerResolve: (value: void) => void
    const waitForTheAnswer = new Promise((resolve) => {
      waitForTheAnswerResolve = resolve
    })
    let waitForRecordStartResolve: (value: void) => void
    const waitForRecordStart = new Promise((resolve) => {
      waitForRecordStartResolve = resolve
    })
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

        try {
          // Start an inbound recording
          const recording = await call.recordAudio({ direction: 'both' })
          tap.equal(
            call.id,
            recording.callId,
            'Inbound - Recording returns the same instance'
          )

          // Play an invalid audio to fail the recording
          await call.playAudio({
            url: 'https://cdn.fake.com/default-music/fake.mp3',
          })
        } catch (error) {
          console.log('Inbound - invalid playback error')
          tap.equal(error.state, 'error', 'Inbound - Recording has failed')
        }

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

      call.on('recording.started', (recording) => {
        tap.equal(
          recording.state,
          'recording',
          'Outbound - Recording has started'
        )
        waitForRecordStartResolve()
      })

      // Start an outbound recording
      const recording = await call.recordAudio({ direction: 'both' })
      tap.equal(
        call.id,
        recording.callId,
        'Outbound - Recording returns the same instance'
      )

      // Wait for the outbound recording to start
      await waitForRecordStart

      // Play a valid audio
      const playlist = new Voice.Playlist({ volume: 2 })
        .add(
          Voice.Playlist.Audio({
            url: 'https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_100KB_MP3.mp3',
          })
        )
        .add(
          Voice.Playlist.TTS({
            text: 'Thank you, you are now disconnected from the peer',
          })
        )
      await call.play(playlist)

      call.on('recording.ended', (recording) => {
        tap.equal(recording.state, 'finished', 'Outbound - Recording has ended')
        waitForRecordEndResolve()
      })

      // Start ending the recording
      await recording.ended()

      // Wait for the outbound recording to end
      await waitForRecordEnd

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
