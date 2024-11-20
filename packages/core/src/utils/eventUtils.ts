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

const capabilityStringToObjectMap = {
  device: { device: true } as CallCapabilities,
  'digit.send': { sendDigit: true } as CallCapabilities,
  end: { end: true } as CallCapabilities,
  'layout.set': { setLayout: true } as CallCapabilities,
  screenshare: { screenshare: true } as CallCapabilities,
  'vmuted.hide.on': { vmutedHide: { on: true } } as CallCapabilities,
  'vmuted.hide.off': { vmutedHide: { off: true } } as CallCapabilities,
  'lock.on': { lock: { on: true } } as CallCapabilities,
  'lock.off': { lock: { off: true } } as CallCapabilities,
  'member.position.set': { member: { position: true } } as CallCapabilities,
  'member.meta': { member: { meta: true } } as CallCapabilities,
  'member.remove': { member: { remove: true } } as CallCapabilities,
  'member.microphone.volume.set': {
    member: { microphoneVolume: true },
  } as CallCapabilities,
  'member.microphone.sensitivity.set': {
    member: { microphoneSensitivity: true },
  } as CallCapabilities,
  'member.speaker.volume.set': {
    member: { speakerVolume: true },
  } as CallCapabilities,
  'member.deaf.on': { member: { deaf: { on: true } } } as CallCapabilities,
  'member.deaf.off': { member: { deaf: { off: true } } } as CallCapabilities,
  'member.mute.audio.on': {
    member: { muteAudio: { on: true } },
  } as CallCapabilities,
  'member.mute.audio.off': {
    member: { muteAudio: { off: true } },
  } as CallCapabilities,
  'member.mute.video.on': {
    member: { muteVideo: { on: true } },
  } as CallCapabilities,
  'member.mute.video.off': {
    member: { muteVideo: { off: true } },
  } as CallCapabilities,
  'member.raisehand.on': {
    member: { raisehand: { on: true } },
  } as CallCapabilities,
  'member.raisehand.off': {
    member: { raisehand: { off: true } },
  } as CallCapabilities,
  'self.position.set': { self: { position: true } } as CallCapabilities,
  'self.meta': { self: { meta: true } } as CallCapabilities,
  'self.remove': { self: { remove: true } } as CallCapabilities,
  'self.microphone': {
    self: { microphoneVolume: true, microphoneSensitivity: true },
  } as CallCapabilities,
  'self.microphone.volume.set': {
    self: { microphoneVolume: true },
  } as CallCapabilities,
  'self.microphone.sensitivity.set': {
    self: { microphoneSensitivity: true },
  } as CallCapabilities,
  'self.speaker.volume.set': {
    self: { speakerVolume: true },
  } as CallCapabilities,
  'self.deaf.on': { self: { deaf: { on: true } } } as CallCapabilities,
  'self.deaf.off': { self: { deaf: { off: true } } } as CallCapabilities,
  'self.mute.audio.on': {
    self: { muteAudio: { on: true } },
  } as CallCapabilities,
  'self.mute.audio.off': {
    self: { muteAudio: { off: true } },
  } as CallCapabilities,
  'self.mute.video.on': {
    self: { muteVideo: { on: true } },
  } as CallCapabilities,
  'self.mute.video.off': {
    self: { muteVideo: { off: true } },
  } as CallCapabilities,
  'self.raisehand.on': {
    self: { raisehand: { on: true } },
  } as CallCapabilities,
  'self.raisehand.off': {
    self: { raisehand: { off: true } },
  } as CallCapabilities,
}

const isObjectGuard = (o: unknown): o is Object => o instanceof Object

const capabilityStringToObjects = (capability: string) =>
  Object.entries(capabilityStringToObjectMap)
    .filter(([key]) => key.startsWith(capability))
    .map(([_, value]) => value)

const mergeCapabilityObjects = <T extends Object>(target: T, source: T): T => {
  const result = { ...target }
  for (const key in source) {
    if (
      result[key] &&
      isObjectGuard(target[key]) &&
      isObjectGuard(source[key])
    ) {
      result[key] = mergeCapabilityObjects(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

export const mapCapabilityPayload = (capabilities: string[]) =>
  capabilities
    .flatMap(capabilityStringToObjects)
    .reduce<CallCapabilities>(mergeCapabilityObjects, {} as CallCapabilities)
