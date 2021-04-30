// Importing directly from `@signalwire/web` will take the
// `production` bundle while importing from `../../src` will
// hot-reload as we make changes.

import { createSession } from '../../src'

// @ts-ignore
window._makeClient = async ({ project, token, emitter }) => {
  try {
    const client = await createSession({
      host: 'relay.swire.io',
      project,
      token,
      autoConnect: true,
      onReady: async () => {
        console.debug('Session Ready')
      },
      emitter,
    })

    // @ts-ignore
    window.__client = client
    return client
  } catch (e) {
    console.log('Error', e)
  }
}
