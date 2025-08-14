/**
 * Integration test bundle entry point
 * 
 * This file exports a factory function that tests can use to create
 * RTCPeerCore instances with the real implementation.
 */

import RTCPeerCore, { type RTCPeerDependencies, type RTCPeerLogger, type RTCPeerCallContract } from './RTCPeerCore'
import { getLogger, uuid } from '@signalwire/core'

// Export the RTCPeerCore class and its types
export { RTCPeerCore }
export type { RTCPeerDependencies, RTCPeerLogger, RTCPeerCallContract }

// Create a factory function that tests can use
export const createRTCPeerCore = <EventTypes = any>(
  call: RTCPeerCallContract<EventTypes>,
  type: RTCSdpType,
  customDependencies?: Partial<RTCPeerDependencies>
): RTCPeerCore<EventTypes> => {
  const dependencies: RTCPeerDependencies = {
    logger: getLogger(),
    uuidGenerator: uuid,
    ...customDependencies
  }
  
  return new RTCPeerCore(call, type, dependencies)
}

// Also export individual utilities that tests might need
export * from './utils'
export { connectionPoolManager } from './connectionPoolManager'

// Make it available globally for browser tests
if (typeof window !== 'undefined') {
  (window as any).RTCPeerIntegration = {
    createRTCPeerCore,
    RTCPeerCore
  }
}