import { createWebSocketClient } from '@signalwire/node'

createWebSocketClient({
  host: 'relay.swire.io',
  project: '<project-id>',
  token: '<project-token>',
  autoConnect: true,
})
  .then((c) => {
    const consumer = c.video.createConsumer()

    consumer.subscribe('room.started', () => {
      console.log('🟢 ROOOM STARTED 🟢')
    })

    consumer.subscribe('room.ended', () => {
      console.log('🔴 ROOOM ENDED 🔴')
    })

    consumer.run()
  })
  .catch((e) => {
    console.log('<Error>', e)
  })
