import tap from 'tap'
import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST || 'relay.swire.io',
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
    })

    client.on('call.received', async (call) => {
      console.log('Got call', call.id, call.from, call.to, call.direction)

      try {
        const resultAnswer = await call.answer()
        tap.ok(resultAnswer.id, 'Inboud call answered')
        tap.equal(
          call.id,
          resultAnswer.id,
          'Call answered gets the same instance'
        )

        // Play an invalid audio
        const handle = await call.playAudio({
          url: 'https://cdn.fake.com/default-music/fake.mp3',
        })

        tap.equal(
          call.id,
          handle.callId,
          'Inbound playback returns the same instance'
        )

        const waitForPlaybackFailed = new Promise((resolve) => {
          call.on('playback.failed', (playback) => {
            tap.equal(playback.state, 'error', 'Inbound playback has failed')
            resolve(true)
          })
        })
        // Wait for the inbound audio to failed
        await waitForPlaybackFailed

        // Callee hangs up a call
        await call.hangup()
      } catch (error) {
        console.error('Error', error)
        reject(4)
      }
    })

    const call = await client.dialPhone({
      to: process.env.VOICE_DIAL_TO_NUMBER as string,
      from: process.env.VOICE_DIAL_FROM_NUMBER as string,
      timeout: 30,
    })
    tap.ok(call.id, 'Call resolved')

    // Play an audio
    const handle = await call.playAudio({
      url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
    })

    tap.equal(
      call.id,
      handle.callId,
      'Outbound playback returns the same instance'
    )

    const waitForPlaybackStarted = new Promise((resolve) => {
      call.on('playback.started', (playback) => {
        tap.equal(playback.state, 'playing', 'Outbound playback has started')
        resolve(true)
      })
    })
    // Wait for the outbound audio to start
    await waitForPlaybackStarted

    const waitForPlaybackEnded = new Promise((resolve) => {
      call.on('playback.ended', (playback) => {
        tap.equal(playback.state, 'finished', 'Outbound playback has finished')
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
