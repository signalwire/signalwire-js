import { OnlyStateProperties, OnlyFunctionProperties } from '@signalwire/core'

export interface RelayContract {
  receive(contexts: string[], handler: Function): Promise<void>
  unreceive(contexts: string[], handler: Function): Promise<void>
}
export type RelayEntity = OnlyStateProperties<RelayContract>
export type RelayMethods = OnlyFunctionProperties<RelayContract>
