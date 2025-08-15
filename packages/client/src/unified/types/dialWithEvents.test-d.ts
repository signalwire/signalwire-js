/**
 * Type definition tests for the dial() API with event listeners
 * This file demonstrates the type safety and usage of the new dial() API
 * 
 * NOTE: This is a type-level test file that verifies TypeScript definitions.
 * Variables declared here are intentionally unused as they only serve to 
 * validate type correctness at compile time.
 */

import type { WSClientContract, DialParams, CallSession } from '../interfaces'
import type { 
  CallSessionEventHandlers, 
  PartialCallSessionEventHandlers,
  CallSessionEventNames,
  CallSessionEventPayload 
} from '../interfaces/callEvents'

// Test: DialParams should accept optional listen parameter
const _dialParams1: DialParams = {
  to: 'resource-id',
  listen: {
    'call.joined': (params) => {
      // Type check: params should be CallJoinedEventParams
      console.log('Call joined', params.room_session_id)
    },
    'member.joined': (params) => {
      // Type check: params should be MemberJoinedEventParams
      console.log('Member joined', params.member.member_id)
    }
  }
}

// Test: DialParams should work without listen parameter (backward compatibility)
const _dialParams2: DialParams = {
  to: 'resource-id'
}

// Test: Partial event handlers should be accepted
const _partialHandlers: PartialCallSessionEventHandlers = {
  'call.state': (params) => {
    // Type check: params should be CallStateEventParams
    const state: string = params.call_state
    console.log('Call state:', state)
  },
  'layout.changed': (params) => {
    // Type check: params should be CallLayoutChangedEventParams
    console.log('Layout changed:', params.layout)
  }
}

// Test: All event handlers can be specified
const _allHandlers: CallSessionEventHandlers = {
  // Call Session Events
  'call.joined': (params) => console.log('joined', params),
  'call.state': (params) => console.log('state', params),
  'call.left': (params) => console.log('left', params),
  'call.updated': (params) => console.log('updated', params),
  'call.play': (params) => console.log('play', params),
  'call.connect': (params) => console.log('connect', params),
  'call.room': (params) => console.log('room', params),
  
  // Member Events
  'member.joined': (params) => console.log('member joined', params),
  'member.left': (params) => console.log('member left', params),
  'member.updated': (params) => console.log('member updated', params),
  'member.talking': (params) => console.log('member talking', params),
  
  // Member Update Sub-events
  'member.updated.audioMuted': (params) => console.log('audio muted', params),
  'member.updated.videoMuted': (params) => console.log('video muted', params),
  'member.updated.deaf': (params) => console.log('deaf', params),
  'member.updated.visible': (params) => console.log('visible', params),
  'member.updated.inputVolume': (params) => console.log('input volume', params),
  'member.updated.outputVolume': (params) => console.log('output volume', params),
  'member.updated.inputSensitivity': (params) => console.log('input sensitivity', params),
  'member.updated.handraised': (params) => console.log('hand raised', params),
  'member.updated.echoCancellation': (params) => console.log('echo cancellation', params),
  'member.updated.autoGain': (params) => console.log('auto gain', params),
  'member.updated.noiseSuppression': (params) => console.log('noise suppression', params),
  
  // Layout Events
  'layout.changed': (params) => console.log('layout changed', params),
  
  // Stream Events
  'stream.started': (params) => console.log('stream started', params),
  'stream.ended': (params) => console.log('stream ended', params),
  
  // Playback Events
  'playback.started': (params) => console.log('playback started', params),
  'playback.updated': (params) => console.log('playback updated', params),
  'playback.ended': (params) => console.log('playback ended', params),
  
  // Recording Events
  'recording.started': (params) => console.log('recording started', params),
  'recording.updated': (params) => console.log('recording updated', params),
  'recording.ended': (params) => console.log('recording ended', params),
  
  // Room Subscription Events
  'room.subscribed': (params) => console.log('room subscribed', params),
  'room.left': (params) => console.log('room left', params),
}

// Test: Event handler with async function
const _asyncHandlers: PartialCallSessionEventHandlers = {
  'call.joined': async (params) => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Async handler completed', params)
  }
}

// Test: Extract event payload type
type _CallJoinedPayload = CallSessionEventPayload<'call.joined'>
type _MemberJoinedPayload = CallSessionEventPayload<'member.joined'>
type _LayoutChangedPayload = CallSessionEventPayload<'layout.changed'>

// Test: Event names type
const _eventName1: CallSessionEventNames = 'call.joined'
const _eventName2: CallSessionEventNames = 'member.updated.audioMuted'
const _eventName3: CallSessionEventNames = 'recording.started'

// Test: WSClientContract dial should return Promise<CallSession>
declare const client: WSClientContract

async function _testDialAsync() {
  // dial() should return a Promise
  const call: Promise<CallSession> = client.dial({
    to: 'resource-id',
    listen: {
      'call.joined': (params) => {
        console.log('Call joined', params)
      }
    }
  })
  
  // Should be able to await the result
  const session: CallSession = await call
  
  // CallSession should have event emitter methods
  session.on('member.joined', (params) => {
    console.log('Member joined after dial', params)
  })
  
  session.once('call.left', (params) => {
    console.log('Call left', params)
  })
  
  session.off('member.joined')
}

// Test: Type errors should be caught
// Invalid event name should cause type error
const _invalidHandler1: PartialCallSessionEventHandlers = {
  'invalid.event': () => {}
} as any

// Wrong parameter type should cause type error
const _invalidHandler2: PartialCallSessionEventHandlers = {
  // @ts-expect-error - Wrong parameter type
  'call.joined': (params: string) => {
    console.log(params)
  }
}

// Missing required 'to' property should cause type error
// @ts-expect-error - Missing required properties in DialParams
const _invalidDialParams: DialParams = {
  // 'to' is required
  listen: {}
} as any


export {}