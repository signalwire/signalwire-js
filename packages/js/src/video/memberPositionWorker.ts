import { SagaIterator, SDKWorker, MemberPosition, sagaEffects } from '@signalwire/core'

export const memberPositionWorker: SDKWorker<any> =
  function* memberPositionWorker(options): SagaIterator {
    if (!options.payload) {
      return
    }

    yield sagaEffects.fork(MemberPosition.memberPositionWorker, {
      ...options,
      payload: options.payload,
    })
  }
