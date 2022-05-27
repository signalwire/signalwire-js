import {
  SagaIterator,
  SDKWorker,
  MemberPosition,
  sagaEffects,
} from '@signalwire/core'

export const memberPositionWorker: SDKWorker<any> =
  function* memberPositionWorker(options): SagaIterator {
    if (!options.initialState) {
      throw new Error('[memberPositionWorker] Missing initialState')
    }

    yield sagaEffects.fork(MemberPosition.memberPositionWorker, options)
  }
