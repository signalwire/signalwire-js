import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  getLogger,
} from '@signalwire/core'

export const taskingWorker: SDKWorker = function* ({
  channels: { pubSubChannel },
}): SagaIterator {
  while (true) {
    const action: any = yield sagaEffects.take((action: any) => {
      return action.type === 'queuing.relay.tasks'
    })
    getLogger().debug('taskingWorker:', action, pubSubChannel)
    /**
     * Put the whole action to the pubSubSaga
     * TODO: Rename the type with just `task` ?
     * TODO: Put only message ?
     */
    yield sagaEffects.put(pubSubChannel, action)
  }
}
