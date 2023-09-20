import { SignalWire } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
      // logLevel: 'trace',
      debug: {
        logWsTraffic: true,
      },
    })

    await client.voice.listen({
      topics: [process.env.RELAY_CONTEXT as string],
      onCallReceived: async (call) => {
        console.log('Got call', call.id, call.from, call.to, call.direction)

        try {
          await call.answer()
          console.log('Inbound call answered')

          const pb = await call.playTTS({
            text: "Hello! Welcome to Knee Rub's Weather Helpline. What place would you like to know the weather of?",
            gender: 'male',
          })
          console.log('Welcome text ok')

          const prompt = await call.promptTTS({
            text: 'Please enter 1 for Washington, 2 for California, 3 for washington weather message, 4 for california weather message, 5 if your tribe beeds to do a rain dance, 6 for me to call your friends who need to rain dance.',
            digits: {
              max: 1,
              digitTimeout: 15,
            },
          })
          const { type, digits, terminator } = prompt
          console.log('Received digits', type, digits, terminator)
        } catch (error) {
          console.error('Error answering inbound call', error)
        }
      },
    })
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
