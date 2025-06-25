import { filterIceServers, getMediaConstraints, getUserMedia } from './helpers'
import { getUserMedia as _getUserMedia } from './getUserMedia'
import { assureDeviceId } from './deviceHelpers'

jest.mock('./getUserMedia', () => ({
  getUserMedia: jest.fn(),
}))

jest.mock('./deviceHelpers', () => ({
  assureDeviceId: jest
    .fn()
    .mockImplementation(async (p: any) => Promise.resolve(p)),
}))

describe('Helpers functions', () => {
  describe('getUserMedia()', () => {
    it('should call underlying getUserMedia when audio is true', () => {
      const constraints = { audio: true, video: false }
      getUserMedia(constraints)
      expect(_getUserMedia).toHaveBeenCalledWith(constraints)
    })

    it('should call underlying getUserMedia when video is true', () => {
      const constraints = { audio: false, video: true }
      getUserMedia(constraints)
      expect(_getUserMedia).toHaveBeenCalledWith(constraints)
    })

    it('should call underlying getUserMedia when both audio and video are true', () => {
      const constraints = { audio: true, video: true }
      getUserMedia(constraints)
      expect(_getUserMedia).toHaveBeenCalledWith(constraints)
    })
  })

  describe('getMediaConstraints()', () => {
    it('should return default constraints when no device IDs provided', async () => {
      const constraints = await getMediaConstraints({})
      expect(constraints).toEqual({ audio: true, video: true })
    })

    it('should return explicit boolean audio/video flags', async () => {
      expect(await getMediaConstraints({ audio: false })).toEqual({
        audio: false,
        video: true,
      })
      expect(await getMediaConstraints({ video: false })).toEqual({
        audio: true,
        video: false,
      })
      expect(await getMediaConstraints({ audio: false, video: false })).toEqual(
        { audio: false, video: false }
      )
    })

    describe('when micId is provided', () => {
      const micOpts = {
        micId: 'foo-id',
        micLabel: 'My mic',
      }

      it('should inject deviceId when assureDeviceId resolves to a new ID', async () => {
        ;(assureDeviceId as jest.Mock).mockResolvedValue('new-foo')
        const constraints = await getMediaConstraints({ ...micOpts })
        expect(assureDeviceId).toHaveBeenCalledWith(
          'foo-id',
          'My mic',
          'microphone'
        )
        expect(constraints.audio).toMatchObject({
          deviceId: { exact: 'new-foo' },
        })
        expect(constraints.video).toBe(true)
      })

      it('should leave audio alone when assureDeviceId rejects', async () => {
        ;(assureDeviceId as jest.Mock).mockRejectedValue(new Error('fail'))
        const constraints = await getMediaConstraints({ ...micOpts })
        expect(assureDeviceId).toHaveBeenCalled()
        expect(constraints.audio).toBe(true)
      })

      it('should preserve existing audio object shape', async () => {
        ;(assureDeviceId as jest.Mock).mockResolvedValue('XYZ')
        const customAudio = { sampleRate: 48000 }
        const constraints = await getMediaConstraints({
          ...micOpts,
          audio: customAudio,
        })
        expect(constraints.audio).toEqual({
          sampleRate: 48000,
          deviceId: { exact: 'XYZ' },
        })
      })
    })

    describe('when camId is provided', () => {
      const camOpts = {
        camId: 'cam-123',
        camLabel: 'My cam',
      }

      it('should inject deviceId when assureDeviceId resolves to a new ID', async () => {
        ;(assureDeviceId as jest.Mock).mockResolvedValue('cam-new')
        const constraints = await getMediaConstraints({ ...camOpts })
        expect(assureDeviceId).toHaveBeenLastCalledWith(
          'cam-123',
          'My cam',
          'camera'
        )
        expect(constraints.video).toMatchObject({
          deviceId: { exact: 'cam-new' },
        })
      })

      it('should leave video alone when assureDeviceId rejects', async () => {
        ;(assureDeviceId as jest.Mock).mockRejectedValue(new Error('fail-cam'))
        const constraints = await getMediaConstraints({ ...camOpts })
        expect(constraints.video).toBe(true)
      })

      it('should preserve existing video object shape', async () => {
        ;(assureDeviceId as jest.Mock).mockResolvedValue('CAMXYZ')
        const customVideo = { width: 1280 }
        const constraints = await getMediaConstraints({
          ...camOpts,
          video: customVideo,
        })
        expect(constraints.video).toEqual({
          width: 1280,
          deviceId: { exact: 'CAMXYZ' },
        })
      })
    })
  })

  describe('filterIceServers()', () => {
    const servers = [
      {
        urls: 'stun:stun.l.google.com:19302?transport=udp',
        username: 'u',
        credential: 'c',
      },
      { urls: ['turn:1.2.3.4?transport=udp', 'turn:1.2.3.4?transport=tcp'] },
    ]

    it('should return original servers when disableUdpIceServers is false', () => {
      const output = filterIceServers(servers, { disableUdpIceServers: false })
      expect(output).toEqual(servers)
    })

    it('should filter out udp URLs when disableUdpIceServers is true', () => {
      const output = filterIceServers(
        [{ urls: 'turn:5.6.7.8?transport=udp' }],
        {
          disableUdpIceServers: true,
        }
      )
      expect(output[0].urls).toBe('')
    })

    it('should filter out udp URLs when disableUdpIceServers is true', () => {
      const output = filterIceServers(servers, { disableUdpIceServers: true })
      expect(output[0].urls).toBe('')
      expect(output[1].urls).toEqual(['turn:1.2.3.4?transport=tcp'])
    })
  })
})
