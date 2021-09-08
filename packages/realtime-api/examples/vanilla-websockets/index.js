const { createClient } = require('@signalwire/realtime-api')

const client = createClient({
  host: 'relay.swire.io',
  project: '<project-id>',
  token: '<project-token>',
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
