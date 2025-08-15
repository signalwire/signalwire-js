/**
 * @fileoverview JavaScript examples for the new dial() API with event listeners
 * 
 * This file demonstrates the simplified dial() API using plain JavaScript.
 * All examples are compatible with modern browsers and Node.js environments.
 * 
 * @author SignalWire Engineering Team
 * @version 1.0.0
 * @since Call Fabric SDK v1.0.0
 */

import { SignalWire } from '@signalwire/client'

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
        'call.joined': (params) => {
          console.log('✅ Call joined successfully!', {
            roomId: params.room_session.name,
            memberId: params.member_id,
            memberCount: params.room_session.members?.length || 0
          })
        },
        
        // Called when call state changes (created, ringing, answered, ending, ended)
        'call.state': (params) => {
          console.log('📞 Call state changed:', params.call_state)
        },
        
        // Called when new participants join
        'member.joined': (params) => {
          console.log('👋 New member joined:', {
            name: params.member.name,
            memberId: params.member.member_id,
            hasAudio: !params.member.audio_muted,
            hasVideo: !params.member.video_muted
          })
        },
        
        // Called when call ends
        'call.left': (params) => {
          console.log('👋 Call ended:', params.call_state)
        }
      }
    })

    console.log('Call session created and started:', call.id)
    
    // The call is already started and all events are being listened to
    return call
    
  } catch (error) {
    console.error('❌ Failed to dial:', error)
    throw error
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
      'call.joined': (params) => {
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

      'call.state': (params) => {
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

      'call.left': (params) => {
        console.log('👋 Left the call:', params.call_state)
        cleanupUI()
      },

      // ========== Member Management Events ==========
      'member.joined': (params) => {
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

      'member.updated': (params) => {
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
      'member.updated.audioMuted': (params) => {
        const { member } = params
        const action = member.audio_muted ? 'muted' : 'unmuted'
        console.log(`🔇 ${member.name} ${action} their microphone`)
        
        updateMemberAudioStatus(member.member_id, member.audio_muted)
        
        if (member.member_id === call.memberId) {
          updateMicrophoneButton(member.audio_muted)
        }
      },

      'member.updated.videoMuted': (params) => {
        const { member } = params
        const action = member.video_muted ? 'turned off' : 'turned on'
        console.log(`📹 ${member.name} ${action} their camera`)
        
        updateMemberVideoStatus(member.member_id, member.video_muted)
        
        if (member.member_id === call.memberId) {
          updateCameraButton(member.video_muted)
        }
      },

      'member.updated.handraised': (params) => {
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
      'layout.changed': (params) => {
        console.log('🎬 Layout changed:', params.layout.name)
        updateLayoutControls(params.layout)
      },

      'stream.started': (params) => {
        console.log('📺 Stream started:', params.stream.type)
        handleStreamStarted(params.stream)
      },

      'stream.ended': (params) => {
        console.log('📺 Stream ended:', params.stream.type)
        handleStreamEnded(params.stream)
      },

      // ========== Recording Events ==========
      'recording.started': (params) => {
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
      'room.subscribed': (params) => {
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
        'call.joined': (params) => {
          console.log('✅ Call joined successfully')
        },
        
        'call.state': (params) => {
          // Handle error states
          if (params.call_state === 'ended' && params.error) {
            console.error('💥 Call ended with error:', params.error)
            handleCallError(params.error)
          }
        },
        
        'call.left': (params) => {
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
        'call.joined': async (params) => {
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
        
        'call.state': (params) => {
          console.log(`Call state: ${params.call_state}`)
        },
        
        // Handle feature-specific errors gracefully
        'member.updated': (params) => {
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
          'call.joined': (params) => {
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
  callSession.on('call.joined', (params) => {
    console.log('Call joined:', params)
  })

  callSession.on('member.updated', (params) => {
    console.log('Member updated:', params)
  })

  callSession.on('call.left', (params) => {
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
      'call.joined': (params) => {
        console.log('Call joined:', params)
      },
      'member.updated': (params) => {
        console.log('Member updated:', params)
      },
      'call.left': (params) => {
        console.log('Call ended:', params)
      }
    }
  })

  // Call is already started and all events are being listened to
  return call
}

// =============================================================================
// BROWSER-SPECIFIC EXAMPLES
// =============================================================================

/**
 * Example 6: Browser integration with DOM manipulation
 */
async function browserIntegrationExample() {
  // Initialize SignalWire client
  const client = await SignalWire({
    host: document.getElementById('host-input').value,
    token: document.getElementById('token-input').value
  })

  // Get UI elements
  const videoContainer = document.getElementById('video-container')
  const membersList = document.getElementById('members-list')
  const statusElement = document.getElementById('call-status')
  const muteButton = document.getElementById('mute-button')
  const videoButton = document.getElementById('video-button')

  const call = await client.dial({
    to: document.getElementById('destination-input').value,
    audio: true,
    video: true,
    rootElement: videoContainer,
    listen: {
      'call.joined': (params) => {
        statusElement.textContent = 'Connected'
        statusElement.className = 'status connected'
        
        // Enable call controls
        muteButton.disabled = false
        videoButton.disabled = false
        
        console.log('Call joined with', params.room_session.members.length, 'members')
      },

      'call.state': (params) => {
        statusElement.textContent = capitalizeFirst(params.call_state)
        statusElement.className = `status ${params.call_state}`
      },

      'member.joined': (params) => {
        // Add member to the members list
        const memberElement = document.createElement('div')
        memberElement.id = `member-${params.member.member_id}`
        memberElement.className = 'member-item'
        memberElement.innerHTML = `
          <span class="member-name">${params.member.name}</span>
          <span class="member-status">
            <span class="audio-status ${params.member.audio_muted ? 'muted' : 'unmuted'}">🎤</span>
            <span class="video-status ${params.member.video_muted ? 'off' : 'on'}">📹</span>
          </span>
        `
        membersList.appendChild(memberElement)
      },

      'member.left': (params) => {
        // Remove member from the list
        const memberElement = document.getElementById(`member-${params.member.member_id}`)
        if (memberElement) {
          memberElement.remove()
        }
      },

      'member.updated.audioMuted': (params) => {
        // Update audio status indicator
        const memberElement = document.getElementById(`member-${params.member.member_id}`)
        if (memberElement) {
          const audioStatus = memberElement.querySelector('.audio-status')
          audioStatus.className = `audio-status ${params.member.audio_muted ? 'muted' : 'unmuted'}`
        }
        
        // Update own mute button if it's the current user
        if (params.member.member_id === call.memberId) {
          muteButton.textContent = params.member.audio_muted ? 'Unmute' : 'Mute'
          muteButton.className = params.member.audio_muted ? 'unmute' : 'mute'
        }
      },

      'member.updated.videoMuted': (params) => {
        // Update video status indicator
        const memberElement = document.getElementById(`member-${params.member.member_id}`)
        if (memberElement) {
          const videoStatus = memberElement.querySelector('.video-status')
          videoStatus.className = `video-status ${params.member.video_muted ? 'off' : 'on'}`
        }
        
        // Update own video button if it's the current user
        if (params.member.member_id === call.memberId) {
          videoButton.textContent = params.member.video_muted ? 'Turn On Video' : 'Turn Off Video'
          videoButton.className = params.member.video_muted ? 'video-off' : 'video-on'
        }
      },

      'call.left': (params) => {
        statusElement.textContent = 'Disconnected'
        statusElement.className = 'status disconnected'
        
        // Disable call controls
        muteButton.disabled = true
        videoButton.disabled = true
        
        // Clear members list
        membersList.innerHTML = ''
      }
    }
  })

  // Set up button event handlers
  muteButton.addEventListener('click', async () => {
    try {
      if (muteButton.textContent === 'Mute') {
        await call.audioMute()
      } else {
        await call.audioUnmute()
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error)
    }
  })

  videoButton.addEventListener('click', async () => {
    try {
      if (videoButton.textContent === 'Turn Off Video') {
        await call.videoMute()
      } else {
        await call.videoUnmute()
      }
    } catch (error) {
      console.error('Failed to toggle video:', error)
    }
  })

  return call
}

// =============================================================================
// MOBILE-OPTIMIZED EXAMPLE
// =============================================================================

/**
 * Example 7: Mobile-optimized call handling
 */
async function mobileOptimizedExample() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-access-token'
  })

  // Detect if we're on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  const call = await client.dial({
    to: '/public/mobile-room',
    audio: true,
    video: !isMobile, // Start video-only on desktop by default
    listen: {
      'call.joined': (params) => {
        console.log('📱 Mobile call joined')
        
        if (isMobile) {
          // Optimize for mobile experience
          enableMobileOptimizations()
          
          // Show option to enable video
          showVideoEnableOption()
        }
      },

      'call.state': (params) => {
        // Handle background/foreground transitions on mobile
        if (isMobile && params.call_state === 'answered') {
          setupMobileBackgroundHandlers(call)
        }
      },

      'member.joined': (params) => {
        if (isMobile) {
          // Mobile-optimized member notifications
          showMobileNotification(`${params.member.name} joined`)
        }
      },

      // Handle network changes on mobile
      'media.disconnected': () => {
        if (isMobile) {
          console.log('📱 Mobile network disconnected, attempting reconnection...')
          showMobileNetworkWarning()
        }
      },

      'media.connected': () => {
        if (isMobile) {
          console.log('📱 Mobile network reconnected')
          hideMobileNetworkWarning()
        }
      }
    }
  })

  // Mobile-specific event handlers
  if (isMobile) {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 App backgrounded')
        // Optionally pause video to save bandwidth
        call.videoMute()
      } else {
        console.log('📱 App foregrounded')
        // Re-enable video if it was on before
        // This would need state tracking
      }
    })

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        console.log('📱 Orientation changed')
        // Adjust video layout for new orientation
        adjustMobileVideoLayout()
      }, 500) // Small delay to let orientation settle
    })
  }

  return call
}

