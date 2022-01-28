import type { AssertSameType, UserOptions } from '@signalwire/core'
import type { RealTimeVideoApiEvents } from '../types'
import { getLogger } from '@signalwire/core'
import { setupClient, clientConnect } from '../client/index'
import { createVideoObject, Video } from './Video'
import { VideoClientDocs } from './VideoClient.docs'

/**
 * List of events for {@link Video.Client}.
 */
export interface VideoClientApiEvents extends RealTimeVideoApiEvents {}

/** @ignore */
export interface VideoApiFullState extends VideoClient {}
interface VideoClientMain extends Video {
  new (opts: VideoClientOptions): this
}

/**
 * You can use instances of this class to subscribe to video events. Please see
 * {@link VideoClientApiEvents} for the full list of events you can subscribe
 * to.
 *
 * @example
 *
 * ```javascript
 * const video = new Video.Client({
 *   project: '<project-id>',
 *   token: '<project-token>'
 * })
 *
 * video.on('room.started', async (roomSession) => {
 *   console.log("Room started")
 * });
 *
 * video.on('room.ended', async (roomSession) => {
 *   console.log("Room ended")
 * });
 * ```
 */
interface VideoClient
  extends AssertSameType<VideoClientMain, VideoClientDocs> {}

/** @ignore */
export interface VideoClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

/** @ignore */
const VideoClient = function (options?: VideoClientOptions) {
  const { client, store, emitter } = setupClient(options)

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
  const videoSubscribe: Video['subscribe'] = async () => {
    await clientConnect(client)

    return video.subscribe()
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

  const interceptors = {
    on: videoOn,
    once: videoOnce,
    subscribe: videoSubscribe,
    _session: client,
  } as const

  return new Proxy<Omit<VideoClient, 'new'>>(video, {
    get(
      target: VideoClient,
      prop: keyof VideoClient | 'session',
      receiver: any
    ) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: VideoClientOptions): VideoClient }

export { VideoClient as Client }
