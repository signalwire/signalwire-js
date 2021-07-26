import { Video } from '@signalwire/js'

// @ts-ignore
window._makeClient = async ({ token, emitter }) => {
  try {
    const client = await Video.createClient({
      host: 'relay.swire.io',
      token,
      autoConnect: false,
      emitter,
    })

    client.on('session.disconnected', console.warn)
    client.on('session.connected', console.warn)

    // @ts-ignore
    window.__client = client

    return client
  } catch (error) {
    console.error('Error?', error)
  }
}
