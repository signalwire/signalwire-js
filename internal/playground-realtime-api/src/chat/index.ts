import { Chat } from '@signalwire/realtime-api'

async function run() {
  try {
    const chat = new Chat.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    chat.on('member.joined', (member) => {
      console.log('member --->', member)
    })

    await chat.subscribe(['lobby'])

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
