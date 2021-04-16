export const STORAGE_PREFIX = '@signalwire:'
export const ADD = 'add'
export const REMOVE = 'remove'
export const SESSION_ID = 'sessId'
export const VERTO_PROTOCOL = 'verto-protocol'
export const DEFAULT_HOST = 'wss://relay.signalwire.com'

export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

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

export enum SwWebRTCCallState {
  New = 'new',
  Requesting = 'requesting',
  Trying = 'trying',
  Recovering = 'recovering',
  Ringing = 'ringing',
  Answering = 'answering',
  Early = 'early',
  Active = 'active',
  Held = 'held',
  Hangup = 'hangup',
  Destroy = 'destroy',
  Purge = 'purge',
}

// export enum SwEvent {
//   // Socket Events
//   SocketOpen = 'signalwire.socket.open',
//   SocketClose = 'signalwire.socket.close',
//   SocketError = 'signalwire.socket.error',
//   SocketMessage = 'signalwire.socket.message',

//   // Internal events
//   SpeedTest = 'signalwire.internal.speedtest',

//   // Global Events
//   Ready = 'signalwire.ready',
//   Error = 'signalwire.error',
//   Notification = 'signalwire.notification',

//   // Blade Events
//   Messages = 'signalwire.messages',
//   Calls = 'signalwire.calls',

//   // RTC Events
//   MediaError = 'signalwire.rtc.mediaError',
// }
