import { Video } from '@signalwire/js'

window.connect = async ({ host, token }) => {
  const client = Video.createClient({
    host,
    token: token,
    _onRefreshToken: () => {
      console.debug('onRefreshToken')
    },
    logLevel: 'debug',
  })

  window.__client = client

  const events = [
    'session.unknown',
    'session.idle',
    'session.reconnecting',
    'session.connected',
    'session.disconnected',
    'session.auth_error',
    'session.expiring',
  ]
  events.forEach((evt) => {
    client.on(evt, () => console.debug(`CM >>> ${evt}`))
  })

  client.videoManager.on('rooms.subscribed', (params) => {
    console.debug('CM rooms.subscribed', params.rooms.length, 'rooms')
  })

  client.videoManager.on('room.added', ({ room }) => {
    console.debug('CM room.added', room)
  })

  client.videoManager.on('room.updated', ({ room }) => {
    console.debug('CM room.updated', room)
  })

  client.videoManager.on('room.deleted', ({ room }) => {
    console.debug('CM room.deleted', room)
  })

  window.subscribe = async () => {
    console.debug('CM send subscribe')
    try {
      // FIXME: change in the SDK
      client.videoManager._latestExecuteParams = null
      await client.videoManager.subscribe()
    } catch (error) {
      console.error('CM Subscribe Error', error)
    }
  }

  window.__connect = async () => {
    try {
      console.debug('CM Connect')
      await client.connect()

      await window.subscribe()
    } catch (error) {
      console.error('CM Connect Error', error)
    }
  }

  window.disconnect = async () => {
    console.debug('CM Disconnect')
    await client.disconnect()
  }

  window.reauthenticate = async (token) => {
    console.debug('CM Reauthenticate')
    await client.reauthenticate(token)
  }

  await window.__connect()
}
