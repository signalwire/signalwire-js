import { CallCapabilities } from '@signalwire/core'

export const stripNamespacePrefix = (
  event: string,
  namespace?: string
): string => {
  if (namespace && typeof namespace === 'string') {
    const regex = new RegExp(`^${namespace}\.`)
    return event.replace(regex, '')
  }
  const items = event.split('.')
  if (items.length > 1) {
    items.shift()
    return items.join('.')
  }
  return event
}

const mapCapabilityPayload = (capability: string) => {
  switch (capability) {
    case 'digit':
      return { sendDigit: true }
    case 'device':
      return { device: true }
    case 'end':
      return { end: true }
    case 'layout':
      return { setLayout: true }
    case 'screenshare':
      return { screenshare: true }
    case 'vmuted':
      return { vmutedHide: { on: true, off: true } }
    case 'vmuted.hide.on':
      return { vmutedHide: { on: true } }
    case 'vmuted.hide.off':
      return { vmutedHide: { off: true } }
    case 'member':
      return {
        member: {
          muteAudio: { on: true, off: true },
          muteVideo: { on: true, off: true },
          microphoneVolume: true,
          microphoneSensitivity: true,
          speakerVolume: true,
          deaf: { on: true, off: true },
          position: true,
          meta: true,
          remove: true,
        },
      }
    case 'member.position':
      return { member: { position: true } }
    case 'member.meta':
      return { member: { meta: true } }
    case 'member.remove':
      return { member: { remove: true } }
    case 'member.microphone':
      return { member: { microphoneVolume: true, microphoneSensitivity: true } }
    case 'member.microphone.volume':
      return { member: { microphoneVolume: true } }
    case 'member.sensitivity':
      return { member: { microphoneSensitivity: true } }
    case 'member.speaker':
      return { member: { speakerVolume: true } }
    case 'member.deaf':
      return {
        member: {
          deaf: { on: true, off: true },
        },
      }
    case 'member.deaf.on':
      return {
        member: {
          deaf: { on: true },
        },
      }
    case 'member.deaf.off':
      return {
        member: {
          deaf: { off: true },
        },
      }
    case 'member.mute':
      return {
        member: {
          muteAudio: { on: true, off: true },
          muteVideo: { on: true, off: true },
        },
      }
    case 'member.mute.audio':
      return {
        member: {
          muteAudio: { on: true, off: true },
        },
      }
    case 'member.mute.audio.on':
      return {
        member: {
          muteAudio: { on: true },
        },
      }
    case 'member.mute.audio.off':
      return {
        member: {
          muteAudio: { off: true },
        },
      }
    case 'member.mute.video':
      return {
        member: {
          muteAudio: { on: true, off: true },
        },
      }
    case 'member.mute.video.on':
      return {
        member: {
          muteAudio: { on: true },
        },
      }
    case 'member.mute.video.off':
      return {
        member: {
          muteAudio: { off: true },
        },
      }

    case 'self':
      return {
        self: {
          muteAudio: { on: true, off: true },
          muteVideo: { on: true, off: true },
          microphoneVolume: true,
          microphoneSensitivity: true,
          speakerVolume: true,
          deaf: { on: true, off: true },
          position: true,
          meta: true,
          remove: true,
        },
      }
    case 'self.position':
      return { self: { position: true } }
    case 'self.meta':
      return { self: { meta: true } }
    case 'self.remove':
      return { self: { remove: true } }
    case 'self.microphone':
      return { self: { microphoneVolume: true, microphoneSensitivity: true } }
    case 'self.microphone.volume':
      return { self: { microphoneVolume: true } }
    case 'self.sensitivity':
      return { self: { microphoneSensitivity: true } }
    case 'self.speaker':
      return { self: { speakerVolume: true } }
    case 'self.deaf':
      return {
        self: {
          deaf: { on: true, off: true },
        },
      }
    case 'self.deaf.on':
      return {
        self: {
          deaf: { on: true },
        },
      }
    case 'self.deaf.off':
      return {
        self: {
          deaf: { off: true },
        },
      }
    case 'self.mute':
      return {
        self: {
          muteAudio: { on: true, off: true },
          muteVideo: { on: true, off: true },
        },
      }
    case 'self.mute.audio':
      return {
        self: {
          muteAudio: { on: true, off: true },
        },
      }
    case 'self.mute.audio.on':
      return {
        self: {
          muteAudio: { on: true },
        },
      }
    case 'self.mute.audio.off':
      return {
        self: {
          muteAudio: { off: true },
        },
      }
    case 'self.mute.video':
      return {
        self: {
          muteAudio: { on: true, off: true },
        },
      }
    case 'self.mute.video.on':
      return {
        self: {
          muteAudio: { on: true },
        },
      }
    case 'self.mute.video.off':
      return {
        self: {
          muteAudio: { off: true },
        },
      }
    default: return {} as CallCapabilities
  }
}

export const mapCapabilitiesPayload = (
  capabilities: string[]
): CallCapabilities =>
  capabilities
    .map(mapCapabilityPayload)
    .reduce((prev, current) => ({ ...prev, ...current }), {})
