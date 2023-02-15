import {
  getLogger,
  sagaEffects,
  actions,
  SagaIterator,
  SDKWorker,
  SDKWorkerHooks,
} from '@signalwire/core'

import { BaseConnection } from '../BaseConnection'

type SessionAuthWorkerOnDone = (args: BaseConnection<any>) => void
type SessionAuthWorkerOnFail = (args: { error: Error }) => void

export type SessionAuthWorkerHooks = SDKWorkerHooks<
  SessionAuthWorkerOnDone,
  SessionAuthWorkerOnFail
>

type Action = typeof actions.authSuccessAction | typeof actions.authErrorAction

export const sessionAuthWorker: SDKWorker<
  BaseConnection<any>,
  SessionAuthWorkerHooks
> = function* (options): SagaIterator {
  getLogger().debug('sessionAuthWorker started')
  const { instance } = options
  const action: Action = yield sagaEffects.take([
    actions.authSuccessAction.type,
    actions.authErrorAction.type,
  ])

  switch (action.type) {
    case actions.authSuccessAction.type:
      yield sagaEffects.call([instance, instance.resume])
      break
    case actions.authErrorAction.type:
      yield sagaEffects.call([instance, instance.setState], 'hangup')
      break
  }

  getLogger().debug('sessionAuthWorker ended')
}
