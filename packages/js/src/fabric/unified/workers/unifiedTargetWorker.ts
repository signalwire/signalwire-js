import {
  getLogger,
  sagaEffects,
  SagaIterator,
  sessionActions,
  InternalUnifiedActionTarget,
} from '@signalwire/core'




//FIXME add proper types
function getTarget(event: any): InternalUnifiedActionTarget | undefined {
  const { member_id } = event;

  if (!member_id) return undefined;
  
  const member = event.room_session.members.find((m: any) => m.member_id == member_id);
  return member ? {
    memberId: member.member_id,
    callId: member.call_id,
    nodeId: member.node_id
  } : undefined
}

export const unifiedTargetWorker = function* (
  // FIXME add proper unfifed types
    { action }: {action: {type: string, payload:any}}): SagaIterator {
  getLogger().debug('unifiedTargetWorker started')
  
   
  if(action.type !== 'call.joined') return

  const target = getTarget(action.payload);
  

  if (!!target) {
    yield sagaEffects.put(
      sessionActions.pushTarget(target)
    )
  } else {
    getLogger().warn('No target found in a call.joined event, call stack compromised')
  }  
}
