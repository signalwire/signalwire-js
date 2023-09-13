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

        try {
          // Play an invalid audio
          const handle = call.playAudio({
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
          await handle
        } catch (error) {
          console.log('Inbound - invalid playback error')
          tap.equal(
            call.id,
            error.callId,
            'Inbound - playback returns the same instance'
          )
        }

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        console.error('Inbound - Error', error)
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

      // Play an audio
      const handle = call.playAudio({
        url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
      })

      const waitForPlaybackStarted = new Promise((resolve) => {
        call.on('playback.started', (playback) => {
          tap.equal(
            playback.state,
            'playing',
            'Outbound - Playback has started'
          )
          resolve(true)
        })
      })
      // Wait for the outbound audio to start
      await waitForPlaybackStarted

      // Resolve late so that we attach `playback.started` and wait for it
      const resolvedHandle = await handle

      tap.equal(
        call.id,
        resolvedHandle.callId,
        'Outbound - Playback returns the same instance'
      )

      const waitForPlaybackEnded = new Promise((resolve) => {
        call.on('playback.ended', (playback) => {
          tap.equal(
            playback.state,
            'finished',
            'Outbound - Playback has finished'
          )
          resolve(true)
        })
      })
      // Wait for the outbound audio to end (callee hung up the call or audio ended)
      await waitForPlaybackEnded

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
      console.error('Outbound - voicePlayback error', error)
      reject(4)
    }
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice Playback E2E',
    testHandler: handler,
    executionTime: 60_000,
    useDomainApp: true,
  })

  await runner.run()
}

main()
