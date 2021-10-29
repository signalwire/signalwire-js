import { getLogger } from '@signalwire/core'
import { getUserMedia } from './webrtcHelpers'

describe('WebRTC Helpers', () => {
  describe('getUserMedia', () => {
    let loggerErrorSpy: jest.SpyInstance
    beforeEach(() => {
      loggerErrorSpy = jest
        .spyOn(getLogger(), 'error')
        .mockImplementationOnce(() => {})
    })
    afterEach(() => {
      loggerErrorSpy.mockClear()
      // @ts-ignore
      navigator.mediaDevices.getUserMedia.mockClear()
    })

    it('should throw for environments not supporting getUserMedia', async () => {
      jest.fn().mockResolvedValueOnce
      // @ts-ignore
      navigator.mediaDevices.getUserMedia.mockImplementationOnce(() => {
        throw new Error('Not implemented')
      })

      try {
        getUserMedia()
      } catch (e) {
        expect(e.name).toBe('Error')
      }
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1)
    })

    it('should provide default contraints when no constraints have been passed', async () => {
      const stream = getUserMedia()
      expect(stream).toMatchInlineSnapshot(`
        MediaStreamMock {
          "_tracks": Array [
            MediaStreamTrackMock {
              "enabled": true,
              "id": "uuid",
              "kind": "audio",
              "label": "Track Label",
            },
            MediaStreamTrackMock {
              "enabled": true,
              "id": "uuid",
              "kind": "video",
              "label": "Track Label",
            },
          ],
        }
      `)
    })
  })
})
