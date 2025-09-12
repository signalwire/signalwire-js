import { CallStateManager } from './CallStateManage'

describe('CallStateManager', () => {
  let callStateManager: CallStateManager

  beforeEach(() => {
    callStateManager = new CallStateManager()
  })

  describe('initialization', () => {
    it('should initialize with empty history', () => {
      expect(callStateManager.history).toEqual([])
    })

    it('should return null for initial state', () => {
      expect(callStateManager.getState()).toBeNull()
    })

    it('should return undefined for initial self state', () => {
      expect(callStateManager.getSelfState()).toBeUndefined()
    })
  })

  describe('update method', () => {
    it('should add non-member events to history with updated state', () => {
      const event = 'call.joined'
      const payload = {
        member_id: 'member-123',
        room_session: {
          members: [],
        },
      }

      callStateManager.update(event, payload)

      expect(callStateManager.history).toHaveLength(1)
      expect(callStateManager.history[0]).toMatchObject({
        event,
        payload,
        state: payload,
      })
      expect(callStateManager.history[0].timestamp).toBeDefined()
      expect(typeof callStateManager.history[0].timestamp).toBe('number')
    })

    it('should handle member events by updating member in state', () => {
      // First, set up initial state with members
      const initialPayload = {
        member_id: 'member-123',
        room_session: {
          members: [
            { member_id: 'member-123', name: 'John', visible: true },
            { member_id: 'member-456', name: 'Jane', visible: true },
          ],
        },
      }
      callStateManager.update('call.joined', initialPayload)

      // Update a member
      const memberUpdatePayload = {
        member: {
          member_id: 'member-123',
          visible: false,
          muted: true,
        },
      }
      callStateManager.update('member.updated', memberUpdatePayload)

      const state = callStateManager.getState()
      expect(state.room_session.members).toHaveLength(2)
      expect(state.room_session.members[0]).toMatchObject({
        member_id: 'member-123',
        name: 'John',
        visible: false,
        muted: true,
      })
      expect(state.room_session.members[1]).toMatchObject({
        member_id: 'member-456',
        name: 'Jane',
        visible: true,
      })
    })

    it('should preserve history order', () => {
      callStateManager.update('event1', { data: 'first' })
      callStateManager.update('event2', { data: 'second' })
      callStateManager.update('event3', { data: 'third' })

      expect(callStateManager.history).toHaveLength(3)
      expect(callStateManager.history[0].event).toBe('event1')
      expect(callStateManager.history[1].event).toBe('event2')
      expect(callStateManager.history[2].event).toBe('event3')
    })

    it('should merge state for consecutive non-member events', () => {
      callStateManager.update('call.joined', {
        member_id: '123',
        status: 'joined',
      })
      callStateManager.update('call.updated', { quality: 'HD' })

      const state = callStateManager.getState()
      expect(state).toMatchObject({
        member_id: '123',
        status: 'joined',
        quality: 'HD',
      })
    })
  })

  describe('getState method', () => {
    it('should return null when history is empty', () => {
      expect(callStateManager.getState()).toBeNull()
    })

    it('should return a copy of the latest state', () => {
      const payload = { test: 'data' }
      callStateManager.update('event', payload)

      const state1 = callStateManager.getState()
      const state2 = callStateManager.getState()

      expect(state1).toEqual(payload)
      expect(state2).toEqual(payload)
      expect(state1).not.toBe(state2) // Should be different object references
    })

    it('should return the last state after multiple updates', () => {
      callStateManager.update('event1', { step: 1 })
      callStateManager.update('event2', { step: 2, extra: 'data' })

      const state = callStateManager.getState()
      expect(state).toMatchObject({
        step: 2,
        extra: 'data',
      })
    })
  })

  describe('getSelfState method', () => {
    it('should return undefined when state is null', () => {
      expect(callStateManager.getSelfState()).toBeUndefined()
    })

    it('should return undefined when room_session.members is not present', () => {
      callStateManager.update('event', { member_id: '123' })
      expect(callStateManager.getSelfState()).toBeUndefined()
    })

    it('should return the self member from members array', () => {
      const payload = {
        member_id: 'self-123',
        room_session: {
          members: [
            { member_id: 'self-123', name: 'Self', role: 'moderator' },
            { member_id: 'other-456', name: 'Other', role: 'participant' },
          ],
        },
      }
      callStateManager.update('call.joined', payload)

      const selfState = callStateManager.getSelfState()
      expect(selfState).toMatchObject({
        member_id: 'self-123',
        name: 'Self',
        role: 'moderator',
      })
    })

    it('should return undefined when self member is not found', () => {
      const payload = {
        member_id: 'self-123',
        room_session: {
          members: [
            { member_id: 'other-456', name: 'Other', role: 'participant' },
          ],
        },
      }
      callStateManager.update('call.joined', payload)

      expect(callStateManager.getSelfState()).toBeUndefined()
    })
  })

  describe('logHistory method', () => {
    it('should log history to console', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      callStateManager.update('event1', { data: 'test1' })
      callStateManager.update('event2', { data: 'test2' })

      callStateManager.logHistory()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Call State History:',
        expect.stringContaining('event1')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'Call State History:',
        expect.stringContaining('event2')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('member event handling edge cases', () => {
    it('should handle member event when member does not exist in array', () => {
      const initialPayload = {
        member_id: 'member-123',
        room_session: {
          members: [{ member_id: 'member-123', name: 'John' }],
        },
      }
      callStateManager.update('call.joined', initialPayload)

      // Try to update non-existing member
      const memberUpdatePayload = {
        member: {
          member_id: 'member-999',
          visible: false,
        },
      }
      callStateManager.update('member.updated', memberUpdatePayload)

      const state = callStateManager.getState()
      expect(state.room_session.members).toHaveLength(1)
      expect(state.room_session.members[0]).toMatchObject({
        member_id: 'member-123',
        name: 'John',
      })
    })

    it('should handle member events with empty members array', () => {
      const initialPayload = {
        member_id: 'member-123',
        room_session: {
          members: [],
        },
      }
      callStateManager.update('call.joined', initialPayload)

      const memberUpdatePayload = {
        member: {
          member_id: 'member-123',
          visible: false,
        },
      }
      callStateManager.update('member.updated', memberUpdatePayload)

      const state = callStateManager.getState()
      expect(state.room_session.members).toHaveLength(0)
    })
  })

  describe('timestamp handling', () => {
    it('should add timestamp to each history entry', () => {
      const beforeTimestamp = Date.now()

      callStateManager.update('event1', { data: 'test' })

      const afterTimestamp = Date.now()

      expect(callStateManager.history[0].timestamp).toBeGreaterThanOrEqual(
        beforeTimestamp
      )
      expect(callStateManager.history[0].timestamp).toBeLessThanOrEqual(
        afterTimestamp
      )
    })

    it('should have increasing timestamps for consecutive events', (done) => {
      callStateManager.update('event1', { data: 'test1' })
      const timestamp1 = callStateManager.history[0].timestamp

      // Small delay to ensure different timestamp
      setTimeout(() => {
        callStateManager.update('event2', { data: 'test2' })
        const timestamp2 = callStateManager.history[1].timestamp

        expect(timestamp2).toBeGreaterThanOrEqual(timestamp1)
        done()
      }, 1)
    })
  })
})
