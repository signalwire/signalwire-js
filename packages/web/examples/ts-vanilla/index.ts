// Importing directly from `@signalwire/web` will take the
// `production` bundle while importing from `../../src` will
// hot-reload as we make changes.

import { JWTSession } from '../../src'

// @ts-ignore
window._makeClient = ({ project, token }) => {
  const client = new JWTSession({
    host: 'relay.swire.io',
    project,
    token,
  })

  client.connect()

  // @ts-ignore
  window.__client = client
  return client
}
