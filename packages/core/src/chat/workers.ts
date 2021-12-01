import { sagaEffects, SagaIterator, SDKWorker, getLogger } from '..'

export const chatWorker: SDKWorker = function* chatWorker({
  pubSubChannel,
}): SagaIterator {
  while (true) {
    const action = yield sagaEffects.take((action: any) => {
      return action.type.startsWith('chat.')
    })
    getLogger().debug('chatWorker:', action)

    switch (action.type) {
      case 'chat.channel.message': {
        yield sagaEffects.put(pubSubChannel, {
          type: 'chat.message' as any,
          payload: action.payload,
        })
        break
      }

      default: {
        getLogger().warn('[chatWorker] Unrecognized Action', action)
        break
      }
    }
  }
}
