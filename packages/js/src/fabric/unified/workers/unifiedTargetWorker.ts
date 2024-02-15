import {
  getLogger,
  sagaEffects,
  SagaIterator,
  InternalUnifiedMethodTarget,
  SDKWorker,
} from '@signalwire/core'
import { BaseConnection } from '@signalwire/webrtc'
import { isUnifedJWTSession } from 'packages/js/src/UnifiedJWTSession'
import { createClient } from 'packages/js/src/createClient'
import { WSClientWorkerHooks } from '../../WSClientWorker'

function getTarget(event: any): InternalUnifiedMethodTarget | undefined {
  const { member_id } = event

  if (!member_id) return undefined

  const member = event.room_session.members.find(
    (m: any) => m.member_id == member_id
  )
  return member
    ? {
        memberId: member.member_id,
        callId: member.call_id,
        nodeId: member.node_id,
      }
    : undefined
}

const segmentWatcher: SDKWorker<
  ReturnType<typeof createClient<BaseConnection<any>>>,
  WSClientWorkerHooks & { callId: string }
> = function* (options) {
  const {
    channels: { swEventChannel },
    callId,
    getSession,
  } = options
  getLogger().debug('call watcher started from call: ${callId}')

  function isSegmentEvent(action: any) {
    //we track segments by callId not segmentId
    return action.payload.call_id == callId
  }

  function* handleCallEvent(action: any) {
    const session = getSession()
    getLogger().debug('segment event handler', action)
    if (action.type === 'call.left') {
      if (isUnifedJWTSession(session)) {
        session.popCallInstanceRef()
        return true; // stop this segements watcher
      }
    }
    return false
  }

  while (true) {
    const action: any = yield sagaEffects.take(swEventChannel, isSegmentEvent)
    const shouldStop =  yield sagaEffects.call(handleCallEvent, action)
    if(shouldStop) break;
  }

  getLogger().debug(`call watcher ended for call: ${callId}`)
}

export const unifiedTargetWorker: SDKWorker<any> = function* (
  options: any
): SagaIterator {
  const { getSession, action } = options
  const logger = getLogger()
  logger.debug('unifiedTargetWorker started', action)

  if (action.type !== 'call.joined') return
  const callId = action.payload.call_id
  const session = getSession()

  if (isUnifedJWTSession(session)) {
    const target = getTarget(action.payload)
    if (!!target) {
      session.pushCallInstanceRef(target)
      yield sagaEffects.spawn(segmentWatcher, {
        ...options,
        callId,
      })
    } else {
      getLogger().warn(
        'No target found in a call.joined event, call stack compromised'
      )
    }
  } else {
    logger.warn('unifiedEventsWatcher is runnif in a non UnifedSession')
  }

  getLogger().debug('unifiedTargetWorker stoped')
}
