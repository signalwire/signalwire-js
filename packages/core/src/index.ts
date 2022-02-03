import {
  uuid,
  setLogger,
  getLogger,
  isGlobalEvent,
  toExternalJSON,
  toLocalEvent,
  toSyntheticEvent,
  extendComponent,
  validateEventsToSubscribe,
  toInternalEventName
} from './utils'
import { BaseSession } from './BaseSession'
import { BaseJWTSession } from './BaseJWTSession'
import { configureStore, connect } from './redux'
import { BaseClient } from './BaseClient'
import { BaseComponent } from './BaseComponent'
import { BaseConsumer } from './BaseConsumer'
import { EventEmitter, getEventEmitter } from './utils/EventEmitter'
import * as sessionSelectors from './redux/features/session/sessionSelectors'
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
  toLocalEvent,
  toInternalEventName,
  toSyntheticEvent,
  GLOBAL_VIDEO_EVENTS,
  MEMBER_UPDATED_EVENTS,
  INTERNAL_MEMBER_UPDATED_EVENTS,
}

export * from './RPCMessages'
export * from './internal'
export * from './utils/interfaces'
export * from './types'
export * from './CustomErrors'
export type {
  SessionState,
  CustomSagaParams,
  CustomSaga,
  PubSubChannel,
  MapToPubSubShape
} from './redux/interfaces'
export * as actions from './redux/actions'
export * as sagaHelpers from './redux/utils/sagaHelpers'
export * as sagaEffects from '@redux-saga/core/effects'
export type { SagaIterator, Task, Saga } from '@redux-saga/types'
export * as Rooms from './rooms'
export * as Chat from './chat'
export type { RoomSessionRecording, RoomSessionPlayback } from './rooms'
export const selectors = {
  ...sessionSelectors,
}
