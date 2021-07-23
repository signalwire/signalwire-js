import { uuid, logger, isGlobalEvent } from './utils'
import { BaseSession } from './BaseSession'
import { BaseJWTSession } from './BaseJWTSession'
import { configureStore, connect } from './redux'
import { BaseClient } from './BaseClient'
import { BaseComponent } from './BaseComponent'
import { EventEmitter, getEventEmitter } from './utils/EventEmitter'
import * as sessionSelectors from './redux/features/session/sessionSelectors'

// prettier-ignore
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
  isGlobalEvent
}

export * from './RPCMessages'
export * from './utils/interfaces'
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
