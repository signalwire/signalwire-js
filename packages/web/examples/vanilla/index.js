import { JWTSession } from '@signalwire/web'

window._makeClient = ({ token }) => {
  const client = new JWTSession({
    host: 'relay.swire.io',
    token,
  })

  client.connect()

  window.__client = client
  return client
}
