import { sagaEffects, SagaIterator } from '..'

export function* chatWorker(): SagaIterator {
  while (true) {
    const action = yield sagaEffects.take((action: any) =>
      action.type.startsWith('chat.')
    )
    console.debug('chatWorker:', action)
  }
}
