import { sagaEffects, SagaIterator, SDKWorker, getLogger } from '..'
import { componentActions } from '../redux/features'

export const chatWorker: SDKWorker = function* chatWorker({
  pubSubChannel,
}): SagaIterator {
  while (true) {
    const action = yield sagaEffects.take((action: any) => {
      return action.type.startsWith('chat.')
    })
    console.log('chatWorker:', action)

    switch (action.type) {
      case 'chat.subscribed': {
        // TODO: re-enable once we have a better idea of the
        // response type
        // yield sagaEffects.put(
        //   componentActions.upsert({
        //     // TODO: add remaining params
        //     id: action.payload.params.chatId,
        //   })
        // )
        break
      }

      case 'chat.channel.message': {
        yield sagaEffects.put(pubSubChannel, {
          type: 'chat.message' as any,
          payload: action.payload,
        })
        break
      }

      default: {
        getLogger().info('Unrecognized Action', action)
        break
      }
    }
  }
}
