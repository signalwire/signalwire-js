// Importing directly from `@signalwire/web` will take the
// `production` bundle while importing from `../../src` will
// hot-reload as we make changes.

import { createSession } from '../../src'

// @ts-ignore
window._makeClient = async ({ project, token }) => {
  const client = await createSession({
    host: 'relay.swire.io',
    project,
    token,
    autoConnect: true,
    onReady: () => {
      console.debug('Session Ready')
    },
  })

  // @ts-ignore
  window.__client = client
  return client
}
