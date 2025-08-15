/**
 * @fileoverview Comprehensive examples for the new dial() API with event listeners
 * 
 * This file demonstrates the simplified dial() API that combines call initiation
 * with event listener attachment in a single async method call.
 * 
 * @author SignalWire Engineering Team
 * @version 1.0.0
 * @since Call Fabric SDK v1.0.0
 */

import { SignalWire, CallSession } from '@signalwire/client'
import type { 
  CallJoinedEventParams,
  MemberJoinedEventParams,
  MemberUpdatedEventParams,
  CallStateEventParams,
  CallLeftEventParams,
  CallLayoutChangedEventParams,
  VideoStreamStartedEventParams,
  VideoRecordingStartedEventParams
} from '@signalwire/core'

// =============================================================================
// BASIC USAGE EXAMPLES
// =============================================================================

/**
 * Example 1: Basic dial with essential event listeners
 * 
 * This is the most common usage pattern - initiating a call with the
 * essential event listeners that most applications need.
 */
async function basicDialExample() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-access-token'
  })

  try {
    const call = await client.dial({
      to: '/public/conference-room',
      audio: true,
      video: true,
      listen: {
        // Called when the call is successfully established
        'call.joined': (params: CallJoinedEventParams) => {
          console.log('✅ Call joined successfully!', {
            roomId: params.room_session.name,
            memberId: params.member_id,
            memberCount: params.room_session.members?.length || 0
          })
        },
        
        // Called when call state changes (created, ringing, answered, ending, ended)
        'call.state': (params: CallStateEventParams) => {
          console.log('📞 Call state changed:', params.call_state)
        },
        
        // Called when new participants join
        'member.joined': (params: MemberJoinedEventParams) => {
          console.log('👋 New member joined:', {
            name: params.member.name,
            memberId: params.member.member_id,
            hasAudio: !params.member.audio_muted,
            hasVideo: !params.member.video_muted
          })
        },
        
        // Called when call ends
        'call.left': (params: CallLeftEventParams) => {
          console.log('👋 Call ended:', params.call_state)
        }
      }
    })

    console.log('Call session created and started:', call.id)
    
    // The call is already started and all events are being listened to
    // You can immediately use call methods
    
  } catch (error) {
    console.error('❌ Failed to dial:', error)
  }
}

// =============================================================================
// ADVANCED USAGE EXAMPLES
// =============================================================================

/**
 * Example 2: Advanced dial with comprehensive event handling
 * 
 * This example shows a more comprehensive set of event listeners that
 * cover most real-world use cases including member management, media
 * controls, and advanced features.
 */
