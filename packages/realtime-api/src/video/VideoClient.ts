import type { AssertSameType, UserOptions } from '@signalwire/core'
import type { RealtimeClient } from '../client/index'
import type { RealTimeVideoApiEvents } from '../types'
import { getLogger } from '@signalwire/core'
import { getClient, clientConnect } from '../client/index'
import { getCredentials, setupInternals } from '../utils/internals'
import { createVideoObject, Video } from './Video'

export interface VideoClientApiEvents extends RealTimeVideoApiEvents {}

export interface VideoApiFullState extends VideoClient {}
interface VideoClientMain extends Video {}

interface VideoClientDocs extends VideoClientMain {}

export interface VideoClient
  extends AssertSameType<VideoClientMain, VideoClientDocs> {}

export interface VideoClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

const VideoClient = function (options: VideoClientOptions) {
  const credentials = getCredentials({
    token: options.token,
    project: options.project,
  })
  const { emitter, store } = setupInternals({
    ...options,
    ...credentials,
  })
  const client = getClient({
    ...options,
    ...credentials,
    emitter,
    store,
  })

  client.on('session.auth_error', () => {
    getLogger().error("Wrong credentials: couldn't connect the client.")

    // TODO: we can execute the future `onConnectError` from here.
  })

  // Client interceptors
  const clientOn: RealtimeClient['on'] = (...args) => {
    clientConnect(client)

    return client.on(...args)
  }
  const clientOnce: RealtimeClient['once'] = (...args) => {
    clientConnect(client)

    return client.once(...args)
  }

  const proxiedClient = new Proxy<RealtimeClient>(client, {
    get(target: RealtimeClient, prop: keyof RealtimeClient, receiver: any) {
      if (prop === 'on') {
        return clientOn
      } else if (prop === 'once') {
        return clientOnce
      }

      return Reflect.get(target, prop, receiver)
    },
  })

  const video = createVideoObject({
    store,
    emitter,
  })

  // Video interceptors:
  const videoOn: Video['on'] = (...args) => {
    clientConnect(client)

    return video.on(...args)
  }
  const videoOnce: Video['once'] = (...args) => {
    clientConnect(client)

    return video.once(...args)
  }
  const videoSubscribe: Video['subscribe'] = async (...args) => {
    await clientConnect(client)

    return video.subscribe(...args)
  }

  client.on('session.connected', async () => {
    try {
      await video.subscribe()
    } catch (e) {
      // TODO: In the future we'll provide a
      // `onSubscribedError` (or similar) to allow the user
      // customize this behavior.
      getLogger().error('Client subscription failed.')
      client.disconnect()
    }
  })

  return new Proxy<VideoClient>(video, {
    get(
      target: VideoClient,
      prop: keyof VideoClient | 'session',
      receiver: any
    ) {
      if (prop === 'on') {
        return videoOn
      } else if (prop === 'once') {
        return videoOnce
      } else if (prop === 'subscribe') {
        return videoSubscribe
      } else if (prop === '_session') {
        return proxiedClient
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options: VideoClientOptions): VideoClient }

export { VideoClient as Client }
