import { uuid, logger } from './utils'
import { Session } from './Session'
import { JWTSession } from './JWTSession'
import { configureStore, connect } from './redux'
import { SignalWire } from './SignalWire'
import { BaseComponent } from './BaseComponent'
import { EventEmitter, getEventEmitter } from './utils/EventEmitter'
import * as sessionSelectors from './redux/features/session/sessionSelectors'

// prettier-ignore
export {
  uuid,
  logger,
  Session,
  JWTSession,
  BaseComponent,
  SignalWire,
  connect,
  configureStore,
  EventEmitter,
  getEventEmitter
}

export * from './RPCMessages'
// TODO: do we want to export all the interfaces ?
export * from './utils/interfaces'
export {
  SwWebRTCCallState,
  VertoMethod,
  ConferenceMethod,
} from './utils/constants'

export const selectors = {
  ...sessionSelectors,
}
