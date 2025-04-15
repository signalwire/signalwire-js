import { stripNamespacePrefix } from "@signalwire/core"
import { mapCapabilityPayload } from "./capabilitiesHelpers"

describe('eventUtils', () => {
  describe('stripNamespacePrefix', () => {
    it('should strip first word before dot', () => {
      const event1 = 'random.event.foo'
      const event2 = 'random.event.bar'
      expect(stripNamespacePrefix(event1)).toBe('event.foo')
      expect(stripNamespacePrefix(event2)).toBe('event.bar')
    })

    it('should not strip if there is no dot', () => {
      const event1 = 'randomeventfoo'
      const event2 = 'randomeventbar'
      expect(stripNamespacePrefix(event1)).toBe('randomeventfoo')
      expect(stripNamespacePrefix(event2)).toBe('randomeventbar')
    })

    it('should strip the namespace if passed', () => {
      const event1 = 'video.event.foo'
      const event2 = 'voice.event.bar'
      expect(stripNamespacePrefix(event1, 'video')).toBe('event.foo')
      expect(stripNamespacePrefix(event2, 'voice')).toBe('event.bar')
    })
  })

  describe('mapCapabilitiesPayload', () => {
    it('should have all capabilities', () => {
      const callCapabilities = mapCapabilityPayload([
        'self',
        'member',
        'device',
        'screenshare',
        'lock',
        'end',
        'vmuted',
        'layout',
        'digit',
        'lock',
      ])
      expect(callCapabilities.member?.deaf?.on).toEqual(true)
      expect(callCapabilities.member?.deaf?.off).toEqual(true)
      expect(callCapabilities.member?.raisehand?.on).toEqual(true)
      expect(callCapabilities.member?.raisehand?.off).toEqual(true)
      expect(callCapabilities.member?.muteVideo?.on).toEqual(true)
      expect(callCapabilities.member?.muteVideo?.off).toEqual(true)
      expect(callCapabilities.member?.muteAudio?.on).toEqual(true)
      expect(callCapabilities.member?.muteAudio?.off).toEqual(true)
      expect(callCapabilities.member?.meta).toEqual(true)
      expect(callCapabilities.member?.position).toEqual(true)
      expect(callCapabilities.member?.remove).toEqual(true)
      expect(callCapabilities.member?.microphoneSensitivity).toEqual(true)
      expect(callCapabilities.member?.microphoneVolume).toEqual(true)
      expect(callCapabilities.member?.speakerVolume).toEqual(true)

      expect(callCapabilities.self?.deaf?.on).toEqual(true)
      expect(callCapabilities.self?.deaf?.off).toEqual(true)
      expect(callCapabilities.self?.raisehand?.on).toEqual(true)
      expect(callCapabilities.self?.raisehand?.off).toEqual(true)
      expect(callCapabilities.self?.muteVideo?.on).toEqual(true)
      expect(callCapabilities.self?.muteVideo?.off).toEqual(true)
      expect(callCapabilities.self?.muteAudio?.on).toEqual(true)
      expect(callCapabilities.self?.muteAudio?.off).toEqual(true)
      expect(callCapabilities.self?.meta).toEqual(true)
      expect(callCapabilities.self?.position).toEqual(true)
      expect(callCapabilities.self?.remove).toEqual(true)
      expect(callCapabilities.self?.microphoneSensitivity).toEqual(true)
      expect(callCapabilities.self?.microphoneVolume).toEqual(true)
      expect(callCapabilities.self?.speakerVolume).toEqual(true)

      expect(callCapabilities.device).toEqual(true)
      expect(callCapabilities.screenshare).toEqual(true)
      expect(callCapabilities.sendDigit).toEqual(true)
      expect(callCapabilities.setLayout).toEqual(true)
      expect(callCapabilities.end).toEqual(true)
      expect(callCapabilities.lock?.on).toEqual(true)
      expect(callCapabilities.lock?.off).toEqual(true)
      expect(callCapabilities.vmutedHide?.on).toEqual(true)
      expect(callCapabilities.vmutedHide?.off).toEqual(true)
    })

    it('should have some self capabilities and others member capabilities', () => {
      const callCapabilities = mapCapabilityPayload([
        'member.deaf',
        'member.mute.video',
        'member.mute.audio.on',
        'self.remove',
        'self.microphone',
      ])
      expect(callCapabilities.member?.deaf?.on).toEqual(true)
      expect(callCapabilities.member?.deaf?.off).toEqual(true)
      expect(callCapabilities.member?.raisehand?.on).toEqual(false)
      expect(callCapabilities.member?.raisehand?.off).toEqual(false)
      expect(callCapabilities.member?.muteVideo?.on).toEqual(true)
      expect(callCapabilities.member?.muteVideo?.off).toEqual(true)
      expect(callCapabilities.member?.muteAudio?.on).toEqual(true)
      expect(callCapabilities.member?.muteAudio?.off).toBeFalsy()
      expect(callCapabilities.member?.meta).toBeFalsy()
      expect(callCapabilities.member?.position).toBeFalsy()
      expect(callCapabilities.member?.remove).toBeFalsy()
      expect(callCapabilities.member?.microphoneSensitivity).toBeFalsy()
      expect(callCapabilities.member?.microphoneVolume).toBeFalsy()
      expect(callCapabilities.member?.speakerVolume).toBeFalsy()

      expect(callCapabilities.self?.deaf?.on).toBeFalsy()
      expect(callCapabilities.self?.deaf?.off).toBeFalsy()
      expect(callCapabilities.self?.raisehand?.on).toEqual(false)
      expect(callCapabilities.self?.raisehand?.off).toEqual(false)
      expect(callCapabilities.self?.muteVideo?.on).toBeFalsy()
      expect(callCapabilities.self?.muteVideo?.off).toBeFalsy()
      expect(callCapabilities.self?.muteAudio?.on).toBeFalsy()
      expect(callCapabilities.self?.muteAudio?.off).toBeFalsy()
      expect(callCapabilities.self?.meta).toBeFalsy()
      expect(callCapabilities.self?.position).toBeFalsy()
      expect(callCapabilities.self?.remove).toEqual(true)
      expect(callCapabilities.self?.microphoneSensitivity).toEqual(true)
      expect(callCapabilities.self?.microphoneVolume).toEqual(true)
      expect(callCapabilities.self?.speakerVolume).toBeFalsy()

      expect(callCapabilities.device).toBeFalsy()
      expect(callCapabilities.screenshare).toBeFalsy()
      expect(callCapabilities.sendDigit).toBeFalsy()
      expect(callCapabilities.setLayout).toBeFalsy()
      expect(callCapabilities.end).toBeFalsy()
      expect(callCapabilities.lock?.on).toBeFalsy()
      expect(callCapabilities.lock?.off).toBeFalsy()
      expect(callCapabilities.vmutedHide?.on).toBeFalsy()
      expect(callCapabilities.vmutedHide?.off).toBeFalsy()
    })

    it('should have some both on and off', () => {
      const callCapabilities = mapCapabilityPayload([
        'member.mute.video',
        'member.mute.audio.on',
        'member.mute.audio.off',
      ])
      expect(callCapabilities.member?.muteVideo?.on).toEqual(true)
      expect(callCapabilities.member?.muteVideo?.off).toEqual(true)
      expect(callCapabilities.member?.muteAudio?.on).toEqual(true)
      expect(callCapabilities.member?.muteAudio?.off).toEqual(true)
    })
  })

  it('should not break if the server send redundant capability', () => {
    const callCapabilities = mapCapabilityPayload([
      'self',
      'self.deaf',
      'self.mute.audio',
      'self.mute.audio.on',
      'member',
      'device',
      'screenshare',
      'lock',
      'end',
      'vmuted',
      'layout',
      'digit',
      'lock',
    ])
    expect(callCapabilities.member?.deaf?.on).toEqual(true)
    expect(callCapabilities.member?.deaf?.off).toEqual(true)
    expect(callCapabilities.member?.raisehand?.on).toEqual(true)
    expect(callCapabilities.member?.raisehand?.off).toEqual(true)
    expect(callCapabilities.member?.muteVideo?.on).toEqual(true)
    expect(callCapabilities.member?.muteVideo?.off).toEqual(true)
    expect(callCapabilities.member?.muteAudio?.on).toEqual(true)
    expect(callCapabilities.member?.muteAudio?.off).toEqual(true)
    expect(callCapabilities.member?.meta).toEqual(true)
    expect(callCapabilities.member?.position).toEqual(true)
    expect(callCapabilities.member?.remove).toEqual(true)
    expect(callCapabilities.member?.microphoneSensitivity).toEqual(true)
    expect(callCapabilities.member?.microphoneVolume).toEqual(true)
    expect(callCapabilities.member?.speakerVolume).toEqual(true)

    expect(callCapabilities.self?.deaf?.on).toEqual(true)
    expect(callCapabilities.self?.deaf?.off).toEqual(true)
    expect(callCapabilities.self?.raisehand?.on).toEqual(true)
    expect(callCapabilities.self?.raisehand?.off).toEqual(true)
    expect(callCapabilities.self?.muteVideo?.on).toEqual(true)
    expect(callCapabilities.self?.muteVideo?.off).toEqual(true)
    expect(callCapabilities.self?.muteAudio?.on).toEqual(true)
    expect(callCapabilities.self?.muteAudio?.off).toEqual(true)
    expect(callCapabilities.self?.meta).toEqual(true)
    expect(callCapabilities.self?.position).toEqual(true)
    expect(callCapabilities.self?.remove).toEqual(true)
    expect(callCapabilities.self?.microphoneSensitivity).toEqual(true)
    expect(callCapabilities.self?.microphoneVolume).toEqual(true)
    expect(callCapabilities.self?.speakerVolume).toEqual(true)

    expect(callCapabilities.device).toEqual(true)
    expect(callCapabilities.screenshare).toEqual(true)
    expect(callCapabilities.sendDigit).toEqual(true)
    expect(callCapabilities.setLayout).toEqual(true)
    expect(callCapabilities.end).toEqual(true)
    expect(callCapabilities.lock?.on).toEqual(true)
    expect(callCapabilities.lock?.off).toEqual(true)
    expect(callCapabilities.vmutedHide?.on).toEqual(true)
    expect(callCapabilities.vmutedHide?.off).toEqual(true)
  })
})
