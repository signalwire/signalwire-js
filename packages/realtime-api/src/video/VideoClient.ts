import { AssertSameType, UserOptions } from '@signalwire/core'
import { RealtimeClient } from '../Client'
import { getClient } from '../getClient'
import { RealTimeVideoApiEvents } from '../types'

export interface VideoClientApiEvents extends RealTimeVideoApiEvents {}

export interface VideoApiFullState extends VideoClient {}
interface VideoClientMain extends RealtimeClient {}

interface VideoClientDocs extends VideoClientMain {}

export interface VideoClient
  extends AssertSameType<VideoClientMain, VideoClientDocs> {}

export interface VideoClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

const VideoClient = function (options: VideoClientOptions) {
  const client = getClient(options)

  const on: RealtimeClient['on'] = (...args) => {
    client.connect()

    return client.on(...args)
  }

  // TODO: intercept other methods.

  return new Proxy<VideoClient>(client, {
    get(target: VideoClient, prop: keyof VideoClient, receiver: any) {
      if (prop === 'on') {
        return on
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options: VideoClientOptions): VideoClient }

export { VideoClient as Client }