async function advancedDialExample() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-access-token',
    logLevel: 'debug'
  })

  const call = await client.dial({
    to: '/public/meeting-room-123',
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    },
    rootElement: document.getElementById('video-container'),
    userVariables: {
      department: 'engineering',
      role: 'presenter'
    },
    listen: {
      // ========== Call Session Events ==========
      'call.joined': (params: CallJoinedEventParams) => {
        console.log('🎉 Successfully joined the call!', {
          roomName: params.room_session.name,
          selfMemberId: params.member_id,
          totalMembers: params.room_session.members?.length || 0,
          roomSettings: {
            locked: params.room_session.locked,
            recordingActive: params.room_session.recording
          }
        })
        
        // Initialize UI elements based on call state
        updateCallUI(params)
      },

      'call.state': (params: CallStateEventParams) => {
        console.log(`📞 Call state: ${params.call_state}`)
        
        // Handle different call states
        switch (params.call_state) {
          case 'created':
            showStatus('Initializing call...')
            break
          case 'ringing':
            showStatus('Calling...')
            break
          case 'answered':
            showStatus('Connected')
            break
          case 'ending':
            showStatus('Ending call...')
            break
          case 'ended':
            showStatus('Call ended')
            cleanupUI()
            break
        }
      },

      'call.left': (params: CallLeftEventParams) => {
        console.log('👋 Left the call:', params.call_state)
        cleanupUI()
      },

      // ========== Member Management Events ==========
      'member.joined': (params: MemberJoinedEventParams) => {
        const member = params.member
        console.log(`👤 ${member.name} joined the meeting`, {
          memberId: member.member_id,
          audioEnabled: !member.audio_muted,
          videoEnabled: !member.video_muted,
          isVisible: member.visible
        })
        
        // Add member to UI
        addMemberToUI(member)
        
        // Send welcome notification for new members
        if (member.member_id !== call.memberId) {
          showNotification(`${member.name} joined the meeting`, 'info')
        }
      },

      'member.left': (params) => {
        console.log(`👋 ${params.member.name} left the meeting`)
        removeMemberFromUI(params.member.member_id)
        showNotification(`${params.member.name} left the meeting`, 'info')
      },

      'member.updated': (params: MemberUpdatedEventParams) => {
        const member = params.member
        console.log(`🔄 Member updated: ${member.name}`, {
          updated: params.member.updated,
          audioMuted: member.audio_muted,
          videoMuted: member.video_muted,
          handRaised: member.hand_raised
        })
        
        updateMemberUI(member)
      },

      // ========== Granular Member Update Events ==========
      'member.updated.audioMuted': (params: MemberUpdatedEventParams) => {
        const { member } = params
        const action = member.audio_muted ? 'muted' : 'unmuted'
        console.log(`🔇 ${member.name} ${action} their microphone`)
        
        updateMemberAudioStatus(member.member_id, member.audio_muted)
        
        if (member.member_id === call.memberId) {
          updateMicrophoneButton(member.audio_muted)
        }
      },

      'member.updated.videoMuted': (params: MemberUpdatedEventParams) => {
        const { member } = params
        const action = member.video_muted ? 'turned off' : 'turned on'
        console.log(`📹 ${member.name} ${action} their camera`)
        
        updateMemberVideoStatus(member.member_id, member.video_muted)
        
        if (member.member_id === call.memberId) {
          updateCameraButton(member.video_muted)
        }
      },

      'member.updated.handraised': (params: MemberUpdatedEventParams) => {
        const { member } = params
        const action = member.hand_raised ? 'raised' : 'lowered'
        console.log(`✋ ${member.name} ${action} their hand`)
        
        updateMemberHandStatus(member.member_id, member.hand_raised)
        
        if (member.hand_raised) {
          showNotification(`${member.name} raised their hand`, 'info')
        }
      },

      'member.talking': (params) => {
        // Visual indicator for who's talking
        updateMemberTalkingStatus(params.member.member_id, params.member.talking)
      },

      // ========== Layout and Media Events ==========
      'layout.changed': (params: CallLayoutChangedEventParams) => {
        console.log('🎬 Layout changed:', params.layout.name)
        updateLayoutControls(params.layout)
      },

      'stream.started': (params: VideoStreamStartedEventParams) => {
        console.log('📺 Stream started:', params.stream.type)
        handleStreamStarted(params.stream)
      },

      'stream.ended': (params) => {
        console.log('📺 Stream ended:', params.stream.type)
        handleStreamEnded(params.stream)
      },

      // ========== Recording Events ==========
      'recording.started': (params: VideoRecordingStartedEventParams) => {
        console.log('🔴 Recording started:', params.recording.name)
        showRecordingIndicator(true)
        showNotification('Recording started', 'warning')
      },

      'recording.ended': (params) => {
        console.log('⏹️ Recording ended:', params.recording.name)
        showRecordingIndicator(false)
        showNotification('Recording stopped', 'info')
      },

      // ========== Room Events ==========
      'room.subscribed': (params: CallJoinedEventParams) => {
        console.log('🔔 Subscribed to room events')
        enableRoomControls()
      }
    }
  })

  console.log('Advanced call session created:', {
    callId: call.id,
    memberId: call.memberId,
    roomName: call.roomName
  })

  return call
}

// =============================================================================
// ERROR HANDLING EXAMPLES
// =============================================================================

/**
 * Example 3: Comprehensive error handling patterns
 * 
 * This example demonstrates proper error handling for various failure
 * scenarios that can occur during call initialization and execution.
 */
