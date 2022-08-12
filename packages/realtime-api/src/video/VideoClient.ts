import type { UserOptions } from '@signalwire/core'
import type { RealTimeVideoApiEvents } from '../types'
import { setupClient, clientConnect } from '../client/index'
import { createVideoObject, Video } from './Video'

/**
 * List of events for {@link Video.Client}.
 */
export interface VideoClientApiEvents extends RealTimeVideoApiEvents {}

export interface VideoApiFullState extends VideoClient {}

interface VideoClient extends Video {
  new (opts: VideoClientOptions): this
}

export interface VideoClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

/**
 * You can use instances of this class to subscribe to video events. Please see
 * {@link VideoClientApiEvents} for the full list of events you can subscribe
 * to.
 *
 * @param options - {@link VideoClientOptions}
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
const VideoClient = function (options?: VideoClientOptions) {
  const { client, store, emitter } = setupClient(options)

  const video = createVideoObject({
    store,
    emitter,
  })

  const videoSubscribe: Video['subscribe'] = async () => {
    await clientConnect(client)

    return video.subscribe()
  }

  const interceptors = {
    // keep subscribe in here to await clientConnect
    subscribe: videoSubscribe,
    _session: client,
  } as const

  return new Proxy<Omit<VideoClient, 'new'>>(video, {
    get(target: VideoClient, prop: keyof VideoClient, receiver: any) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      // Always connect the underlying client
      clientConnect(client)

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: VideoClientOptions): VideoClient }

export { VideoClient as Client }
