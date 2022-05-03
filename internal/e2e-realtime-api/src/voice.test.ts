import { Voice } from '@signalwire/realtime-api'
import { createTestRunner } from './utils'

const sleep = (ms = 3000) => {
  return new Promise((r) => {
    setTimeout(r, ms)
  })
}

const handler = () => {
  return new Promise<number>(async (resolve, reject) => {
    const client = new Voice.Client({
      host: process.env.VOICE_HOST || 'relay.swire.io',
      project: process.env.VOICE_PROJECT as string,
      token: process.env.VOICE_TOKEN as string,
      contexts: [process.env.VOICE_CONTEXT as string],
      debug: {
        logWsTraffic: true,
      },
    })

    client.on('call.received', async (call) => {
      console.log('Got call', call.id, call.from, call.to, call.direction)

      try {
        await call.answer()
        console.log('Inbound call answered')

        // const recording = await call.recordAudio()
        // console.log('Recording STARTED!', recording.id)

        // const playlist = new Voice.Playlist({ volume: 2 }).add(
        //   Voice.Playlist.TTS({
        //     text: 'Message is getting recorded',
        //   })
        // )
        // const playback = await call.play(playlist)
        // console.log('Playback', playback.id)

        // console.log('Waiting for Playback to end')
        // // TODO: waitForEnded should probably accept a timeout
        // await playback.waitForEnded()
        // console.log('Playback ended')

        call.on('prompt.started', (p) => {
          console.log('>> prompt.started', p.id)
        })

        const prompt = await call.prompt({
          media: [
            {
              type: 'tts',
              text: 'Welcome to SignalWire! Please enter your 4 digits PIN',
            },
          ],
          volume: 1.0,
          digits: {
            max: 4,
            digitTimeout: 100,
            terminators: '#',
          },
        })
        console.log('> prompt.id', prompt.id)

        call.on('prompt.updated', (p) => {
          console.log('>> prompt.updated', p.id)
        })
        call.on('prompt.failed', (p) => {
          console.log('>> prompt.failed', p.id, p.reason)
        })
        call.on('prompt.ended', (p) => {
          console.log(
            '>> prompt.ended',
            p.id,
            p.type,
            'Digits: ',
            p.digits,
            'Terminator',
            p.terminator
          )
        })

        const result = await prompt.waitForResult()

        console.log(
          '---------> RESULT',
          result.digits,
          result.confidence,
          result.terminator,
          result.text,
          result.id
        )

        console.log('Finishing the call.')
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

    console.log('sleeping')
    await sleep(3000)
    console.log('Call resolved', call.id)

    console.log('sending digits')
    await call.sendDigits('123#')

    await Promise.all([
      call.waitFor('ended'),
      call.waitFor('ending'),
      call.waitFor(['ending', 'ended']),
    ])
    resolve(0)
  })
}

async function main() {
  const runner = createTestRunner({
    name: 'Voice E2E',
    testHandler: handler,
    executionTime: 30_000,
  })

  await runner.run()
}

main()
