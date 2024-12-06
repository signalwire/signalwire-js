import {
  CamelToSnakeCase,
  EntityUpdated,
  OnlyFunctionProperties,
  OnlyStateProperties,
  InternalFabricMemberEntity,
  VideoLayoutChangedEventParams,
  VideoPosition,
  FabricLayoutChangedEventParams,
} from '..'

// TODO: Finish the Call Fabric room session contract.
// Omit VideoRoomSessionContract properties which are not offered in CF SDK

/**
 * Public Contract for a FabricRoomSession
 */
export interface FabricRoomSessionContract {
  /**
   * The `layout.changed` event based on the current room layout
   */
  currentLayoutEvent: FabricLayoutChangedEventParams
  /**
   * The layout returned from the `layout.changed` event based on the current room layout
   */
  currentLayout: VideoLayoutChangedEventParams['layout']
  /**
   * The current position of the member returned from the `layout.changed` event
   */
  currentPosition: VideoPosition | undefined
  /**
   * List of members that are part of this room session
   */
  members: InternalFabricMemberEntity[]
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
 * FabricRoomSession properties
 */
export type FabricRoomSessionEntity =
  OnlyStateProperties<FabricRoomSessionContract>

/**
 * FabricRoomSession methods
 */
export type FabricRoomSessionMethods =
  OnlyFunctionProperties<FabricRoomSessionContract>

/**
 * FabricRoomSessionEntity plus `updated` field
 */
export type FabricRoomSessionEntityUpdated =
  EntityUpdated<FabricRoomSessionEntity>

/**
 * FabricRoomSessionEntity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalFabricRoomSessionEntity = {
  [K in NonNullable<
    keyof FabricRoomSessionEntity
  > as CamelToSnakeCase<K>]: FabricRoomSessionEntity[K]
}
