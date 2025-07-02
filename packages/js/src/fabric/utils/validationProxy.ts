import {
  validateAudioMute,
  validateAudioUnmute,
  validateDeaf,
  validateLock,
  validateRemoveMember,
  validateSetAudioFlags,
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
  FabricRoomSession,
  FabricRoomSessionConnection,
} from '../FabricRoomSession'

type ValidatorMap = Partial<
  Record<
    keyof FabricRoomSession,
    (this: FabricRoomSessionConnection, ...args: any[]) => void
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
  setAudioFlags: validateSetAudioFlags,
}

/**
 * Wraps a FabricRoomSession instance with a Proxy that runs validation
 * functions (from validationsMap) before calling the original method.
 *
 * @param instance - The FabricRoomSession instance to wrap.
 * @returns The proxied FabricRoomSession.
 */
export function createFabricRoomSessionValidateProxy(
  instance: FabricRoomSession
) {
  return new Proxy(instance, {
    get(target, prop: keyof FabricRoomSession, receiver) {
      // Only intercept keys that have an associated validator
      if (typeof prop === 'string' && prop in validationsMap) {
        const targetConn = target as unknown as FabricRoomSessionConnection
        const origMethod = targetConn[prop] as Function
        if (typeof origMethod === 'function') {
          // Wrap in a promise so validator runs asynchronously
          return async function (...args: unknown[]) {
            // Run the validator before calling the method
            const validator = validationsMap[prop as keyof FabricRoomSession]
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
