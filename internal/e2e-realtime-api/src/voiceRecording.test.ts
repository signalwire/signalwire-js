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

        await sleep(10000)

        // Send digit # to terminate the recording
        const sendDigitResult = await call.sendDigits('#')
        tap.equal(
          call.id,
          sendDigitResult.id,
          'Inbound - sendDigit returns the same instance'
        )

        await sleep(5000)

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

        const waitForRecordingFailed = new Promise((resolve) => {
          call.on('recording.failed', (recording) => {
            tap.equal(
              recording.state,
              'no_input',
              'Inbound - Recording has failed'
            )
            resolve(true)
          })
        })
        // Wait for the outbound recording to start
        await waitForRecordingFailed

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        console.error('Inbound - Error', error)
        reject(4)
      }
    })

    const call = await client.dialPhone({
      to: process.env.VOICE_DIAL_TO_NUMBER as string,
      from: process.env.VOICE_DIAL_FROM_NUMBER as string,
      timeout: 30,
    })
    tap.ok(call.id, 'Outbound - Call resolved')

    // Start an outbound recording
    const recording = await call.recordAudio({ direction: 'both' })

    tap.equal(
      call.id,
      recording.callId,
      'Outbound - Recording returns the same instance'
    )

    const waitForRecordingStarted = new Promise((resolve) => {
      call.on('recording.started', (recording) => {
        tap.equal(
          recording.state,
          'recording',
          'Outbound - Recording has started'
        )
        resolve(true)
      })
    })
    // Wait for the outbound recording to start
    await waitForRecordingStarted

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
    const playback = await call.play(playlist)

    await playback.ended()

    const waitForRecordingEnded = new Promise((resolve) => {
      call.on('recording.ended', (recording) => {
        tap.equal(recording.state, 'finished', 'Outbound - Recording has ended')
        resolve(true)
      })
    })
    // Wait for the outbound recording to end
    await waitForRecordingEnded

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
    name: 'Voice Recording E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
