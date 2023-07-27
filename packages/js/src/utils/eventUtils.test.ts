import { stripNamespacePrefix } from './eventUtils'

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
})
