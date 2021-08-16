import { createWebSocketClient } from '@signalwire/node'

async function run() {
  try {
    const client = await createWebSocketClient({
      host: 'relay.swire.io',
      project: '<project-id>',
      token: '<project-token>',
      // TODO: this shouldn't be an option since we need to handle
      // .on() calls
      // autoConnect: true,
    })

    client.video.on('video.room.started', (room: any) => {
      room.on('video.member.talking', () => {
        console.log('---> MEMBER TALKING!!!')
      })

      room.on('video.member.joined', (payload: any) => {
        console.log('---> video.member.joined', payload)
      })

      room.run()

      // TODO: remove this once we figure out why this is happening.
      // Note: This returns empty member list
      // room.getMembers().then((payload: any) => {
      //   console.log('---> Members', JSON.stringify(payload, null, 2))
      // })

      // Note: This returns the proper list
      // setTimeout(() => {
      //   room.getMembers().then((payload: any) => {
      //     console.log('---> Members', JSON.stringify(payload, null, 2))
      //   })
      // }, 3000)

      console.log('🟢 ROOOM STARTED 🟢')
    })

    client.video.on('video.room.ended', () => {
      console.log('🔴 ROOOM ENDED 🔴')
    })

    await client.connect()
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