async function errorHandlingExample() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-access-token'
  })

  try {
    const call = await client.dial({
      to: '/public/test-room',
      audio: true,
      video: true,
      listen: {
        'call.joined': (params: CallJoinedEventParams) => {
          console.log('✅ Call joined successfully')
        },
        
        'call.state': (params: CallStateEventParams) => {
          // Handle error states
          if (params.call_state === 'ended' && params.error) {
            console.error('💥 Call ended with error:', params.error)
            handleCallError(params.error)
          }
        },
        
        'call.left': (params: CallLeftEventParams) => {
          if (params.reason === 'error') {
            console.error('💥 Call left due to error')
            handleCallError('Call terminated unexpectedly')
          }
        }
      }
    })

    // Set up additional error handling for the call session
    call.on('destroy', (reason) => {
      console.log('🔄 Call session destroyed:', reason)
      cleanupResources()
    })

    return call

  } catch (error) {
    // Handle different types of errors
    console.error('❌ Dial failed:', error)
    
    if (error.message.includes('Invalid destination')) {
      showError('The destination address is invalid. Please check and try again.')
    } else if (error.message.includes('Authentication')) {
      showError('Authentication failed. Please check your token.')
    } else if (error.message.includes('Permission')) {
      showError('Media permission denied. Please allow camera/microphone access.')
    } else if (error.message.includes('Network')) {
      showError('Network error. Please check your connection and try again.')
    } else {
      showError(`Failed to start call: ${error.message}`)
    }
    
    throw error // Re-throw for upstream handling
  }
}

/**
 * Example 4: Graceful degradation with optional features
 * 
 * This example shows how to handle scenarios where certain features
 * might not be available or fail gracefully.
 */
async function gracefulDegradationExample() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-access-token'
  })

  try {
    // Start with minimal requirements
    const call = await client.dial({
      to: '/public/flexible-room',
      audio: true,
      video: false, // Start audio-only, enable video later if possible
      listen: {
        'call.joined': async (params: CallJoinedEventParams) => {
          console.log('✅ Joined with audio')
          
          // Try to enable video after joining
          try {
            await call.updateVideo({ video: true })
            console.log('📹 Video enabled successfully')
          } catch (videoError) {
            console.warn('⚠️ Could not enable video:', videoError)
            showNotification('Audio-only mode (video unavailable)', 'warning')
          }
          
          // Try to start screen sharing if needed
          try {
            const canScreenShare = await checkScreenShareSupport()
            if (canScreenShare) {
              enableScreenShareButton()
            }
          } catch (error) {
            console.warn('⚠️ Screen sharing not available')
          }
        },
        
        'call.state': (params: CallStateEventParams) => {
          console.log(`Call state: ${params.call_state}`)
        },
        
        // Handle feature-specific errors gracefully
        'member.updated': (params: MemberUpdatedEventParams) => {
          // Update UI based on what features are actually working
          updateUIBasedOnCapabilities(params.member)
        }
      }
    })

    return call

  } catch (error) {
    // Attempt fallback strategies
    console.warn('⚠️ Primary dial failed, attempting fallback...')
    
    try {
      // Fallback: Try audio-only with minimal features
      const fallbackCall = await client.dial({
        to: '/public/flexible-room',
        audio: true,
        video: false,
        listen: {
          'call.joined': (params: CallJoinedEventParams) => {
            console.log('✅ Joined in fallback mode (audio-only)')
            showNotification('Connected in audio-only mode', 'info')
          }
        }
      })
      
      return fallbackCall
      
    } catch (fallbackError) {
      console.error('❌ All dial attempts failed')
      throw new Error(`Could not establish call: ${error.message}`)
    }
  }
}

// =============================================================================
// COMPARISON: OLD VS NEW PATTERNS
// =============================================================================

/**
 * Example 5: Side-by-side comparison of old vs new patterns
 * 
 * This section demonstrates the difference between the old two-step
 * process and the new simplified single-step process.
 */

/**
 * OLD PATTERN (Pre-simplified API)
 * ❌ More verbose, timing-sensitive, potential for event loss
 */
async function oldPatternExample() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-access-token'
  })

  // Step 1: Create call session (doesn't start the call)
  const callSession = client.dial({
    to: '/public/meeting-room',
    audio: true,
    video: true
  })

  // Step 2: Attach event listeners (timing-sensitive!)
  callSession.on('call.joined', (params: CallJoinedEventParams) => {
    console.log('Call joined:', params)
  })

  callSession.on('member.updated', (params: MemberUpdatedEventParams) => {
    console.log('Member updated:', params)
  })

  callSession.on('call.left', (params: CallLeftEventParams) => {
    console.log('Call ended:', params)
  })

  // Step 3: Start the call (events might be missed if not attached quickly enough)
  await callSession.start()

  return callSession
}

