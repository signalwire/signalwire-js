import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
    })

    let waitForDetectStartResolve
    const waitForDetectStart = new Promise((resolve) => {
      waitForDetectStartResolve = resolve
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

        // Wait until caller starts detecting digit
        await waitForDetectStart

        // Simulate human with TTS to then expect the detector to detect an `HUMAN`
        const playlist = new Voice.Playlist()
          .add(
            Voice.Playlist.TTS({
              text: 'Hello?',
            })
          )
          .add(Voice.Playlist.Silence({ duration: 1 }))
          .add(
            Voice.Playlist.TTS({
              text: 'Joe here, how can i help you?',
            })
          )
        const playback = await call.play(playlist)
        tap.equal(
          call.id,
          playback.callId,
          'Inbound - playTTS returns the same instance'
        )
        await playback.ended()
      } catch (error) {
        console.error('Inbound - Error', error)
        reject(4)
      }
    })

    try {
      const call = await client.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      // Start the detector
      const detector = await call.amd()
      tap.equal(
        call.id,
        detector.callId,
        'Outbound - Detect returns the same instance'
      )

      // Resolve the detect start promise to inform the callee
      waitForDetectStartResolve()

      // Wait the callee to start saying something..
      await detector.ended()
      tap.equal(detector.type, 'machine', 'Outbound - Received the digit')
      tap.equal(detector.result, 'HUMAN', 'Outbound - detected human')

      // Caller hangs up a call
      await call.hangup()

      resolve(0)
    } catch (error) {
      console.error('Outbound - voiceDetect error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Detect E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
