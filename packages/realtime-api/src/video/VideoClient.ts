import type { AssertSameType, UserOptions } from '@signalwire/core'
import type { RealTimeVideoApiEvents } from '../types'
import { getLogger } from '@signalwire/core'
import { getProxiedClient, clientConnect } from '../client/index'
import { getCredentials, setupInternals } from '../utils/internals'
import { createVideoObject, Video } from './Video'
import { VideoClientDocs } from './VideoClient.docs'

export interface VideoClientApiEvents extends RealTimeVideoApiEvents {}

export interface VideoApiFullState extends VideoClient {}
interface VideoClientMain extends Video {
  new (opts: VideoClientOptions): this
}

interface VideoClient
  extends AssertSameType<VideoClientMain, VideoClientDocs> {}

export interface VideoClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

/** @ignore */
const VideoClient = function (options: VideoClientOptions) {
  const credentials = getCredentials({
    token: options.token,
    project: options.project,
  })
  const { emitter, store } = setupInternals({
    ...options,
    ...credentials,
  })
  const client = getProxiedClient({
    ...options,
    ...credentials,
    emitter,
    store,
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

  return new Proxy<Omit<VideoClient, 'new'>>(video, {
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
        return client
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options: VideoClientOptions): VideoClient }

export { VideoClient as Client }