/**
 * NEW PATTERN (Simplified API)
 * ✅ Single async call, no timing issues, cleaner code
 */
async function newPatternExample() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-access-token'
  })

  // Single step: Dial with event listeners and start automatically
  const call = await client.dial({
    to: '/public/meeting-room',
    audio: true,
    video: true,
    listen: {
      'call.joined': (params: CallJoinedEventParams) => {
        console.log('Call joined:', params)
      },
      'member.updated': (params: MemberUpdatedEventParams) => {
        console.log('Member updated:', params)
      },
      'call.left': (params: CallLeftEventParams) => {
        console.log('Call ended:', params)
      }
    }
  })

  // Call is already started and all events are being listened to
  return call
}

// =============================================================================
// SPECIALIZED USE CASES
// =============================================================================

/**
 * Example 6: Conference room with moderator features
 */
async function conferenceModeratorExample() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-moderator-token'
  })

  const call = await client.dial({
    to: '/public/conference-main',
    audio: true,
    video: true,
    userVariables: {
      role: 'moderator',
      permissions: ['mute_others', 'kick_members', 'record']
    },
    listen: {
      'call.joined': (params: CallJoinedEventParams) => {
        console.log('🎯 Moderator joined conference')
        enableModeratorControls()
        
        // Auto-mute all except moderator if configured
        if (shouldAutoMuteNewMembers()) {
          call.audioMute({ memberId: 'all' })
        }
      },

      'member.joined': (params: MemberJoinedEventParams) => {
        const member = params.member
        console.log(`👤 New participant: ${member.name}`)
        
        // Auto-mute new members if enabled
        if (shouldAutoMuteNewMembers() && member.member_id !== call.memberId) {
          call.audioMute({ memberId: member.member_id })
        }
        
        // Add to participant list with controls
        addParticipantWithControls(member)
      },

      'member.updated.handraised': (params: MemberUpdatedEventParams) => {
        if (params.member.hand_raised) {
          showModeratorAlert(`${params.member.name} raised their hand`, {
            actions: [
              { label: 'Unmute', action: () => call.audioUnmute({ memberId: params.member.member_id }) },
              { label: 'Ignore', action: () => {} }
            ]
          })
        }
      }
    }
  })

  return call
}

/**
 * Example 7: Customer support call with screen sharing
 */
async function customerSupportExample() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-support-token'
  })

  const call = await client.dial({
    to: '/public/support-session-123',
    audio: true,
    video: true,
    userVariables: {
      department: 'technical-support',
      ticketId: 'TICKET-123456',
      customerType: 'premium'
    },
    listen: {
      'call.joined': (params: CallJoinedEventParams) => {
        console.log('🎧 Support call established')
        
        // Initialize support tools
        initializeSupportTools()
        startCallRecording() // For quality assurance
        
        // Show customer info
        displayCustomerInfo(params.room_session.name)
      },

      'member.joined': (params: MemberJoinedEventParams) => {
        if (params.member.member_id !== call.memberId) {
          console.log('👋 Customer joined the call')
          greetCustomer(params.member.name)
          
          // Offer screen sharing
          setTimeout(() => {
            showScreenShareOffer()
          }, 5000)
        }
      },

      'stream.started': (params: VideoStreamStartedEventParams) => {
        if (params.stream.type === 'screen') {
          console.log('🖥️ Screen sharing started')
          adjustLayoutForScreenShare()
          enableScreenShareControls()
        }
      },

      'call.left': (params: CallLeftEventParams) => {
        console.log('📞 Support call ended')
        
        // Save call summary
        saveSupportCallSummary({
          duration: call.duration,
          resolution: 'resolved', // This would be set by support agent
          notes: getSupportNotes()
        })
      }
    }
  })

  return call
}

// =============================================================================
// UTILITY FUNCTIONS (UI Helpers)
// =============================================================================

// These functions would be implemented based on your UI framework
function updateCallUI(params: CallJoinedEventParams) {
  // Update UI with call information
  console.log('Updating call UI...')
}

function showStatus(message: string) {
  console.log(`Status: ${message}`)
}

function cleanupUI() {
  console.log('Cleaning up UI...')
}

function addMemberToUI(member: any) {
  console.log(`Adding member to UI: ${member.name}`)
}

function removeMemberFromUI(memberId: string) {
  console.log(`Removing member from UI: ${memberId}`)
}

