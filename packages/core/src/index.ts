import { uuid, logger, isGlobalEvent } from './utils'
import { BaseSession } from './BaseSession'
import { BaseJWTSession } from './BaseJWTSession'
import { configureStore, connect } from './redux'
import { BaseClient } from './BaseClient'
import { BaseComponent } from './BaseComponent'
import { EventEmitter, getEventEmitter } from './utils/EventEmitter'
import * as sessionSelectors from './redux/features/session/sessionSelectors'
import {
  GLOBAL_VIDEO_EVENTS,
  MEMBER_EVENTS,
  INTERNAL_MEMBER_EVENTS,
  MEMBER_UPDATED_EVENTS,
  INTERNAL_MEMBER_UPDATED_EVENTS,
  MEMBER_TALKING_EVENTS,
  INTERNAL_MEMBER_TALKING_EVENTS,
} from './utils/constants'

export {
  uuid,
  logger,
  BaseSession,
  BaseJWTSession,
  BaseComponent,
  BaseClient,
  connect,
  configureStore,
  EventEmitter,
  getEventEmitter,
  isGlobalEvent,
  GLOBAL_VIDEO_EVENTS,
  MEMBER_EVENTS,
  INTERNAL_MEMBER_EVENTS,
  MEMBER_UPDATED_EVENTS,
  INTERNAL_MEMBER_UPDATED_EVENTS,
  MEMBER_TALKING_EVENTS,
  INTERNAL_MEMBER_TALKING_EVENTS,
}

export * from './RPCMessages'
export * from './utils/interfaces'
export * from './types'
export * from './CustomErrors'
export type {
  SessionState,
  CustomSagaParams,
  CustomSaga,
} from './redux/interfaces'
export * as actions from './redux/actions'
export * as Rooms from './rooms'
export const selectors = {
  ...sessionSelectors,
}
