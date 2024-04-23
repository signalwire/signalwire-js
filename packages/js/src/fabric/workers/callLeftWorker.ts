import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  CallLeftEvent,
  RoomSessionMember,
} from '@signalwire/core'
import { CallFabricWorkerParams } from './callFabricWorker'


export const callLeftWorker = function* (
  options: CallFabricWorkerParams<MapToPubSubShape<CallLeftEvent>>
): SagaIterator {
  getLogger().trace('callLeftWorker started')

  const { action: { payload: { call_id } }, callSegments, instanceMap } = options

  const segmentToRemoveIndex = callSegments.findIndex((segment) => segment.callId == call_id)
  if(segmentToRemoveIndex >= 0) {
    callSegments.splice(segmentToRemoveIndex)
  }
  
  const memberInstancesToRemove = instanceMap.getAll<RoomSessionMember>()
                                      .filter(([, obj]) => obj.callId == call_id)
                                      .map(([key,]) => key)
  
  memberInstancesToRemove.forEach((key) => instanceMap.remove(key));

  getLogger().trace('callLeftWorker ended')
}
