import { createWebSocketClient } from '@signalwire/node'

async function run() {
  try {
    const client = await createWebSocketClient({
      host: 'relay.swire.io',
      project: '<project-id>',
      token: '<project-token>',
      // autoConnect: true,
    })

    const consumer = client.video.createConsumer()

    consumer.subscribe('video.room.started', (p: any) => {
      p.subscribe('video.member.talking', () => {
        console.log('---> MEMBER TALKING!!!')
      })
      p.run()
      console.log('🟢 ROOOM STARTED 🟢')
    })

    consumer.subscribe('video.room.ended', () => {
      console.log('🔴 ROOOM ENDED 🔴')
    })

    consumer
      .run()
      .then(() => {
        console.log('Consumer running!')
      })
      .catch((e) => {
        console.log(`Consumer couldn't run`, e)
      })

    await client.connect()
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
