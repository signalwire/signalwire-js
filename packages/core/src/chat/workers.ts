import { sagaEffects, SagaIterator, SDKWorker } from '..'

export const chatWorker: SDKWorker = function* chatWorker({
  pubSubChannel,
  ...rest
}): SagaIterator {
  console.log('rest', rest)

  while (true) {
    const action = yield sagaEffects.take((action: any) => {
      return action.type.startsWith('chat.')
    })
    console.log('chatWorker:', action)

    yield sagaEffects.put(pubSubChannel, {
      type: 'message' as any,
      payload: action.payload,
    })
  }
}
