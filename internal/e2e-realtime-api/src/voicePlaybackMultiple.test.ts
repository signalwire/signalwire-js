import tap from 'tap'
import { SignalWire } from '@signalwire/realtime-api'
import {
  type TestHandler,
  createTestRunner,
  makeSipDomainAppAddress,
  CALL_PLAYBACK_PROPS,
} from './utils'

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
          // logWsTraffic: true,
        },
      })

      let inboundCalls = 0
      let startedPlaybacks = 0
      let failedPlaybacks = 0
      let endedPlaybacks = 0

      const unsubVoice = await client.voice.listen({
        topics: [domainApp.call_relay_context, 'home'],
        onCallReceived: async (call) => {
          try {
            inboundCalls++

            // Since we are running an early media before answering the call
            // The server will keep sending the call.receive event unless we answer or pass it.
            if (inboundCalls > 1) {
              await call.pass()
              return
            }

            const unsubCall = await call.listen({
              onPlaybackStarted: () => {
                startedPlaybacks++
              },
              onPlaybackFailed: () => {
                failedPlaybacks++
              },
              onPlaybackEnded: () => {
                endedPlaybacks++
              },
            })

            const earlyMedia = await call
              .playTTS({
                text: 'This is early media. I repeat: This is early media.',
                listen: {
                  onStarted: (playback) => {
                    tap.hasProps(
                      playback,
                      CALL_PLAYBACK_PROPS,
                      'Inbound - Playback started'
                    )
                    tap.equal(
                      playback.state,
                      'playing',
                      'Playback correct state'
                    )
                  },
                },
              })
              .onStarted()
            tap.equal(
              call.id,
              earlyMedia.callId,
              'Inbound - earlyMedia returns the same instance'
            )

            await earlyMedia.ended()
            tap.equal(
              earlyMedia.state,
              'finished',
              'Inbound - earlyMedia state is finished'
            )

            const resultAnswer = await call.answer()
            tap.ok(resultAnswer.id, 'Inbound - Call answered')
            tap.equal(
              call.id,
              resultAnswer.id,
              'Inbound - Call answered gets the same instance'
            )

            // Play an invalid audio
            const fakeAudio = await call
              .playAudio({
                url: 'https://cdn.fake.com/default-music/fake.mp3',
                listen: {
                  onFailed: (playback) => {
                    tap.hasProps(
                      playback,
                      CALL_PLAYBACK_PROPS,
                      'Inbound - fakeAudio playback failed'
                    )
                    tap.equal(playback.state, 'error', 'Playback correct state')
                  },
                },
              })
              .onStarted()

            await fakeAudio.ended()

            const playback = await call
              .playTTS({
                text: 'Random TTS message while the call is up. Thanks and good bye!',
                listen: {
                  onEnded: (playback) => {
                    tap.hasProps(
                      playback,
                      CALL_PLAYBACK_PROPS,
                      'Inbound - Playback ended'
                    )
                    tap.equal(
                      playback.state,
                      'finished',
                      'Playback correct state'
                    )
                  },
                },
              })
              .onStarted()
            await playback.ended()

            tap.equal(startedPlaybacks, 3, 'Inbound - Started playback count')
            tap.equal(failedPlaybacks, 1, 'Inbound - Started failed count')
            tap.equal(endedPlaybacks, 2, 'Inbound - Started ended count')

            await unsubCall()

            // Callee hangs up a call
            await call.hangup()
          } catch (error) {
            console.error('Error inbound call', error)
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
        maxPricePerMinute: 10,
        listen: {
          onPlaybackStarted: (playback) => {
            tap.hasProps(
              playback,
              CALL_PLAYBACK_PROPS,
              'Outbound - Playback started'
            )
            tap.equal(playback.state, 'playing', 'Playback correct state')
          },
        },
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      const playAudio = await call
        .playAudio({
          url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
          listen: {
            onEnded: (playback) => {
              tap.hasProps(
                playback,
                CALL_PLAYBACK_PROPS,
                'Outbound - Playback ended'
              )
              tap.equal(playback.state, 'finished', 'Playback correct state')
            },
          },
        })
        .onStarted()
      tap.equal(
        call.id,
        playAudio.callId,
        'Outbound - Playback returns the same instance'
      )

      await unsubVoice()

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

      await client.disconnect()

      resolve(0)
    } catch (error) {
      console.error('VoicePlaybackMultiple error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Playback multiple E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
