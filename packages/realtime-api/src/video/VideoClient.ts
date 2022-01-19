import { AssertSameType, getEventEmitter, UserOptions } from '@signalwire/core'
// import { RealtimeClient } from '../BaseClient'
import { createStore } from '../createStore'
import { getClient, getToken } from '../getClient'
import { RealTimeVideoApiEvents } from '../types'
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
  const emitter = getEventEmitter<any>()

  const baseOptions = {
    ...options,
    token,
    emitter,
  }

  const store = createStore(baseOptions)
  const client = getClient({
    ...baseOptions,
    store,
  })

  // TODO: intercept client methods.

  const video = createVideoObject({
    store,
    emitter,
  })

  // TODO: intercept video methods.
  const videoOn: Video['on'] = (...args) => {
    client.connect()

    return video.on(...args)
  }

  // This should replace the `onAuth` we have in
  // `packages/realtime-api/src/Client.ts`
  client.on('session.connected', () => {
    video.subscribe()
  })

  return new Proxy<VideoClient>(video, {
    get(target: VideoClient, prop: keyof VideoClient, receiver: any) {
      if (prop === 'on') {
        return videoOn
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options: VideoClientOptions): VideoClient }

export { VideoClient as Client }
