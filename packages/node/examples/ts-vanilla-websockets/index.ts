import { createWebSocketClient } from '@signalwire/node'

createWebSocketClient({
  host: 'relay.swire.io',
  project: process.env.PROJECT,
  token: process.env.TOKEN as string,
})
  .then((c) => {
    c.on('session.connected', () => {
      console.log('Connected!')
    })
    c.connect().catch((e) => console.log('<Connect Error>', e))
  })
  .catch((e) => {
    console.log('<Error>', e)
  })
