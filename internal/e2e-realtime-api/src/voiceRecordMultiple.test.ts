import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import { CALL_RECORD_PROPS, CALL_PROPS, createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    try {
      const client = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
        debug: {
          // logWsTraffic: true,
        },
      })

      tap.plan(13)

      const unsubVoice = await client.voice.listen({
        topics: ['office'],
        onCallReceived: async (call) => {
          try {
            const resultAnswer = await call.answer()
            tap.hasProps(call, CALL_PROPS, 'Inbound - Call answered')
            tap.equal(
              call.id,
              resultAnswer.id,
              'Inbound - Call answered gets the same instance'
            )

            const record = await call.recordAudio({
              terminators: '#',
              listen: {
                async onFailed(recording) {
                  tap.hasProps(
                    recording,
                    CALL_RECORD_PROPS,
                    'Inbound - Recording failed'
                  )
                  tap.equal(
                    recording.state,
                    'no_input',
                    'Recording correct state'
                  )
                },
              },
            })
            tap.equal(
              call.id,
              record.callId,
              'Inbound - Record returns the same call instance'
            )

            await call.sendDigits('#')

            await record.ended()

            await call.hangup()
          } catch (error) {
            console.error('Error answering inbound call', error)
          }
        },
      })

      const call = await client.voice.dialPhone({
        to: process.env.VOICE_DIAL_TO_NUMBER as string,
        from: process.env.VOICE_DIAL_FROM_NUMBER as string,
        timeout: 30,
        listen: {
          onRecordingStarted: (playback) => {
            tap.hasProps(
              playback,
              CALL_RECORD_PROPS,
              'Outbound - Recording started'
            )
            tap.equal(playback.state, 'recording', 'Recording correct state')
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const record = await call.recordAudio({
        terminators: '*',
      })
      tap.equal(
        call.id,
        record.callId,
        'Outbound - Recording returns the same call instance'
      )

      await call.sendDigits('*')

      await record.ended()
      tap.match(
        record.state,
        /finished|no_input/,
        'Outbound - Recording state is "finished"'
      )

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
      console.error('VoiceRecordMultiple error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Recording multiple E2E',
    testHandler: handler,
    executionTime: 60_000,
  })

  await runner.run()
}

main()
