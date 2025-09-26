import { randomUUID } from 'crypto'
import type { JSONRPCMethod } from '@signalwire/core/'

type EventCategory =
  | 'transport'
  | 'connection'
  | 'callSession'
  | 'conversations'
  | 'tests'

type Event =
  | 'websocket_open'
  | 'websocket_close'
  | 'websocket_error'
  | 'websocket_message'
  | 'websocket_closed'

type Params = {
  call_id?: string
  room_session?: {
    id?: string
  }
}

type Result = {
  call_id?: string
  room_session?: {
    id?: string
  }
}

type Metadata = Record<string, any>

type Payload = {
  error?: any
  method?: JSONRPCMethod
  event?: Event
  params?: Params
  result?: Result
  metadata?: Metadata
}

export class SDKEvent {
  constructor(
    public id: string,
    public timestamp: number,
    public direction: 'send' | 'recv',
    public category: 'request' | 'response' | 'notification' | 'connection',
    public eventType: string,
    public eventCategory: EventCategory,
    public payload: Payload,
    public context: {
      isCallEvent: boolean
      isRoomEvent: boolean
      isConnectionEvent: boolean
      isError: boolean
      callId?: string
      roomId?: string
    },
    public method?: JSONRPCMethod,
    public metadata?: Metadata
  ) {}

  // Utility methods for common checks
  isCallRelated(): boolean {
    return this.context.isCallEvent
  }

  isRoomRelated(): boolean {
    return this.context.isRoomEvent
  }

  isConnectionRelated(): boolean {
    return this.context.isConnectionEvent
  }

  isError(): boolean {
    return this.context.isError
  }

  isSent(): boolean {
    return this.direction === 'send'
  }

  isReceived(): boolean {
    return this.direction === 'recv'
  }

  // Category checks
  isTransport(): boolean {
    return this.eventCategory === 'transport'
  }

  isConnection(): boolean {
    return this.eventCategory === 'connection'
  }

  isCallSession(): boolean {
    return this.eventCategory === 'callSession'
  }

  isConversations(): boolean {
    return this.eventCategory === 'conversations'
  }

  isTests(): boolean {
    return this.eventCategory === 'tests'
  }
}

export interface EventStats {
  totalEvents: number
  sentEvents: number
  receivedEvents: number
  errorEvents: number
  callEvents: number
  roomEvents: number
  connectionEvents: number
  // Category-based counts
  transportCategoryEvents: number
  connectionCategoryEvents: number
  callSessionCategoryEvents: number
  conversationsCategoryEvents: number
  testsCategoryEvents: number
}

/**
 * TestContext class for tracking SDK events during e2e tests.
 *
 * Usage:
 * - Automatically set up via Playwright fixtures
 * - Events are captured via WebSocket monitoring
 * - Context dumped to console and attachments on test failures
 */
export class TestContext {
  private sdkEvents: SDKEvent[] = []
  private startTime: number = Date.now()

  addSDKEvent(payload: Payload, direction: 'send' | 'recv') {
    const event = this.categorizeSDKEvent(payload, direction)
    this.sdkEvents.push(event)
  }

  /**
   * Get comprehensive statistics about captured events.
   * Includes both legacy boolean-based counts and new category-based counts.
   */
  getStats() {
    return {
      totalEvents: this.sdkEvents.length,
      sentEvents: this.sdkEvents.filter((event) => event.isSent()).length,
      receivedEvents: this.sdkEvents.filter((event) => event.isReceived())
        .length,
      errorEvents: this.sdkEvents.filter((event) => event.isError()).length,
      callEvents: this.sdkEvents.filter((event) => event.isCallRelated())
        .length,
      roomEvents: this.sdkEvents.filter((event) => event.isRoomRelated())
        .length,
      connectionEvents: this.sdkEvents.filter((event) =>
        event.isConnectionRelated()
      ).length,
      // Category-based counts
      transportCategoryEvents: this.sdkEvents.filter((event) =>
        event.isTransport()
      ).length,
      connectionCategoryEvents: this.sdkEvents.filter((event) =>
        event.isConnection()
      ).length,
      callSessionCategoryEvents: this.sdkEvents.filter((event) =>
        event.isCallSession()
      ).length,
      conversationsCategoryEvents: this.sdkEvents.filter((event) =>
        event.isConversations()
      ).length,
      testsCategoryEvents: this.sdkEvents.filter((event) => event.isTests())
        .length,
    }
  }

  getAllEvents() {
    return [...this.sdkEvents]
  }

  getTestDuration() {
    return Date.now() - this.startTime
  }

  private categorizeSDKEvent(
    payload: Payload,
    direction: 'send' | 'recv'
  ): SDKEvent {
    const timestamp = Date.now()
    const id = `${timestamp}-${randomUUID()}`

    const method = payload.method || ''

    const context = {
      isCallEvent: method.includes('call.') || method.includes('calling.'),
      isRoomEvent:
        method.includes('room.') ||
        method.includes('member.') ||
        method.includes('layout.'),
      isConnectionEvent:
        method.startsWith('signalwire.') || method.startsWith('subscriber.'),
      isError: Boolean(payload.error),
      callId: payload.params?.call_id || payload.result?.call_id,
      roomId:
        payload.params?.room_session?.id || payload.result?.room_session?.id,
    }

    return new SDKEvent(
      id,
      timestamp,
      direction,
      this.getCategory(payload),
      this.getEventType(payload),
      this.categorizeMethod(payload),
      payload,
      context,
      payload.method,
      payload.metadata
    )
  }

  private getCategory(payload: Payload) {
    // JSON-RPC 2.0 specification:
    // - Response: Has 'id' and ('result' OR 'error')
    // - Request: Has 'method' and 'id'
    // - Notification: Has 'method' but no 'id'
    const hasId = 'id' in payload
    const hasMethod = 'method' in payload
    const hasResult = 'result' in payload
    const hasError = 'error' in payload

    // Response: has id and (result or error), typically no method
    if (hasId && (hasResult || hasError)) {
      return 'response' as const
    }

    // Request: has both method and id
    if (hasMethod && hasId) {
      return 'request' as const
    }

    // Notification: has method but no id
    if (hasMethod && !hasId) {
      return 'notification' as const
    }

    // Fallback for connection events (websocket events, etc.)
    return 'connection' as const
  }

  private categorizeMethod(payload: Payload): EventCategory {
    const method = payload.method || ''
    const event = payload.event || ''

    if (
      event === 'websocket_open' ||
      event === 'websocket_close' ||
      event === 'websocket_error' ||
      event === 'websocket_message' ||
      event === 'websocket_closed'
    ) {
      return 'transport'
    }

    // SignalWire connection events
    if (method.startsWith('signalwire.') || method.startsWith('subscriber.')) {
      return 'connection'
    }

    // Conversations events
    if (method.startsWith('conversations.')) {
      return 'conversations'
    }

    // Test events (artificial events)
    if (method.startsWith('test.') || method.includes('artificial')) {
      return 'tests'
    }

    // Everything else is callSession (call, room, member, chat, verto, voice, etc.)
    // Note: verto.* are call signaling events, not transport events
    return 'callSession'
  }

  private getEventType(payload: {
    error?: any
    method?: JSONRPCMethod
    event?: Event
  }) {
    if (payload.error) {
      return payload.error.message
    }

    if (payload.method) {
      return payload.method
    }

    if (payload.event) {
      return payload.event
    }

    return 'unknown'
  }
}
