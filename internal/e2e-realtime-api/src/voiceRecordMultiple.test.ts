import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner, sleep } from './utils'
import { VoiceCallRecordingContract } from '@signalwire/core'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
    })

    let waitForTheAnswerResolve: (value: void) => void
    const waitForTheAnswer = new Promise((resolve) => {
      waitForTheAnswerResolve = resolve
    })

    let waitForOutboundRecordResolve: any
    const waitForOutboundRecord = new Promise((resolve) => {
      waitForOutboundRecordResolve = resolve
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

        // Resolve the answer promise to let the caller know
        waitForTheAnswerResolve()

        const firstRecording = await call.recordAudio({ terminators: '#' })
        tap.equal(
          call.id,
          firstRecording.callId,
          'Inbound - firstRecording returns the same instance'
        )
        tap.equal(
          firstRecording.state,
          'recording',
          'Inbound - firstRecording state is "recording"'
        )

        await call.sendDigits('#')

        await firstRecording.ended()

        tap.match(
          firstRecording.state,
          /finished|no_input/,
          'Inbound - firstRecording state is "finished"'
        )

        // Wait until caller's recording (secondRecording) ends
        await waitForOutboundRecord

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        reject(4)
      }
    })

    const call = await client.dialPhone({
      to: process.env.VOICE_DIAL_TO_NUMBER as string,
      from: process.env.VOICE_DIAL_FROM_NUMBER as string,
      timeout: 30,
    })
    tap.ok(call.id, 'Outbound - Call resolved')

    // Wait until callee answers the call
    await waitForTheAnswer

    const secondRecording = await call.recordAudio({ terminators: '*' })
    tap.equal(
      call.id,
      secondRecording.callId,
      'Outbound - secondRecording returns the same instance'
    )
    tap.equal(
      secondRecording.state,
      'recording',
      'Outbound - secondRecording state is "recording"'
    )

    await call.sendDigits('*')

    await secondRecording.ended()

    tap.match(
      secondRecording.state,
      /finished|no_input/,
      'Outbound - secondRecording state is "finished"'
    )

    // Resolve the recording promise to let the callee know
    waitForOutboundRecordResolve()

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
    name: 'Voice Playback E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
