// Importing directly from `@signalwire/web` will take the
// `production` bundle while importing from `../../src` will
// hot-reload as we make changes.

import { createSession } from '../../src'

// @ts-ignore
window._makeClient = async ({ token, emitter }) => {
  try {
    const client = await createSession({
      host: 'relay.swire.io',
      token,
      autoConnect: false,
      emitter,
    })
    client.on('socket.error', console.warn)
    client.on('socket.closed', console.warn)

    // @ts-ignore
    window.__client = client

    return client
  } catch (error) {
    console.error('Error?', error)
  }
}
