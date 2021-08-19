import { createWebSocketClient } from '@signalwire/node'

async function run() {
  try {
    const client = await createWebSocketClient({
      host: 'relay.swire.io',
      project: '<project-id>',
      token: '<project-token>',
    })

    client.video.on('room.started', (room) => {
      room.on('member.talking', () => {
        console.log('---> MEMBER TALKING!!!')
      })

      room.on('member.joined', (payload) => {
        console.log('---> member.joined', payload)
      })

      room.run()

      console.log('🟢 ROOOM STARTED 🟢')
    })

    client.video.on('room.ended', () => {
      console.log('🔴 ROOOM ENDED 🔴')
    })

    await client.connect()
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
