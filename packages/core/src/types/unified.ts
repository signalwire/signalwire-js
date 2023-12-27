/**
 * Public event types
 */

export type UnifiedCallConnect = 'call.connect'
export type UnifiedCallCollect = 'call.collect'
export type UnifiedCallDenoise = 'call.denoise'
export type UnifiedCallDetect = 'call.detect'
export type UnifiedCallDial = 'call.dial'
export type UnifiedCallSendDigits = 'call.send_digits'
export type UnifiedCallFax = 'call.fax'
export type UnifiedCallHold = 'call.hold'
export type UnifiedCallPlayBack = 'call.playback'
export type UnifiedCallReceived = 'call.received'
export type UnifiedCallRecording = 'call.recording'
export type UnifiedCallRefer = 'call.refer'
export type UnifiedCallState = 'call.state'
export type UnifiedCallOutboundStreamStarted = 'call.outbound_stream.started'
export type UnifiedCallOutboundStreamEnded = 'call.outbound_stream.ended'
export type UnifiedCallStarted = 'call.started'
export type UnifiedCallEnded = 'call.ended'
export type UnifiedCallJoined = 'call.joined'
export type UnifiedCallLeft = 'call.left'
export type UnifiedCallUpdated = 'call.updated'
export type UnifiedCallAudienceCount = 'call.audience_count'
export type UnifiedCallPrompt = 'call.prompt'

export type UnifiedMemberJoined = 'member.joined'
export type UnifiedMemberLeft = 'member.left'
export type UnifiedMemberTalking = 'member.talking'
export type UnifiedMemberPromoted = 'member.promoted'
export type UnifiedMemberDemoted = 'member.demoted'
export type UnifiedMemberUpdated = 'member.updated'
export type UnifiedLayoutChanged = 'layout.changed'

export type UnifiedStreamEventNames =
  | UnifiedCallOutboundStreamStarted
  | UnifiedCallOutboundStreamEnded

export type UnifiedEventNames =
  | UnifiedCallConnect
  | UnifiedCallCollect
  | UnifiedCallDenoise
  | UnifiedCallDetect
  | UnifiedCallDial
  | UnifiedCallSendDigits
  | UnifiedCallFax
  | UnifiedCallHold
  | UnifiedCallPlayBack
  | UnifiedCallReceived
  | UnifiedCallRecording
  | UnifiedCallRefer
  | UnifiedCallState
  | UnifiedStreamEventNames
  | UnifiedCallStarted
  | UnifiedCallEnded
  | UnifiedCallJoined
  | UnifiedCallLeft
  | UnifiedCallUpdated
  | UnifiedCallAudienceCount
  | UnifiedCallPrompt
  | UnifiedMemberJoined
  | UnifiedMemberLeft
  | UnifiedMemberTalking
  | UnifiedMemberPromoted
  | UnifiedMemberDemoted
  | UnifiedMemberUpdated
  | UnifiedLayoutChanged

export type UnifiedVideoEventNames =
  | UnifiedStreamEventNames
  | UnifiedCallPlayBack
  | UnifiedCallRecording
  | UnifiedCallLeft
  | UnifiedCallUpdated
  | UnifiedCallAudienceCount
  | UnifiedMemberJoined
  | UnifiedMemberLeft
  | UnifiedMemberTalking
  | UnifiedMemberPromoted
  | UnifiedMemberDemoted
  | UnifiedMemberUpdated
  | UnifiedLayoutChanged