// =============================================================================
// REACT INTEGRATION EXAMPLE
// =============================================================================

/**
 * Example 8: React component integration pattern
 */
function createReactCallComponent() {
  return `
// CallComponent.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { SignalWire } from '@signalwire/client'

function CallComponent({ destination, onCallEnd }) {
  const [call, setCall] = useState(null)
  const [callState, setCallState] = useState('idle')
  const [members, setMembers] = useState([])
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  const startCall = useCallback(async () => {
    try {
      const client = await SignalWire({
        host: process.env.REACT_APP_SW_HOST,
        token: process.env.REACT_APP_SW_TOKEN
      })

      const newCall = await client.dial({
        to: destination,
        audio: true,
        video: true,
        listen: {
          'call.joined': (params) => {
            setCallState('connected')
            setMembers(params.room_session.members || [])
          },

          'call.state': (params) => {
            setCallState(params.call_state)
          },

          'member.joined': (params) => {
            setMembers(prev => [...prev, params.member])
          },

          'member.left': (params) => {
            setMembers(prev => 
              prev.filter(m => m.member_id !== params.member.member_id)
            )
          },

          'member.updated.audioMuted': (params) => {
            if (params.member.member_id === newCall.memberId) {
              setIsMuted(params.member.audio_muted)
            }
            
            setMembers(prev => 
              prev.map(m => 
                m.member_id === params.member.member_id 
                  ? { ...m, audio_muted: params.member.audio_muted }
                  : m
              )
            )
          },

          'member.updated.videoMuted': (params) => {
            if (params.member.member_id === newCall.memberId) {
              setIsVideoOff(params.member.video_muted)
            }
            
            setMembers(prev => 
              prev.map(m => 
                m.member_id === params.member.member_id 
                  ? { ...m, video_muted: params.member.video_muted }
                  : m
              )
            )
          },

          'call.left': () => {
            setCallState('ended')
            setCall(null)
            onCallEnd()
          }
        }
      })

      setCall(newCall)
    } catch (error) {
      console.error('Failed to start call:', error)
      setCallState('error')
    }
  }, [destination, onCallEnd])

  const endCall = useCallback(async () => {
    if (call) {
      await call.hangup()
    }
  }, [call])

  const toggleMute = useCallback(async () => {
    if (call) {
      if (isMuted) {
        await call.audioUnmute()
      } else {
        await call.audioMute()
      }
    }
  }, [call, isMuted])

  const toggleVideo = useCallback(async () => {
    if (call) {
      if (isVideoOff) {
        await call.videoUnmute()
      } else {
        await call.videoMute()
      }
    }
  }, [call, isVideoOff])

  return (
    <div className="call-component">
      <div className="call-status">Status: {callState}</div>
      
      {callState === 'idle' && (
        <button onClick={startCall}>Start Call</button>
      )}
      
      {callState === 'connected' && (
        <div className="call-controls">
          <button onClick={toggleMute}>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={toggleVideo}>
            {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
          </button>
          <button onClick={endCall}>End Call</button>
        </div>
      )}
      
      <div className="members-list">
        <h3>Members ({members.length})</h3>
        {members.map(member => (
          <div key={member.member_id} className="member">
            {member.name} 
            {member.audio_muted && ' 🔇'}
            {member.video_muted && ' 📹❌'}
          </div>
        ))}
      </div>
      
      <div id="video-container" />
    </div>
  )
}

export default CallComponent
`
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function updateCallUI(params) {
  console.log('Updating call UI...', params)
}

function showStatus(message) {
  console.log(`Status: ${message}`)
}

function cleanupUI() {
  console.log('Cleaning up UI...')
}

function addMemberToUI(member) {
  console.log(`Adding member to UI: ${member.name}`)
}

function removeMemberFromUI(memberId) {
  console.log(`Removing member from UI: ${memberId}`)
}

function updateMemberUI(member) {
  console.log(`Updating member UI: ${member.name}`)
}

function updateMemberAudioStatus(memberId, muted) {
  console.log(`Member ${memberId} audio: ${muted ? 'muted' : 'unmuted'}`)
}

function updateMemberVideoStatus(memberId, muted) {
  console.log(`Member ${memberId} video: ${muted ? 'off' : 'on'}`)
}

function updateMemberHandStatus(memberId, raised) {
  console.log(`Member ${memberId} hand: ${raised ? 'raised' : 'lowered'}`)
}

function updateMemberTalkingStatus(memberId, talking) {
  console.log(`Member ${memberId} talking: ${talking}`)
}

function updateMicrophoneButton(muted) {
  console.log(`Microphone button: ${muted ? 'muted' : 'unmuted'}`)
}

function updateCameraButton(muted) {
  console.log(`Camera button: ${muted ? 'off' : 'on'}`)
}

function updateLayoutControls(layout) {
  console.log(`Layout changed to: ${layout.name}`)
}

function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`)
}

function showError(message) {
  console.error(`Error: ${message}`)
}

function handleStreamStarted(stream) {
  console.log(`Stream started: ${stream.type}`)
}

function handleStreamEnded(stream) {
  console.log(`Stream ended: ${stream.type}`)
}

function showRecordingIndicator(recording) {
  console.log(`Recording indicator: ${recording ? 'ON' : 'OFF'}`)
}

function enableRoomControls() {
  console.log('Room controls enabled')
}

function handleCallError(error) {
  console.error('Call error:', error)
}

function cleanupResources() {
  console.log('Cleaning up resources...')
}

function checkScreenShareSupport() {
  return Promise.resolve(navigator.mediaDevices?.getDisplayMedia !== undefined)
}

function enableScreenShareButton() {
  console.log('Screen share button enabled')
}

function updateUIBasedOnCapabilities(member) {
  console.log('Updating UI based on member capabilities')
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Mobile-specific functions
function enableMobileOptimizations() {
  console.log('📱 Mobile optimizations enabled')
}

function showVideoEnableOption() {
  console.log('📱 Showing video enable option')
}

function setupMobileBackgroundHandlers(call) {
  console.log('📱 Setting up mobile background handlers')
}

function showMobileNotification(message) {
  console.log(`📱 Mobile notification: ${message}`)
}

function showMobileNetworkWarning() {
  console.log('📱 Showing mobile network warning')
}

function hideMobileNetworkWarning() {
  console.log('📱 Hiding mobile network warning')
}

function adjustMobileVideoLayout() {
  console.log('📱 Adjusting mobile video layout')
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  basicDialExample,
  advancedDialExample,
  errorHandlingExample,
  gracefulDegradationExample,
  oldPatternExample,
  newPatternExample,
  browserIntegrationExample,
  mobileOptimizedExample,
  createReactCallComponent
}

/**
 * Quick Start Guide:
 * 
 * 1. Import SignalWire: import { SignalWire } from '@signalwire/client'
 * 2. Create client: const client = await SignalWire({ host, token })
 * 3. Dial with events: const call = await client.dial({ to, listen: { ... } })
 * 4. Call is automatically started and events are attached!
 * 
 * Key Benefits:
 * ✅ Single async method call
 * ✅ No timing issues with event attachment
 * ✅ Cleaner, more readable code
 * ✅ No risk of missing early events
 * ✅ Better error handling
 */