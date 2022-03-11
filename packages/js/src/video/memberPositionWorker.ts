import { fork } from '@redux-saga/core/effects'
import { SagaIterator, SDKWorker, MemberPosition } from '@signalwire/core'

export const memberPositionWorker: SDKWorker<any> =
  function* memberPositionWorker(options): SagaIterator {
    if (!options.payload) {
      return
    }

    yield fork(MemberPosition.memberPositionWorker, {
      ...options,
      payload: options.payload,
    })
  }
