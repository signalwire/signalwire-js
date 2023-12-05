import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  type TestHandler,
  createTestRunner,
  makeSipDomainAppAddress,
  CALL_RECORD_PROPS,
  CALL_PROPS,
} from '../utils'

const handler: TestHandler = ({ domainApp }) => {
  if (!domainApp) {
    throw new Error('Missing domainApp')
  }

  return new Promise<number>(async (resolve, reject) => {
    try {
      const client = await SignalWire({
        host: process.env.RELAY_HOST || 'relay.swire.io',
        project: process.env.RELAY_PROJECT as string,
        token: process.env.RELAY_TOKEN as string,
        debug: {
          logWsTraffic: true,
        },
      })

      const unsubVoice = await client.voice.listen({
        topics: [domainApp.call_relay_context],
        onCallReceived: async (call) => {
          try {
            const resultAnswer = await call.answer()
            tap.hasProps(call, CALL_PROPS, 'Inbound - Call answered')
            tap.equal(
              call.id,
              resultAnswer.id,
              'Inbound - Call answered gets the same instance'
            )

            const record = await call
              .recordAudio({
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
              .onStarted()
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

      const call = await client.voice.dialSip({
        to: makeSipDomainAppAddress({
          name: 'to',
          domain: domainApp.domain,
        }),
        from: makeSipDomainAppAddress({
          name: 'from',
          domain: domainApp.domain,
        }),
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

      const record = await call
        .recordAudio({
          terminators: '*',
        })
        .onStarted()

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
    useDomainApp: true,
  })

  await runner.run()
}

main()
