import { sagaEffects, SagaIterator, SDKWorker, actions } from '@signalwire/core'
import { RoomSession } from '../RoomSession'

function* layoutEventWorker({ compoundEvent, instance }: any) {
  instance.on(compoundEvent, () => {
    console.log(`--> layoutWorker: ${compoundEvent}`)
  })
}

export const layoutWorker: SDKWorker<RoomSession> = function* layoutWorker({
  instance,
}: any): SagaIterator {
  const action = yield sagaEffects.take((action: any) => {
    return (
      action.type === actions.compoundEventAttachAction.type &&
      action.payload.namespace === instance._eventsNamespace
    )
  })

  for (const compoundEvent of action.payload.compoundEvents) {
    yield sagaEffects.fork(layoutEventWorker, { compoundEvent, instance })
  }
}
