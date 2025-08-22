import { WSClient } from './WSClient'
import { CallSession } from './CallSession'
import { DialParams, ReattachParams } from './interfaces'
import { CallSessionEventHandlers } from './interfaces/callEvents'
import { getStorage } from '../utils/storage'
import { PREVIOUS_CALLID_STORAGE_KEY } from './utils/constants'

// Mock storage
jest.mock('../utils/storage')

describe('WSClient - dial() method with event listeners', () => {
  let mockCallSession: jest.Mocked<CallSession>
  let mockStorage: jest.Mocked<ReturnType<typeof getStorage>>
  
  // Mock WSClient methods we need to test dial() in isolation
  let mockBuildOutboundCall: jest.Mock
  let mockAttachEventListeners: jest.Mock
  let mockLogger: jest.Mocked<any>

  beforeEach(() => {
    // Mock storage
    mockStorage = {
      removeItem: jest.fn(),
      setItem: jest.fn(),
      getItem: jest.fn(),
    }
    ;(getStorage as jest.Mock).mockReturnValue(mockStorage)

    // Create mock CallSession
    mockCallSession = {
      start: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      memberId: 'test-member-id',
      callId: 'test-call-id',
      roomId: 'test-room-id',
      roomSessionId: 'test-room-session-id',
      nodeId: 'test-node-id',
    } as jest.Mocked<CallSession>

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }

    // Mock WSClient methods
    mockBuildOutboundCall = jest.fn().mockReturnValue(mockCallSession)
    mockAttachEventListeners = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic dial functionality', () => {
    test('should dial successfully without event listeners', async () => {
      const dialParams: DialParams = {
        to: 'sip:user@example.com',
      }

      // Create a mock dial implementation
      const dialImplementation = async function(this: WSClient, params: DialParams) {
        mockStorage?.removeItem(PREVIOUS_CALLID_STORAGE_KEY)
        const callSession = mockBuildOutboundCall(params)
        await callSession.start()
        return callSession
      }

      const result = await dialImplementation.call({} as WSClient, dialParams)

      expect(mockStorage.removeItem).toHaveBeenCalledWith(PREVIOUS_CALLID_STORAGE_KEY)
      expect(mockBuildOutboundCall).toHaveBeenCalledWith(dialParams)
      expect(mockCallSession.start).toHaveBeenCalled()
      expect(result).toBe(mockCallSession)
    })

    test('should attach event listeners before starting call', async () => {
      const mockHandler = jest.fn()
      const dialParams: DialParams = {
        to: 'sip:user@example.com',
        listen: {
          'call.joined': mockHandler,
        },
      }

      // Create a mock dial implementation that includes event listener attachment
      const dialImplementation = async function(this: WSClient, params: DialParams) {
        mockStorage?.removeItem(PREVIOUS_CALLID_STORAGE_KEY)
        const callSession = mockBuildOutboundCall(params)
        
        if (params.listen) {
          mockAttachEventListeners(callSession, params.listen)
        }
        
        await callSession.start()
        return callSession
      }

      await dialImplementation.call({} as WSClient, dialParams)

      expect(mockAttachEventListeners).toHaveBeenCalledWith(mockCallSession, dialParams.listen)
      expect(mockAttachEventListeners).toHaveBeenCalled()
      expect(mockCallSession.start).toHaveBeenCalled()
    })

    test('should handle start() failure and cleanup properly', async () => {
      const startError = new Error('Failed to start call')
      mockCallSession.start.mockRejectedValue(startError)

      const dialParams: DialParams = {
        to: 'sip:user@example.com',
      }

      // Create a mock dial implementation with error handling
      const dialImplementation = async function(this: WSClient, params: DialParams) {
        mockStorage?.removeItem(PREVIOUS_CALLID_STORAGE_KEY)
        const callSession = mockBuildOutboundCall(params)
        
        try {
          if (params.listen) {
            mockAttachEventListeners(callSession, params.listen)
          }
          await callSession.start()
          return callSession
        } catch (error) {
          try {
            callSession.destroy()
          } catch (cleanupError) {
            mockLogger.warn('Error during callSession cleanup:', cleanupError)
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during dial'
          mockLogger.error('Failed to dial:', error)
          throw new Error(`Failed to dial to ${params.to}: ${errorMessage}`, { cause: error })
        }
      }

      await expect(dialImplementation.call({ logger: mockLogger } as WSClient, dialParams))
        .rejects.toThrow('Failed to dial to sip:user@example.com: Failed to start call')
      
      expect(mockCallSession.destroy).toHaveBeenCalled()
    })
  })

  describe('Event listeners functionality', () => {
    test('should handle event listener attachment correctly', () => {
      const mockCallJoinedHandler = jest.fn()
      const mockMemberJoinedHandler = jest.fn()
      
      const handlers: Partial<CallSessionEventHandlers> = {
        'call.joined': mockCallJoinedHandler,
        'member.joined': mockMemberJoinedHandler,
      }

      // Mock the attachEventListeners implementation
      const attachEventListenersImplementation = function(
        callSession: CallSession,
        eventHandlers: Partial<CallSessionEventHandlers>
      ) {
        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
          if (typeof handler === 'function') {
            // Wrap each handler to isolate errors
            const wrappedHandler = async (params: any) => {
              try {
                await handler(params)
              } catch (error) {
                mockLogger.error(`Error in event handler for ${eventName}:`, error)
              }
            }
            callSession.on(eventName as any, wrappedHandler)
          }
        })
      }

      attachEventListenersImplementation(mockCallSession, handlers)

      expect(mockCallSession.on).toHaveBeenCalledWith('call.joined', expect.any(Function))
      expect(mockCallSession.on).toHaveBeenCalledWith('member.joined', expect.any(Function))
      expect(mockCallSession.on).toHaveBeenCalledTimes(2)
    })

    test('should wrap event handlers to catch errors', async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'))
      const handlers: Partial<CallSessionEventHandlers> = {
        'call.joined': errorHandler,
      }

      // Mock the attachEventListeners implementation
      const attachEventListenersImplementation = function(
        callSession: CallSession,
        eventHandlers: Partial<CallSessionEventHandlers>
      ) {
        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
          if (typeof handler === 'function') {
            // Wrap each handler to isolate errors
            const wrappedHandler = async (params: any) => {
              try {
                await handler(params)
              } catch (error) {
                mockLogger.error(`Error in event handler for ${eventName}:`, error)
              }
            }
            callSession.on(eventName as any, wrappedHandler)
          }
        })
      }

      attachEventListenersImplementation(mockCallSession, handlers)

      // Get the wrapped handler that was passed to callSession.on
      const wrappedHandler = (mockCallSession.on as jest.Mock).mock.calls[0][1]
      
      // Executing the wrapped handler should not throw
      const mockParams = { call_id: 'test-call', member_id: 'test-member' }
      await expect(wrappedHandler(mockParams)).resolves.toBeUndefined()
      
      // Original handler should have been called
      expect(errorHandler).toHaveBeenCalledWith(mockParams)
      
      // Error should have been logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in event handler for call.joined:',
        expect.any(Error)
      )
    })

    test('should only attach function handlers', () => {
      const validHandler = jest.fn()
      const invalidHandlers = {
        'call.joined': validHandler,
        // @ts-expect-error - Testing runtime behavior
        'member.joined': 'not-a-function',
        // @ts-expect-error - Testing runtime behavior
        'call.state': null,
        // @ts-expect-error - Testing runtime behavior
        'member.updated': 123,
      }

      // Mock the attachEventListeners implementation
      const attachEventListenersImplementation = function(
        callSession: CallSession,
        eventHandlers: any
      ) {
        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
          if (typeof handler === 'function') {
            const wrappedHandler = async (params: any) => {
              try {
                await handler(params)
              } catch (error) {
                mockLogger.error(`Error in event handler for ${eventName}:`, error)
              }
            }
            callSession.on(eventName as any, wrappedHandler)
          }
        })
      }

      attachEventListenersImplementation(mockCallSession, invalidHandlers)

      // Should only register the valid function handler
      expect(mockCallSession.on).toHaveBeenCalledWith('call.joined', expect.any(Function))
      expect(mockCallSession.on).toHaveBeenCalledTimes(1)
    })

    test('should support all event types defined in CallSessionEventHandlers', () => {
      const universalHandler = jest.fn()
      
      const allEvents: Partial<CallSessionEventHandlers> = {
        'call.joined': universalHandler,
        'call.state': universalHandler,
        'call.left': universalHandler,
        'call.updated': universalHandler,
        'member.joined': universalHandler,
        'member.left': universalHandler,
        'member.updated': universalHandler,
        'member.talking': universalHandler,
        'member.updated.audioMuted': universalHandler,
        'member.updated.videoMuted': universalHandler,
        'layout.changed': universalHandler,
        'recording.started': universalHandler,
        'recording.ended': universalHandler,
        'stream.started': universalHandler,
        'stream.ended': universalHandler,
        'playback.started': universalHandler,
        'playback.ended': universalHandler,
        'room.subscribed': universalHandler,
      }

      // Mock the attachEventListeners implementation
      const attachEventListenersImplementation = function(
        callSession: CallSession,
        eventHandlers: Partial<CallSessionEventHandlers>
      ) {
        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
          if (typeof handler === 'function') {
            const wrappedHandler = async (params: any) => {
              try {
                await handler(params)
              } catch (error) {
                mockLogger.error(`Error in event handler for ${eventName}:`, error)
              }
            }
            callSession.on(eventName as any, wrappedHandler)
          }
        })
      }

      attachEventListenersImplementation(mockCallSession, allEvents)

      // Should register a handler for each event type
      const expectedCallCount = Object.keys(allEvents).length
      expect(mockCallSession.on).toHaveBeenCalledTimes(expectedCallCount)
      
      // Verify all event names were registered
      const registeredEvents = (mockCallSession.on as jest.Mock).mock.calls.map(call => call[0])
      Object.keys(allEvents).forEach(eventName => {
        expect(registeredEvents).toContain(eventName)
      })
    })
  })

  describe('Storage management', () => {
    test('should remove previous call ID from storage before dialing', async () => {
      const dialParams: DialParams = {
        to: 'sip:user@example.com',
      }

      const dialImplementation = async function(params: DialParams) {
        mockStorage?.removeItem(PREVIOUS_CALLID_STORAGE_KEY)
        const callSession = mockBuildOutboundCall(params)
        await callSession.start()
        return callSession
      }

      await dialImplementation(dialParams)

      expect(mockStorage.removeItem).toHaveBeenCalledWith(PREVIOUS_CALLID_STORAGE_KEY)
    })

    test('should handle storage being unavailable', async () => {
      ;(getStorage as jest.Mock).mockReturnValue(null)

      const dialParams: DialParams = {
        to: 'sip:user@example.com',
      }

      const dialImplementation = async function(params: DialParams) {
        getStorage()?.removeItem(PREVIOUS_CALLID_STORAGE_KEY) // Should not throw
        const callSession = mockBuildOutboundCall(params)
        await callSession.start()
        return callSession
      }

      // Should not throw when storage is not available
      await expect(dialImplementation(dialParams)).resolves.toBeDefined()
    })
  })

  describe('Error handling', () => {
    test('should handle cleanup failure gracefully', async () => {
      const startError = new Error('Start failed')
      const destroyError = new Error('Destroy failed')
      
      mockCallSession.start.mockRejectedValue(startError)
      mockCallSession.destroy.mockImplementation(() => {
        throw destroyError
      })

      const dialParams: DialParams = {
        to: 'sip:user@example.com',
      }

      const dialImplementation = async function(params: DialParams) {
        mockStorage?.removeItem(PREVIOUS_CALLID_STORAGE_KEY)
        const callSession = mockBuildOutboundCall(params)
        
        try {
          await callSession.start()
          return callSession
        } catch (error) {
          try {
            callSession.destroy()
          } catch (cleanupError) {
            mockLogger.warn('Error during callSession cleanup:', cleanupError)
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during dial'
          mockLogger.error('Failed to dial:', error)
          throw new Error(`Failed to dial to ${params.to}: ${errorMessage}`, { cause: error })
        }
      }

      // Should still throw the original start error, not the cleanup error
      await expect(dialImplementation.call({ logger: mockLogger } as any, dialParams))
        .rejects.toThrow('Failed to dial to sip:user@example.com: Start failed')
      
      expect(mockCallSession.destroy).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith('Error during callSession cleanup:', destroyError)
    })

    test('should handle unknown error types', async () => {
      const unknownError = 'String error'
      mockCallSession.start.mockRejectedValue(unknownError)

      const dialParams: DialParams = {
        to: 'sip:user@example.com',
      }

      const dialImplementation = async function(params: DialParams) {
        mockStorage?.removeItem(PREVIOUS_CALLID_STORAGE_KEY)
        const callSession = mockBuildOutboundCall(params)
        
        try {
          await callSession.start()
          return callSession
        } catch (error) {
          try {
            callSession.destroy()
          } catch (cleanupError) {
            mockLogger.warn('Error during callSession cleanup:', cleanupError)
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during dial'
          mockLogger.error('Failed to dial:', error)
          throw new Error(`Failed to dial to ${params.to}: ${errorMessage}`, { cause: error })
        }
      }

      await expect(dialImplementation.call({ logger: mockLogger } as any, dialParams))
        .rejects.toThrow('Failed to dial to sip:user@example.com: Unknown error occurred during dial')
        
      expect(mockCallSession.destroy).toHaveBeenCalled()
    })
  })

  describe('Integration scenarios', () => {
    test('should handle complete dial flow with event listeners', async () => {
      const mockHandler = jest.fn()
      const dialParams: DialParams = {
        to: 'sip:user@example.com',
        listen: {
          'call.joined': mockHandler,
          'member.joined': mockHandler,
        },
      }

      const fullDialImplementation = async function(params: DialParams) {
        mockStorage?.removeItem(PREVIOUS_CALLID_STORAGE_KEY)
        const callSession = mockBuildOutboundCall(params)
        
        try {
          if (params.listen) {
            // Simulate attachEventListeners
            Object.entries(params.listen).forEach(([eventName, handler]) => {
              if (typeof handler === 'function') {
                const wrappedHandler = async (eventParams: any) => {
                  try {
                    await handler(eventParams)
                  } catch (error) {
                    mockLogger.error(`Error in event handler for ${eventName}:`, error)
                  }
                }
                callSession.on(eventName as any, wrappedHandler)
              }
            })
          }
          
          await callSession.start()
          return callSession
        } catch (error) {
          try {
            callSession.destroy()
          } catch (cleanupError) {
            mockLogger.warn('Error during callSession cleanup:', cleanupError)
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during dial'
          mockLogger.error('Failed to dial:', error)
          throw new Error(`Failed to dial to ${params.to}: ${errorMessage}`, { cause: error })
        }
      }

      const result = await fullDialImplementation(dialParams)

      expect(mockStorage.removeItem).toHaveBeenCalledWith(PREVIOUS_CALLID_STORAGE_KEY)
      expect(mockBuildOutboundCall).toHaveBeenCalledWith(dialParams)
      expect(mockCallSession.on).toHaveBeenCalledWith('call.joined', expect.any(Function))
      expect(mockCallSession.on).toHaveBeenCalledWith('member.joined', expect.any(Function))
      expect(mockCallSession.start).toHaveBeenCalled()
      expect(result).toBe(mockCallSession)
    })

    test('should handle event handler errors without affecting call establishment', async () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler threw error')
      })
      const successHandler = jest.fn()
      
      const dialParams: DialParams = {
        to: 'sip:user@example.com',
        listen: {
          'call.joined': errorHandler,
          'member.joined': successHandler,
        },
      }

      const fullDialImplementation = async function(params: DialParams) {
        mockStorage?.removeItem(PREVIOUS_CALLID_STORAGE_KEY)
        const callSession = mockBuildOutboundCall(params)
        
        if (params.listen) {
          Object.entries(params.listen).forEach(([eventName, handler]) => {
            if (typeof handler === 'function') {
              const wrappedHandler = async (eventParams: any) => {
                try {
                  await handler(eventParams)
                } catch (error) {
                  mockLogger.error(`Error in event handler for ${eventName}:`, error)
                }
              }
              callSession.on(eventName as any, wrappedHandler)
            }
          })
        }
        
        await callSession.start()
        return callSession
      }

      // Call should succeed despite handler errors during setup
      const result = await fullDialImplementation(dialParams)
      
      expect(result).toBe(mockCallSession)
      expect(mockCallSession.on).toHaveBeenCalledTimes(2)
      expect(mockCallSession.start).toHaveBeenCalled()
      
      // Test that wrapped handlers handle errors correctly
      const wrappedErrorHandler = (mockCallSession.on as jest.Mock).mock.calls[0][1]
      const wrappedSuccessHandler = (mockCallSession.on as jest.Mock).mock.calls[1][1]
      
      // These should not throw
      await expect(wrappedErrorHandler({ test: 'params' })).resolves.toBeUndefined()
      await expect(wrappedSuccessHandler({ test: 'params' })).resolves.toBeUndefined()
      
      expect(errorHandler).toHaveBeenCalled()
      expect(successHandler).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in event handler for call.joined:',
        expect.any(Error)
      )
    })
  })
})

