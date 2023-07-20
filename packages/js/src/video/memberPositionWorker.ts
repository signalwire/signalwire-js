import {
  SagaIterator,
  SDKWorker,
  MemberPosition,
  sagaEffects,
} from '@signalwire/core'

// TODO: Why do we need this worker? Why can't we directly call MemberPosition.memberPositionWorker from the BaseRoomSession?
export const memberPositionWorker: SDKWorker<any> =
  function* memberPositionWorker(options): SagaIterator {
    if (!options.initialState) {
      throw new Error('[memberPositionWorker] Missing initialState')
    }

    yield sagaEffects.fork(MemberPosition.memberPositionWorker, options)
  }
