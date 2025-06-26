import {
  validateAudioMute,
  validateAudioUnmute,
  validateDeaf,
  validateLock,
  validateRemoveMember,
  validateSetInputSensitivity,
  validateSetInputVolume,
  validateSetLayout,
  validateSetOutputVolume,
  validateSetPositions,
  validateSetRaiseHand,
  validateUndeaf,
  validateUnlock,
  validateVideoMute,
  validateVideoUnmute,
} from './validators'
import {
  UnifiedCommunicationSession,
  UnifiedCommunicationSessionConnection,
} from '../UnifiedCommunicationSession'

type ValidatorMap = Partial<
  Record<
    keyof UnifiedCommunicationSession,
    (this: UnifiedCommunicationSessionConnection, ...args: any[]) => void
  >
>

export const validationsMap: ValidatorMap = {
  audioMute: validateAudioMute,
  audioUnmute: validateAudioUnmute,
  videoMute: validateVideoMute,
  videoUnmute: validateVideoUnmute,
  deaf: validateDeaf,
  undeaf: validateUndeaf,
  removeMember: validateRemoveMember,
  setRaisedHand: validateSetRaiseHand,
  setLayout: validateSetLayout,
  setInputVolume: validateSetInputVolume,
  setOutputVolume: validateSetOutputVolume,
  setInputSensitivity: validateSetInputSensitivity,
  setPositions: validateSetPositions,
  lock: validateLock,
  unlock: validateUnlock,
}

/**
 * Wraps a UnifiedCommunicationSession instance with a Proxy that runs validation
 * functions (from validationsMap) before calling the original method.
 *
 * @param instance - The UnifiedCommunicationSession instance to wrap.
 * @returns The proxied UnifiedCommunicationSession.
 */
export function createUnifiedCommunicationSessionValidateProxy(
  instance: UnifiedCommunicationSession
) {
  return new Proxy(instance, {
    get(target, prop: keyof UnifiedCommunicationSession, receiver) {
      // Only intercept keys that have an associated validator
      if (typeof prop === 'string' && prop in validationsMap) {
        const targetConn =
          target as unknown as UnifiedCommunicationSessionConnection
        const origMethod = targetConn[prop] as Function
        if (typeof origMethod === 'function') {
          // Wrap in a promise so validator runs asynchronously
          return async function (...args: unknown[]) {
            // Run the validator before calling the method
            const validator =
              validationsMap[prop as keyof UnifiedCommunicationSession]
            if (validator) {
              validator.apply(targetConn, args)
            }
            return origMethod.apply(targetConn, args)
          }
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}
