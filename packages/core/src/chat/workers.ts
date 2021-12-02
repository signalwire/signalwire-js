import { sagaEffects, SagaIterator, SDKWorker, getLogger, ChatAction } from '..'

export const chatWorker: SDKWorker = function* chatWorker({
  pubSubChannel,
}): SagaIterator {
  while (true) {
    const action: ChatAction = yield sagaEffects.take((action: any) => {
      return action.type.startsWith('chat.')
    })
    getLogger().debug('chatWorker:', action)

    switch (action.type) {
      case 'chat.channel.message': {
        yield sagaEffects.put(pubSubChannel, {
          /**
           * FIXME: This is a hack to get the message to the
           * correct channel. We'll fix this once we have a
           * proper way to setup the prefix `channel` at a
           * BaseConsumer level.
           */
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
