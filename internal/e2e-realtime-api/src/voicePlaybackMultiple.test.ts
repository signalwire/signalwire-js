import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import {
  type TestHandler,
  createTestRunner,
  makeSipDomainAppAddress,
} from './utils'

const handler: TestHandler = ({ domainApp }) => {
  if (!domainApp) {
    throw new Error('Missing domainApp')
  }
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      topics: [domainApp.call_relay_context],
      debug: {
        logWsTraffic: true,
      },
    })

    let waitForOutboundPlaybackStartResolve
    const waitForOutboundPlaybackStart = new Promise((resolve) => {
      waitForOutboundPlaybackStartResolve = resolve
    })
    let waitForOutboundPlaybackEndResolve
    const waitForOutboundPlaybackEnd = new Promise((resolve) => {
      waitForOutboundPlaybackEndResolve = resolve
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
        const earlyMedia = await call.playTTS({
          text: 'This is early media. I repeat: This is early media.',
        })
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

        try {
          // Play an invalid audio
          const fakePlay = call.playAudio({
            url: 'https://cdn.fake.com/default-music/fake.mp3',
          })

          const waitForPlaybackFailed = new Promise((resolve) => {
            call.on('playback.failed', (playback) => {
              tap.equal(
                playback.state,
                'error',
                'Inbound - playback has failed'
              )
              resolve(true)
            })
          })
          // Wait for the inbound audio to failed
          await waitForPlaybackFailed

          // Resolve late so that we attach `playback.failed` and wait for it
          await fakePlay
        } catch (error) {
          tap.equal(
            call.id,
            error.callId,
            'Inbound - fakePlay returns the same instance'
          )
        }

        const playback = await call.playTTS({
          text: 'Random TTS message while the call is up. Thanks and good bye!',
        })
        tap.equal(
          call.id,
          playback.callId,
          'Inbound - playback returns the same instance'
        )
        await playback.ended()

        tap.equal(
          playback.state,
          'finished',
          'Inbound - playback state is finished'
        )

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        reject(4)
      }
    })

    try {
      const call = await client.dialSip({
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
      })
      tap.ok(call.id, 'Outbound - Call resolved')

      call.on('playback.started', (playback) => {
        tap.equal(playback.state, 'playing', 'Outbound - Playback has started')
        waitForOutboundPlaybackStartResolve()
      })

      call.on('playback.ended', (playback) => {
        tap.equal(
          playback.state,
          'finished',
          'Outbound - Playback has finished'
        )
        waitForOutboundPlaybackEndResolve()
      })

      // Play an audio
      const playAudio = await call.playAudio({
        url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
      })
      tap.equal(
        call.id,
        playAudio.callId,
        'Outbound - Playback returns the same instance'
      )

      // Wait for the outbound audio to start
      await waitForOutboundPlaybackStart

      // Wait for the outbound audio to end (callee hung up the call or audio ended)
      await waitForOutboundPlaybackEnd

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
      console.error('Outbound - voicePlaybackMultiple error', error)
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
