import { SignalWire, Voice } from '@signalwire/realtime-api'

async function run() {
  let maxDTMFErrors = 1
  let errorCount = 0
  const invalidDTMFs = ['0', '1', '2', '3']

  const client = await SignalWire({
    project: process.env.PROJECT as string,
    token: process.env.TOKEN as string,
    // logLevel: 'debug',
    // debug: {
    //   logWsTraffic: true,
    // },
  })

  async function prompt(call: Voice.Call, tts?: string) {
    const prompt = await call.promptTTS({
      text: tts ?? 'Welcome! Wanna play a game??',
      digits: {
        max: 1,
        digitTimeout: 5,
      },
    })
    const { type, digits } = prompt
    return [type, digits]
  }

  async function checkPromptResult(
    call: Voice.Call,
    type?: string,
    digits?: string
  ) {
    console.log(`checkPromptResult: ${type} ${digits}`, errorCount)
    console.log('errorCount:', errorCount)

    if (invalidDTMFs.includes(digits as string) || type == 'no_input') {
      if (errorCount < maxDTMFErrors) {
        errorCount++
        const attempt = await prompt(call, 'Invalid DTMF - Try again!')
        await checkPromptResult(call, attempt[0], attempt[1])
      } else {
        const playback = await call.playTTS({
          text: 'You have run out of attempts. Goodbye',
        })
        await call.hangup()
      }
    } else {
      const playback = await call.playTTS({
        text: 'Good choice! Goodbye and thanks',
      })
      await call.hangup()
    }
  }

  try {
    const call = await client.voice.dialPhone({
      to: '+1..',
      from: process.env.FROM_NUMBER as string,
      listen: {
        onStateChanged: (call) => {
          console.log(`call.state ${call.state}`)
        },
      },
    })

    const result = await prompt(call)
    await checkPromptResult(call, result[0], result[1])
  } catch (error) {
    console.error('Error answering call:', error)
    return
  }
}

run()
