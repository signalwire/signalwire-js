import { CallOptions } from './interfaces'

/**
 * TODO: Audit enums and remove unused
 */

export enum PeerType {
  Offer = 'offer',
  Answer = 'answer',
}

export enum Direction {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

export enum Notification {
  Generic = 'event',
  ParticipantData = 'participantData',
  ConferenceUpdate = 'conferenceUpdate',
  CallUpdate = 'callUpdate',
  VertoClientReady = 'vertoClientReady',
  UserMediaError = 'userMediaError',
  RefreshToken = 'refreshToken',
  Prompt = 'prompt',
  Announce = 'announce',
  DeviceUpdated = 'deviceUpdated',
  MediaParams = 'mediaParams',
}

export const DEFAULT_CALL_OPTIONS: CallOptions = {
  destinationNumber: '',
  remoteCallerName: 'Outbound Call',
  remoteCallerNumber: '',
  callerName: '',
  callerNumber: '',
  audio: true,
  video: true,
  useStereo: false,
  attach: false,
  screenShare: false,
  secondSource: false,
  userVariables: {},
  requestTimeout: 10 * 1000,
  autoApplyMediaParams: true,
  iceGatheringTimeout: 2 * 1000,
}

export enum Role {
  Participant = 'participant',
  Moderator = 'moderator',
}

export enum ConferenceAction {
  Join = 'join',
  Leave = 'leave',
  Bootstrap = 'bootstrap',
  Add = 'add',
  Modify = 'modify',
  Delete = 'delete',
  Clear = 'clear',
  ChatMessage = 'chatMessage',
  LayerInfo = 'layerInfo',
  LogoInfo = 'logoInfo',
  LayoutInfo = 'layoutInfo',
  LayoutList = 'layoutList',
  ModCmdResponse = 'modCommandResponse',
  ConferenceInfo = 'conferenceInfo',
  CaptionInfo = 'captionInfo',
}

export enum DeviceType {
  Video = 'videoinput',
  AudioIn = 'audioinput',
  AudioOut = 'audiooutput',
}
