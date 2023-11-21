import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  type TestHandler,
  createTestRunner,
  makeSipDomainAppAddress,
} from './utils'

const getHandlers = (): TestHandler[] => {
  const cases = {
    'continuous: true and partialResults: true': {
      continuous: true,
      partialResults: true,
      hangupAfter: 16_000,
      possibleExpectedTexts: [
        '123456789 10:00 11:00 12:00',
        'one two three four five six seven eight nine ten',
        '1112',
      ],
    },
    'continuous: true and partialResults: false': {
      continuous: true,
      partialResults: false,
      hangupAfter: 16_000,
      possibleExpectedTexts: [
        '123456789 10:00 11:00 12:00',
        'one two three four five six seven eight nine ten',
        '1112',
      ],
    },
    'continuous: false and partialResults: true': {
      continuous: false,
      partialResults: true,
      hangupAfter: 16_000,
      possibleExpectedTexts: [
        '123456789 10:00 11:00 12:00',
        'one two three four five six seven eight nine ten',
        '1112',
      ],
    },
    'continuous: false and partialResults: false': {
      continuous: false,
      partialResults: false,
      hangupAfter: 16_000,
      possibleExpectedTexts: [
        '123456789 10:00 11:00 12:00',
        'one two three four five six seven eight nine ten',
        '1112',
      ],
    },
    'continuous: false and partialResults: true (hangup before palying the audio file finish)':
      {
        continuous: false,
        partialResults: true,
        hangupAfter: 5_000,
        possibleExpectedTexts: ['123', '1234'],
      },
  }

  const handlers: TestHandler[] = []
  for (let [testCase, options] of Object.entries(cases)) {
    handlers.push(({ domainApp }) => {
      return new Promise(async (resolve, reject) => {
        if (!domainApp) {
          throw new Error('Missing domainApp')
        }
        console.log(`Running collect test with ${testCase}`)
        console.log(domainApp.call_relay_context)

        const client = await SignalWire({
          host: process.env.RELAY_HOST,
          project: process.env.RELAY_PROJECT as string,
          token: process.env.RELAY_TOKEN as string,
          // logLevel: "trace",
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

        const unsub = await client.voice.listen({
          topics: [domainApp.call_relay_context],
          onCallReceived: async (call) => {
            console.log('Got call', call.id, call.from, call.to, call.direction)

            try {
              const resultAnswer = await call.answer()
              tap.ok(resultAnswer.id, 'Inbound call answered')
              tap.equal(
                call.id,
                resultAnswer.id,
                'Call answered gets the same instance'
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
                  partialResults: options.partialResults,
                  continuous: options.continuous,
                  sendStartOfInput: true,
                  listen: {
                    onStarted: () => {
                      console.log('>>> collect.started')
                    },
                    onUpdated: (_collect) => {
                      console.log('>>> collect.updated', _collect.text)
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

              // Resolve the answer promise to inform the caller
              waitForCollectStartResolve()

              // Wait until the caller ends entring the digits
              await waitForPlaybackEnd

              setTimeout(() => call.hangup(), 100)

              const collected = await callCollect.ended() // block the script until the collect ended

              tap.ok(
                options.possibleExpectedTexts.includes(collected.text!),
                'Received Correct Text'
              )
            } catch (error) {
              console.error('Error', error)
              reject(4)
            }
          },
        })

        try {
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
          tap.ok(call.id, 'Call resolved')

          // Wait until the callee answers the call and start collecting digits
          await waitForCollectStart

          call.playAudio({
            url: 'https://amaswtest.s3-accelerate.amazonaws.com/newrecording2.mp3',
          })
          await new Promise((resolve) =>
            setTimeout(resolve, options.hangupAfter)
          )

          // Inform callee that speech has completed
          waitForPlaybackEndResolve()

          const waitForParams = [
            'ended',
            'ending',
            ['ending', 'ended'],
          ] as const
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

          await unsub()

          await client.disconnect()

          resolve(0)
        } catch (error) {
          console.error('Outbound - voiceSpeechCollect error', error)
          reject(4)
        }
      })
    })
  }
  return handlers
}

async function main() {
  const handlers = getHandlers()
  for (let i = 0; i < handlers.length; i++) {
    const runner = createTestRunner({
      name: 'Voice Speech Collect E2E',
      testHandler: handlers[i],
      executionTime: 60_000,
      useDomainApp: true,
      // only exit process on success for last test case
      exitOnSuccess: i + 1 == handlers.length,
    })

    await runner.run()
    // delay 20 sec between each test case so file server hosting the mp3 file won't trigger rate limit
    await new Promise((resolve) => setTimeout(resolve, 20_000))
  }
}

main()
