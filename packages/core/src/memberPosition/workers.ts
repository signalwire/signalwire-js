import { sagaEffects, SagaIterator, SDKWorker } from '..'
import { findNamespaceInPayload } from '../redux/features/shared/namespace'

export const memberPositionWorker: SDKWorker<any> =
  function* memberPositionWorker({
    instance,
    channels: { swEventChannel },
  }): SagaIterator {
    while (true) {
      yield sagaEffects.take(swEventChannel, (action: any) => {
        const istargetEvent =
          action.type.startsWith('video.member.updated') ||
          action.type.startsWith('video.layout.changed')

        if (
          istargetEvent &&
          findNamespaceInPayload(action) === instance._eventsNamespace
        ) {
          console.log('[memberPositionWorker] fork work', action.type)
        }

        return false
      })
    }
  }
