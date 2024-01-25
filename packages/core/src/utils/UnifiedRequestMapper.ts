/**
 * FIXME
 * 
 * This as a mapper utility to handle unified API for methods execution.
 * this is been used just before sending the message to the wire. 
 * The idea is to keep ALL current SDK implemtation unware of Unified Events and API.
 * When/If we this assumption changes we should remove this...
 */
export const UnifiedRequestMapper = {
  'video.member.audio_mute': (requestMessage: any, self: any, target: any) => {
    const params = {
      channels: ['audio'],
      self: {
        member_id: self.id,
        call_id: self.callId,
        node_id: self.nodeId
      },
      target: {
        member_id: target.id,
        call_id: target.callId,
        node_id: target.nodeId
      },
    };

    return {
      ...requestMessage,
      method: 'call.mute',
      params
    };
  }
};
