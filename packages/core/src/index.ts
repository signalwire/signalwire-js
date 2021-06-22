import { uuid, logger } from './utils'
import { BaseSession } from './BaseSession'
import { BaseJWTSession } from './BaseJWTSession'
import { configureStore, connect } from './redux'
import { BaseClient } from './BaseClient'
import { BaseComponent } from './BaseComponent'
import { EventEmitter, getEventEmitter } from './utils/EventEmitter'
import * as sessionSelectors from './redux/features/session/sessionSelectors'
import { executeAction } from './redux'

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
  executeAction,
  getEventEmitter
}

export * from './RPCMessages'
export * from './utils/interfaces'
export { VertoMethod } from './utils/constants'
export * from './CustomErrors'

export const selectors = {
  ...sessionSelectors,
}
