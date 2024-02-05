import { InternalUnifiedMethodTarget } from '../../../core/src'

export type UnifiedResquestMapFunction = (
  requestMessage: any,
  self: InternalUnifiedMethodTarget,
  targets?: InternalUnifiedMethodTarget[]
) => void

const toServerUnifiedTarget = ({
  memberId: member_id,
  callId: call_id,
  nodeId: node_id,
}: InternalUnifiedMethodTarget) => ({ member_id, call_id, node_id })

const toServerUnifedParams = (
  self: InternalUnifiedMethodTarget,
  targets: InternalUnifiedMethodTarget[] = []
) => {
  return {
    self: toServerUnifiedTarget(self),
    target: targets.length == 1 ? toServerUnifiedTarget(targets[0]) : undefined,
    targets:
      targets.length > 1 ? targets.map(toServerUnifiedTarget) : undefined,
  }
}

const unifiedPayload = (
  method: string,
  id: string,
  self: InternalUnifiedMethodTarget,
  targets: InternalUnifiedMethodTarget[] = [],
  extra = {}
) => ({
  "jsonrpc": "2.0",
  id,
  method,
  params: {
    ...extra,
    ...toServerUnifedParams(self, targets),
  },
})

const withChannelsPayload = (
  method: string,
  channels: string[],
  id: string,
  self: InternalUnifiedMethodTarget,
  targets: InternalUnifiedMethodTarget[]
) => unifiedPayload(method, id, self, targets, {channels})

export const UnifiedRequestMapper: Record<string, UnifiedResquestMapFunction> =
  {
    'video.member.audio_mute': (requestMessage, self, targets) =>
      withChannelsPayload(
        'call.mute',
        ['audio'],
        requestMessage.id,
        self,
        targets!
      ),

    'video.member.audio_unmute': (requestMessage, self, targets) =>
      withChannelsPayload(
        'call.unmute',
        ['audio'],
        requestMessage.id,
        self,
        targets!
      ),

    'video.member.video_mute': (requestMessage, self, targets) =>
      withChannelsPayload(
        'call.mute',
        ['video'],
        requestMessage.id,
        self,
        targets!
      ),

    'video.member.video_unmute': (requestMessage, self, targets) =>
      withChannelsPayload(
        'call.unmute',
        ['video'],
        requestMessage.id,
        self,
        targets!
      ),

    'video.member.deaf': (requestMessage, self, targets) =>
      unifiedPayload('call.deaf', requestMessage.id, self, targets),

    'video.member.undeaf': (requestMessage, self, targets) =>
      unifiedPayload('call.undeaf', requestMessage.id, self, targets),

    'video.list_available_layouts': (requestMessage, self) =>
      unifiedPayload('call.layout.list', requestMessage, self),

    'video.members.get': (requestMessage, self) =>
      unifiedPayload('call.member.list', requestMessage, self),

    'video.member.remove': (requestMessage, self, targets) =>
      unifiedPayload('call.member.remove', requestMessage.id, self, targets),

    'video.set_layout': (requestMessage, self, targets) => {
      const extra = {
        layout: Object.values(requestMessage.params.positions)[0],
      }
      return unifiedPayload(
        'call.layout.set',
        requestMessage.id,
        self,
        targets,
        extra
      )
    },

    'video.member.set_input_volume': (requestMessage, self, targets) => {
      const { volume } = requestMessage.params
      return unifiedPayload(
        'call.microphone.volume.set',
        requestMessage.id,
        self,
        targets,
        { volume }
      )
    },

    'video.member.set_output_volume': (requestMessage, self, targets) => {
      const { volume } = requestMessage.params
      return unifiedPayload(
        'call.speaker.volume.set',
        requestMessage.id,
        self,
        targets,
        { volume }
      )
    },

    'video.member.set_input_sensitivity': (requestMessage, self, targets) => {
      const { vslue: sensitivity } = requestMessage.params
      return unifiedPayload(
        'call.microphone.sensitivity.set',
        requestMessage.id,
        self,
        targets,
        { sensitivity }
      )
    },
  }
