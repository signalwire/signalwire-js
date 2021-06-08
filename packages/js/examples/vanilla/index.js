import { JWTSession } from '@signalwire/js'

window._makeClient = ({ token }) => {
  const client = new JWTSession({
    host: 'relay.swire.io',
    token,
  })

  client.connect()

  window.__client = client
  return client
}
