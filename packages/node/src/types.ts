import { Got } from 'got'
import { ConfigParamaters } from './get-config'
import { CreateRoom } from './rooms/createFactory'

export type HttpClient = Got

interface VideoSDKClient {
  createRoom: CreateRoom
}

export type Client = (options: ConfigParamaters) => VideoSDKClient
