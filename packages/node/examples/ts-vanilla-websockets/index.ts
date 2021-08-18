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

    // @ts-ignore
    client.video.on('room.started', (room) => {
      room.on('member.talking', () => {
        console.log('---> MEMBER TALKING!!!')
      })

      room.on('member.joined', (payload: any) => {
        console.log('---> member.joined', payload)
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

    // @ts-ignore
    client.video.on('room.ended', () => {
      console.log('🔴 ROOOM ENDED 🔴')
    })

    await client.connect()
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
