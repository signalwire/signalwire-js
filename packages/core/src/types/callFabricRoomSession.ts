import {
  CamelToSnakeCase,
  EntityUpdated,
  OnlyFunctionProperties,
  OnlyStateProperties,
  InternalCallFabricMemberEntity,
  VideoLayoutChangedEventParams,
} from '..'

// TODO: Finish the Call Fabric room session contract.
// Omit VideoRoomSessionContract properties which are not offered in CF SDK

/**
 * Public Contract for a CallFabricRoomSession
 */
// TODO: Rename this to FabricRoomSessionContract
export interface CallFabricRoomSessionContract {
  /**
   * The `layout.changed` event based on the current room layout
   */
  currentLayoutEvent: VideoLayoutChangedEventParams
  /**
   * The layout returned from the `layout.changed` event based on the current room layout
   */
  currentLayout: VideoLayoutChangedEventParams['layout']
  /**
   * List of members that are part of this room session
   */
  members: InternalCallFabricMemberEntity[]
  /**
   * Starts the call via the WebRTC connection
   *
   * @example:
   * ```typescript
   * await call.start()
   * ```
   */
  start(): Promise<void>
  /**
   * Hangs up the current call and disconnects the WebRTC connection.
   * If an RTC Peer ID is passed, the method will only disconnect that Peer, otherwise all Peers will be destroyed
   *
   * @example:
   * ```typescript
   * await call.hangup()
   * ```
   */
  hangup(id?: string): Promise<void>
}

/**
 * CallFabricRoomSession properties
 */
export type CallFabricRoomSessionEntity =
  OnlyStateProperties<CallFabricRoomSessionContract>

/**
 * CallFabricRoomSession methods
 */
export type CallFabricRoomSessionMethods =
  OnlyFunctionProperties<CallFabricRoomSessionContract>

/**
 * CallFabricRoomSessionEntity plus `updated` field
 */
export type CallFabricRoomSessionEntityUpdated =
  EntityUpdated<CallFabricRoomSessionEntity>

/**
 * CallFabricRoomSessionEntity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalCallFabricRoomSessionEntity = {
  [K in NonNullable<
    keyof CallFabricRoomSessionEntity
  > as CamelToSnakeCase<K>]: CallFabricRoomSessionEntity[K]
}
