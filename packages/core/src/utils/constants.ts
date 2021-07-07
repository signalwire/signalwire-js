export const STORAGE_PREFIX = '@signalwire:'
export const ADD = 'add'
export const REMOVE = 'remove'
export const SESSION_ID = 'sessId'
export const DEFAULT_HOST = 'wss://relay.signalwire.com'

export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export const GLOBAL_VIDEO_EVENTS = ['room.started', 'room.ended'] as const

export enum BladeMethod {
  Broadcast = 'blade.broadcast',
  Disconnect = 'blade.disconnect',
  Connect = 'blade.connect',
  Ping = 'blade.ping',
  Reauthenticate = 'blade.reauthenticate',
  Execute = 'blade.execute',
}

export enum VertoMethod {
  Invite = 'verto.invite',
  Attach = 'verto.attach',
  Answer = 'verto.answer',
  Info = 'verto.info',
  Display = 'verto.display',
  Media = 'verto.media',
  Event = 'verto.event',
  Bye = 'verto.bye',
  Punt = 'verto.punt',
  Broadcast = 'verto.broadcast',
  Subscribe = 'verto.subscribe',
  Unsubscribe = 'verto.unsubscribe',
  ClientReady = 'verto.clientReady',
  Modify = 'verto.modify',
  MediaParams = 'verto.mediaParams',
  Prompt = 'verto.prompt',
  JsApi = 'jsapi',
  Stats = 'verto.stats',
  Ping = 'verto.ping',
  Announce = 'verto.announce',
}
