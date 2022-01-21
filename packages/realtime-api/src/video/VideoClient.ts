import { AssertSameType, UserOptions } from '@signalwire/core'
import { RealtimeClient } from '../client/Client'
import { getClient, getToken } from '../client/getClient'
import { RealTimeVideoApiEvents } from '../types'
import { setupInternals } from '../utils/internals'
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
  const token = getToken(options.token)
  const { emitter, store } = setupInternals({
    ...options,
    token,
  })
  const client = getClient({
    ...options,
    token,
    emitter,
    store,
  })

  // Client interceptors
  const clientOn: RealtimeClient['on'] = (...args) => {
    client.connect()

    return client.on(...args)
  }
  const clientOnce: RealtimeClient['once'] = (...args) => {
    client.connect()

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
    client.connect()

    return video.on(...args)
  }
  const videoOnce: Video['once'] = (...args) => {
    client.connect()

    return video.once(...args)
  }
  const videoSubscribe: Video['subscribe'] = async (...args) => {
    await client.connect()

    return video.subscribe(...args)
  }

  client.on('session.connected', () => {
    video.subscribe()
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
      } else if (prop === 'session') {
        return proxiedClient
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options: VideoClientOptions): VideoClient }

export { VideoClient as Client }
