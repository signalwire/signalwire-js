describe('Backward Compatibility', () => {
  // Suppress console warnings for this test suite
  const originalWarn = console.warn
  beforeAll(() => {
    console.warn = jest.fn()
  })

  afterAll(() => {
    console.warn = originalWarn
  })

  describe('Deprecated exports', () => {
    it('should export Fabric namespace (deprecated)', async () => {
      const module = await import('../index')
      expect(module.Fabric).toBeDefined()
    })

    it('should export SignalWire (deprecated)', async () => {
      const module = await import('../index')
      expect(module.SignalWire).toBeDefined()
    })
  })

  describe('Video SDK exports', () => {
    it('should still export Video namespace', async () => {
      const { Video } = await import('../index')
      
      expect(Video).toBeDefined()
      expect(Video.RoomSession).toBeDefined()
    })

    it('should still export Chat namespace', async () => {
      const { Chat } = await import('../index')
      
      expect(Chat).toBeDefined()
      expect(Chat.Client).toBeDefined()
    })

    it('should still export PubSub namespace', async () => {
      const { PubSub } = await import('../index')
      
      expect(PubSub).toBeDefined()
      expect(PubSub.Client).toBeDefined()
    })

    it('should still export WebRTC namespace', async () => {
      const { WebRTC } = await import('../index')
      
      expect(WebRTC).toBeDefined()
      expect(WebRTC.getUserMedia).toBeDefined()
    })

    it('should still export buildVideoElement', async () => {
      const { buildVideoElement } = await import('../index')
      
      expect(buildVideoElement).toBeDefined()
      expect(typeof buildVideoElement).toBe('function')
    })
  })
})