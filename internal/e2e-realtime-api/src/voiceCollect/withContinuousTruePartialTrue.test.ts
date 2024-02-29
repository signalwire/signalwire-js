import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  createTestRunner,
  CALL_PROPS,
  TestHandler,
  makeSipDomainAppAddress,
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

      let waitForCollectStartResolve
      const waitForCollectStart = new Promise((resolve) => {
        waitForCollectStartResolve = resolve
      })

      let waitForPlaybackEndResolve
      const waitForPlaybackEnd = new Promise((resolve) => {
        waitForPlaybackEndResolve = resolve
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

            const callCollect = await call
              .collect({
                initialTimeout: 10.0,
                speech: {
                  endSilenceTimeout: 2.0,
                  speechTimeout: 20.0,
                  language: 'en-US',
                  model: 'enhanced.phone_call',
                },
                partialResults: true,
                continuous: true,
                sendStartOfInput: true,
                listen: {
                  onStarted: () => {
                    console.log('>>> collect.started')
                  },
                  onUpdated: (_collect) => {
                    console.log('>>> collect.updated: [', _collect.text, '] - confidence: [', _collect.confidence, ']')

                    /* With 'continuous' true, we may have 'final' true to indicate
                     * a portion of speech has been correctly collected and this
                     * part of collection has completed. We want to check even if the
                     * overall collect has not ended yet.
                     */
                    if (_collect.final === true) {
                      const collected_cleaned = _collect.text!.trim().replace(/\s+/g, '');
                      console.log(">>> collected update cleaned: [", collected_cleaned, "]")
                      const intermediate_result = '12345678910'

                      tap.ok(
                        collected_cleaned == intermediate_result,
                        'Received Correct Updated Text'
                      )
                    }
                  },
                  onEnded: (_collect) => {
                    console.log('>>> collect.ended', _collect.text)
                  },
                  onFailed: (_collect) => {
                    console.log('>>> collect.failed', _collect.reason)
                  },
                },
              })
              .onStarted()

            // Inform caller that collect has started
            waitForCollectStartResolve()

            // Wait until the caller ends sending the speech
            await waitForPlaybackEnd

            // FIXME: Failing due to server side issue
            // With continuous true, the collect will never stop, user needs to stop it using this function
            // await callCollect.stop()

            setTimeout(() => call.hangup(), 100)

            const collected = await callCollect.ended()
            console.log('>>> collect.ended: [', collected.text, '] - confidence: [', collected.confidence, ']')

            const collected_cleaned = collected.text!.trim().replace(/\s+/g, '')
            console.log(">>> collected cleaned: [", collected_cleaned, "]")
            // Seen values: '11 12', '1112', '11121112'. '11 12th'
            const final_expected: string = '1112'

            tap.ok(
              collected_cleaned.includes(final_expected),
              'Received Correct Final Text'
            )

            // await call.hangup()
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
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      // Wait until the callee starts collecting speech
      await waitForCollectStart

      await call.playAudio({
        url: 'https://files.swire.io/e2e/1-12-counting.mp3',
      })

      // Inform callee that speech has completed
      waitForPlaybackEndResolve()

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

      await unsubVoice()

      await client.disconnect()

      resolve(0)
    } catch (error) {
      console.error('voiceCollect/withContinuousTruePartialTrue error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Collect with Continuous true & Partial true',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
