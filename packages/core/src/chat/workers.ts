import { sagaEffects, SagaIterator, SDKWorker } from '..'
import { componentActions } from '../redux/features'

export const chatWorker: SDKWorker = function* chatWorker({
  pubSubChannel,
}): SagaIterator {
  while (true) {
    const action = yield sagaEffects.take((action: any) => {
      return action.type.startsWith('chat.')
    })
    console.log('chatWorker:', action)

    switch (action) {
      case 'chat.subscribed': {
        yield sagaEffects.put(
          componentActions.upsert({
            // TODO: add remaining params
            id: action.payload.params.chatId,
          })
        )
        break
      }

      // TODO: continue filtering by action.type
      default: {
        yield sagaEffects.put(pubSubChannel, {
          type: 'chat.message' as any,
          payload: action.payload,
        })
        break
      }
    }
  }
}