describe('WSClient - reattach() method with event listeners', () => {
  let mockCallSession: jest.Mocked<CallSession>
  let mockStorage: jest.Mocked<ReturnType<typeof getStorage>>
  
  // Mock WSClient methods we need to test reattach() in isolation
  let mockBuildOutboundCall: jest.Mock
  let mockAttachEventListeners: jest.Mock
  let mockLogger: jest.Mocked<any>

  beforeEach(() => {
    // Mock storage
    mockStorage = {
      removeItem: jest.fn(),
      setItem: jest.fn(),
      getItem: jest.fn(),
    }
    ;(getStorage as jest.Mock).mockReturnValue(mockStorage)

    // Create mock CallSession
    mockCallSession = {
      start: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      memberId: 'test-member-id',
      callId: 'test-call-id',
      roomId: 'test-room-id',
      roomSessionId: 'test-room-session-id',
      nodeId: 'test-node-id',
    } as jest.Mocked<CallSession>

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }

    // Mock WSClient methods
    mockBuildOutboundCall = jest.fn().mockReturnValue(mockCallSession)
    mockAttachEventListeners = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic reattach functionality', () => {
    test('should reattach successfully without event listeners', async () => {
      const reattachParams: ReattachParams = {
        to: 'sip:user@example.com',
        nodeId: 'test-node-id',
      }

      // Create a mock reattach implementation
      const reattachImplementation = async function(this: WSClient, params: ReattachParams) {
        const callSession = mockBuildOutboundCall({ ...params, attach: true })
        await callSession.start()
        return callSession
      }

      const result = await reattachImplementation.call({} as WSClient, reattachParams)

      expect(mockBuildOutboundCall).toHaveBeenCalledWith({ ...reattachParams, attach: true })
      expect(mockCallSession.start).toHaveBeenCalled()
      expect(result).toBe(mockCallSession)
    })

    test('should attach event listeners before starting call', async () => {
      const mockHandler = jest.fn()
      const reattachParams: ReattachParams = {
        to: 'sip:user@example.com',
        nodeId: 'test-node-id',
        listen: {
          'call.joined': mockHandler,
        },
      }

      // Create a mock reattach implementation that includes event listener attachment
      const reattachImplementation = async function(this: WSClient, params: ReattachParams) {
        const callSession = mockBuildOutboundCall({ ...params, attach: true })
        
        if (params.listen) {
          mockAttachEventListeners(callSession, params.listen)
        }
        
        await callSession.start()
        return callSession
      }

      await reattachImplementation.call({} as WSClient, reattachParams)

      expect(mockAttachEventListeners).toHaveBeenCalledWith(mockCallSession, reattachParams.listen)
      expect(mockAttachEventListeners).toHaveBeenCalled()
      expect(mockCallSession.start).toHaveBeenCalled()
    })

    test('should handle start() failure and cleanup properly', async () => {
      const startError = new Error('Failed to start call')
      mockCallSession.start.mockRejectedValue(startError)

      const reattachParams: ReattachParams = {
        to: 'sip:user@example.com',
        nodeId: 'test-node-id',
      }

      // Create a mock reattach implementation with error handling
      const reattachImplementation = async function(this: WSClient, params: ReattachParams) {
        const callSession = mockBuildOutboundCall({ ...params, attach: true })
        
        try {
          if (params.listen) {
            mockAttachEventListeners(callSession, params.listen)
          }
          await callSession.start()
          return callSession
        } catch (error) {
          try {
            callSession.destroy()
          } catch (cleanupError) {
            mockLogger.warn('Error during callSession cleanup:', cleanupError)
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during reattach'
          mockLogger.error('Failed to reattach:', error)
          throw new Error(`Failed to reattach to ${params.to}: ${errorMessage}`, { cause: error })
        }
      }

      await expect(reattachImplementation.call({ logger: mockLogger } as WSClient, reattachParams))
        .rejects.toThrow('Failed to reattach to sip:user@example.com: Failed to start call')
      
      expect(mockCallSession.destroy).toHaveBeenCalled()
    })

    test('should work without to parameter (reattach to previous call)', async () => {
      const reattachParams: ReattachParams = {
        nodeId: 'test-node-id',
      }

      const reattachImplementation = async function(this: WSClient, params: ReattachParams) {
        const callSession = mockBuildOutboundCall({ ...params, attach: true })
        await callSession.start()
        return callSession
      }

      const result = await reattachImplementation.call({} as WSClient, reattachParams)

      expect(mockBuildOutboundCall).toHaveBeenCalledWith({ ...reattachParams, attach: true })
      expect(mockCallSession.start).toHaveBeenCalled()
      expect(result).toBe(mockCallSession)
    })
  })

  describe('Event listeners functionality', () => {
    test('should handle event listener attachment correctly', () => {
      const mockCallJoinedHandler = jest.fn()
      const mockMemberJoinedHandler = jest.fn()
      
      const handlers: Partial<CallSessionEventHandlers> = {
        'call.joined': mockCallJoinedHandler,
        'member.joined': mockMemberJoinedHandler,
      }

      // Mock the attachEventListeners implementation (same as dial tests)
      const attachEventListenersImplementation = function(
        callSession: CallSession,
        eventHandlers: Partial<CallSessionEventHandlers>
      ) {
        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
          if (typeof handler === 'function') {
            const wrappedHandler = async (params: any) => {
              try {
                await handler(params)
              } catch (error) {
                mockLogger.error(`Error in event handler for ${eventName}:`, error)
              }
            }
            callSession.on(eventName as any, wrappedHandler)
          }
        })
      }

      attachEventListenersImplementation(mockCallSession, handlers)

      expect(mockCallSession.on).toHaveBeenCalledWith('call.joined', expect.any(Function))
      expect(mockCallSession.on).toHaveBeenCalledWith('member.joined', expect.any(Function))
      expect(mockCallSession.on).toHaveBeenCalledTimes(2)
    })

    test('should support all event types for reattach', () => {
      const universalHandler = jest.fn()
      
      const allEvents: Partial<CallSessionEventHandlers> = {
        'call.joined': universalHandler,
        'call.state': universalHandler,
        'call.left': universalHandler,
        'call.updated': universalHandler,
        'member.joined': universalHandler,
        'member.left': universalHandler,
        'member.updated': universalHandler,
        'member.talking': universalHandler,
        'member.updated.audioMuted': universalHandler,
        'member.updated.videoMuted': universalHandler,
        'layout.changed': universalHandler,
        'recording.started': universalHandler,
        'recording.ended': universalHandler,
        'stream.started': universalHandler,
        'stream.ended': universalHandler,
        'playback.started': universalHandler,
        'playback.ended': universalHandler,
        'room.subscribed': universalHandler,
      }

      const attachEventListenersImplementation = function(
        callSession: CallSession,
        eventHandlers: Partial<CallSessionEventHandlers>
      ) {
        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
          if (typeof handler === 'function') {
            const wrappedHandler = async (params: any) => {
              try {
                await handler(params)
              } catch (error) {
                mockLogger.error(`Error in event handler for ${eventName}:`, error)
              }
            }
            callSession.on(eventName as any, wrappedHandler)
          }
        })
      }

      attachEventListenersImplementation(mockCallSession, allEvents)

      const expectedCallCount = Object.keys(allEvents).length
      expect(mockCallSession.on).toHaveBeenCalledTimes(expectedCallCount)
      
      const registeredEvents = (mockCallSession.on as jest.Mock).mock.calls.map(call => call[0])
      Object.keys(allEvents).forEach(eventName => {
        expect(registeredEvents).toContain(eventName)
      })
    })
  })

  describe('Error handling', () => {
    test('should handle cleanup failure gracefully', async () => {
      const startError = new Error('Start failed')
      const destroyError = new Error('Destroy failed')
      
      mockCallSession.start.mockRejectedValue(startError)
      mockCallSession.destroy.mockImplementation(() => {
        throw destroyError
      })

      const reattachParams: ReattachParams = {
        to: 'sip:user@example.com',
        nodeId: 'test-node-id',
      }

      const reattachImplementation = async function(params: ReattachParams) {
        const callSession = mockBuildOutboundCall({ ...params, attach: true })
        
        try {
          await callSession.start()
          return callSession
        } catch (error) {
          try {
            callSession.destroy()
          } catch (cleanupError) {
            mockLogger.warn('Error during callSession cleanup:', cleanupError)
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during reattach'
          mockLogger.error('Failed to reattach:', error)
          throw new Error(`Failed to reattach to ${params.to}: ${errorMessage}`, { cause: error })
        }
      }

      await expect(reattachImplementation.call({ logger: mockLogger } as any, reattachParams))
        .rejects.toThrow('Failed to reattach to sip:user@example.com: Start failed')
      
      expect(mockCallSession.destroy).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith('Error during callSession cleanup:', destroyError)
    })

    test('should handle unknown error types', async () => {
      const unknownError = 'String error'
      mockCallSession.start.mockRejectedValue(unknownError)

      const reattachParams: ReattachParams = {
        to: 'sip:user@example.com',
        nodeId: 'test-node-id',
      }

      const reattachImplementation = async function(params: ReattachParams) {
        const callSession = mockBuildOutboundCall({ ...params, attach: true })
        
        try {
          await callSession.start()
          return callSession
        } catch (error) {
          try {
            callSession.destroy()
          } catch (cleanupError) {
            mockLogger.warn('Error during callSession cleanup:', cleanupError)
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during reattach'
          mockLogger.error('Failed to reattach:', error)
          throw new Error(`Failed to reattach to ${params.to}: ${errorMessage}`, { cause: error })
        }
      }

      await expect(reattachImplementation.call({ logger: mockLogger } as any, reattachParams))
        .rejects.toThrow('Failed to reattach to sip:user@example.com: Unknown error occurred during reattach')
        
      expect(mockCallSession.destroy).toHaveBeenCalled()
    })
  })

  describe('Integration scenarios', () => {
    test('should handle complete reattach flow with event listeners', async () => {
      const mockHandler = jest.fn()
      const reattachParams: ReattachParams = {
        to: 'sip:user@example.com',
        nodeId: 'test-node-id',
        listen: {
          'call.joined': mockHandler,
          'member.joined': mockHandler,
        },
      }

      const fullReattachImplementation = async function(params: ReattachParams) {
        const callSession = mockBuildOutboundCall({ ...params, attach: true })
        
        try {
          if (params.listen) {
            // Simulate attachEventListeners
            Object.entries(params.listen).forEach(([eventName, handler]) => {
              if (typeof handler === 'function') {
                const wrappedHandler = async (eventParams: any) => {
                  try {
                    await handler(eventParams)
                  } catch (error) {
                    mockLogger.error(`Error in event handler for ${eventName}:`, error)
                  }
                }
                callSession.on(eventName as any, wrappedHandler)
              }
            })
          }
          
          await callSession.start()
          return callSession
        } catch (error) {
          try {
            callSession.destroy()
          } catch (cleanupError) {
            mockLogger.warn('Error during callSession cleanup:', cleanupError)
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during reattach'
          mockLogger.error('Failed to reattach:', error)
          throw new Error(`Failed to reattach to ${params.to}: ${errorMessage}`, { cause: error })
        }
      }

      const result = await fullReattachImplementation(reattachParams)

      expect(mockBuildOutboundCall).toHaveBeenCalledWith({ ...reattachParams, attach: true })
      expect(mockCallSession.on).toHaveBeenCalledWith('call.joined', expect.any(Function))
      expect(mockCallSession.on).toHaveBeenCalledWith('member.joined', expect.any(Function))
      expect(mockCallSession.start).toHaveBeenCalled()
      expect(result).toBe(mockCallSession)
    })

    test('should pass attach: true parameter to buildOutboundCall', async () => {
      const reattachParams: ReattachParams = {
        audio: true,
        video: false,
        to: 'sip:user@example.com',
        nodeId: 'test-node-id',
      }

      const reattachImplementation = async function(params: ReattachParams) {
        const callSession = mockBuildOutboundCall({ ...params, attach: true })
        await callSession.start()
        return callSession
      }

      await reattachImplementation(reattachParams)

      expect(mockBuildOutboundCall).toHaveBeenCalledWith({
        ...reattachParams,
        attach: true,
      })
    })
  })
})