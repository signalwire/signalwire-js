import {
  SagaIterator,
  SDKWorker,
  MemberPosition,
  sagaEffects,
} from '@signalwire/core'

export const memberPositionWorker: SDKWorker<any> =
  function* memberPositionWorker(options): SagaIterator {
    if (!options.payload) {
      throw new Error('[memberPositionWorker] Missing payload')
    }

    yield sagaEffects.fork(MemberPosition.memberPositionWorker, {
      ...options,
      payload: options.payload,
    })
  }
