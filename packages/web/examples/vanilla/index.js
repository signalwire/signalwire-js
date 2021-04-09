import { JWTSession } from "@signalwire/web";

window._makeClient = ({ project, token }) => {
  const client = new JWTSession({
    host: 'relay.swire.io',
    project,
    token,
  })

  client.connect()

  window.__client = client
  return client
}