function updateMemberUI(member: any) {
  console.log(`Updating member UI: ${member.name}`)
}

function updateMemberAudioStatus(memberId: string, muted: boolean) {
  console.log(`Member ${memberId} audio: ${muted ? 'muted' : 'unmuted'}`)
}

function updateMemberVideoStatus(memberId: string, muted: boolean) {
  console.log(`Member ${memberId} video: ${muted ? 'off' : 'on'}`)
}

function updateMemberHandStatus(memberId: string, raised: boolean) {
  console.log(`Member ${memberId} hand: ${raised ? 'raised' : 'lowered'}`)
}

function updateMemberTalkingStatus(memberId: string, talking: boolean) {
  console.log(`Member ${memberId} talking: ${talking}`)
}

function updateMicrophoneButton(muted: boolean) {
  console.log(`Microphone button: ${muted ? 'muted' : 'unmuted'}`)
}

function updateCameraButton(muted: boolean) {
  console.log(`Camera button: ${muted ? 'off' : 'on'}`)
}

function updateLayoutControls(layout: any) {
  console.log(`Layout changed to: ${layout.name}`)
}

function showNotification(message: string, type: 'info' | 'warning' | 'error') {
  console.log(`[${type.toUpperCase()}] ${message}`)
}

function showError(message: string) {
  console.error(`Error: ${message}`)
}

function handleStreamStarted(stream: any) {
  console.log(`Stream started: ${stream.type}`)
}

function handleStreamEnded(stream: any) {
  console.log(`Stream ended: ${stream.type}`)
}

function showRecordingIndicator(recording: boolean) {
  console.log(`Recording indicator: ${recording ? 'ON' : 'OFF'}`)
}

function enableRoomControls() {
  console.log('Room controls enabled')
}

function handleCallError(error: any) {
  console.error('Call error:', error)
}

function cleanupResources() {
  console.log('Cleaning up resources...')
}

function checkScreenShareSupport(): Promise<boolean> {
  return Promise.resolve(navigator.mediaDevices?.getDisplayMedia !== undefined)
}

function enableScreenShareButton() {
  console.log('Screen share button enabled')
}

function updateUIBasedOnCapabilities(member: any) {
  console.log('Updating UI based on member capabilities')
}

function enableModeratorControls() {
  console.log('Moderator controls enabled')
}

function shouldAutoMuteNewMembers(): boolean {
  return true // This would be a configurable setting
}

function addParticipantWithControls(member: any) {
  console.log(`Adding participant with moderator controls: ${member.name}`)
}

function showModeratorAlert(message: string, options: any) {
  console.log(`Moderator alert: ${message}`)
}

function initializeSupportTools() {
  console.log('Support tools initialized')
}

function startCallRecording() {
  console.log('Call recording started')
}

function displayCustomerInfo(roomName: string) {
  console.log(`Customer info displayed for room: ${roomName}`)
}

function greetCustomer(customerName: string) {
  console.log(`Greeting customer: ${customerName}`)
}

function showScreenShareOffer() {
  console.log('Screen share offer displayed')
}

function adjustLayoutForScreenShare() {
  console.log('Layout adjusted for screen sharing')
}

function enableScreenShareControls() {
  console.log('Screen share controls enabled')
}

function getSupportNotes(): string {
  return 'Support call completed successfully'
}

function saveSupportCallSummary(summary: any) {
  console.log('Support call summary saved:', summary)
}

// =============================================================================
// EXPORTS FOR DOCUMENTATION
// =============================================================================

export {
  basicDialExample,
  advancedDialExample,
  errorHandlingExample,
  gracefulDegradationExample,
  oldPatternExample,
  newPatternExample,
  conferenceModeratorExample,
  customerSupportExample
}

/**
 * Usage Examples Summary:
 * 
 * 1. Basic Usage:
 *    - Simple dial with essential events
 *    - Perfect for most applications
 * 
 * 2. Advanced Usage:
 *    - Comprehensive event handling
 *    - Full feature coverage
 * 
 * 3. Error Handling:
 *    - Proper error management
 *    - Graceful fallbacks
 * 
 * 4. Comparison:
 *    - Old vs new patterns
 *    - Migration guidance
 * 
 * 5. Specialized:
 *    - Conference moderation
 *    - Customer support workflows
 */