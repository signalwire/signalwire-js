import { SagaIterator, SDKWorker } from '@signalwire/core'
import { RoomSession } from '../RoomSession'

export const layoutWorker: SDKWorker<RoomSession> = function* layoutWorker({
  instance,
}): SagaIterator {
  // @ts-expect-error
  instance._internal_on('layout.changed', (params) => {
    console.log('layout.changed > no auto subscribe', params)
  })
}
