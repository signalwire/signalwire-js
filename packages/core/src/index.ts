import {
  uuid,
  setLogger,
  getLogger,
  isGlobalEvent,
  toExternalJSON,
  fromSnakeToCamelCase,
  toSnakeCaseKeys,
  toLocalEvent,
  toSyntheticEvent,
  extendComponent,
  validateEventsToSubscribe,
  toInternalEventName,
  toInternalAction,
  timeoutPromise,
  debounce,
  SWCloseEvent,
  isSATAuth,
  LOCAL_EVENT_PREFIX,
  stripNamespacePrefix,
  isJSONRPCRequest,
  isJSONRPCResponse,
} from './utils'
import { WEBRTC_EVENT_TYPES, isWebrtcEventType } from './utils/common'
import { BaseSession } from './BaseSession'
import { BaseJWTSession } from './BaseJWTSession'
import { configureStore, connect } from './redux'
import { BaseClient } from './BaseClient'
import { BaseComponent } from './BaseComponent'
import { BaseConsumer } from './BaseConsumer'
import { EventEmitter, getEventEmitter } from './utils/EventEmitter'
import * as sessionSelectors from './redux/features/session/sessionSelectors'
import { findNamespaceInPayload } from './redux/features/shared/namespace'
import { GLOBAL_VIDEO_EVENTS } from './utils/constants'
import {
  MEMBER_UPDATED_EVENTS,
  INTERNAL_MEMBER_UPDATED_EVENTS,
} from './types/videoMember'

export {
  uuid,
  setLogger,
  getLogger,
  BaseSession,
  BaseJWTSession,
  BaseComponent,
  BaseConsumer,
  BaseClient,
  connect,
  configureStore,
  EventEmitter,
  extendComponent,
  validateEventsToSubscribe,
  getEventEmitter,
  isGlobalEvent,
  toExternalJSON,
  fromSnakeToCamelCase,
  toSnakeCaseKeys,
  toLocalEvent,
  toInternalEventName,
  toInternalAction,
  toSyntheticEvent,
  GLOBAL_VIDEO_EVENTS,
  MEMBER_UPDATED_EVENTS,
  INTERNAL_MEMBER_UPDATED_EVENTS,
  findNamespaceInPayload,
  timeoutPromise,
  debounce,
  SWCloseEvent,
  WEBRTC_EVENT_TYPES,
  isWebrtcEventType,
  isSATAuth,
  isJSONRPCRequest,
  isJSONRPCResponse,
  LOCAL_EVENT_PREFIX,
  stripNamespacePrefix,
}

export * from './redux/features/component/componentSlice'
export * from './redux/features/session/sessionSlice'
export * as componentSelectors from './redux/features/component/componentSelectors'
export * from './RPCMessages'
export * from './utils/interfaces'
export * from './types'
export * from './CustomErrors'
export type {
  SessionState,
  CustomSagaParams,
  CustomSaga,
  SwEventChannel,
  PubSubAction,
  MapToPubSubShape,
  SDKActions,
  ReduxComponent,
} from './redux/interfaces'
export type { SDKStore } from './redux'
export type { ToExternalJSONResult } from './utils'
export * as actions from './redux/actions'
export * as sagaHelpers from './redux/utils/sagaHelpers'
export * as sagaEffects from '@redux-saga/core/effects'
export type { SagaIterator, Task, Saga } from '@redux-saga/types'
export * as Rooms from './rooms'
export * as Chat from './chat'
export * as PubSub from './pubSub'
export * as MemberPosition from './memberPosition'
export type {
  RoomSessionRecording,
  RoomSessionPlayback,
  RoomSessionStream,
  RoomSessionMember,
} from './rooms'
export const selectors = {
  ...sessionSelectors,
}
export { ChatMember, ChatMessage } from './chat'
export { PubSubMessage } from './pubSub'
export * as testUtils from './testUtils'
export * from './utils/mapObject'
