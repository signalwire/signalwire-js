// Importing directly from `@signalwire/web` will take the
// `production` bundle while importing from `../../src` will
// hot-reload as we make changes.

import { JWTSession, createWebRTCCall } from '../../src'

// @ts-ignore
window._makeClient = ({ project, token }) => {
  const client = new JWTSession({
    host: 'relay.swire.io',
    project,
    token,
    onReady: async () => {
      console.log('JWTSession Ready')
    },
  })

  client.connect()

  // @ts-ignore
  window.__client = client
  return client
}

// @ts-ignore
window._createCall = ({ project, token }) => {
  const call = createWebRTCCall({
    host: 'relay.swire.io',
    project,
    token,
  })

  return call
}
