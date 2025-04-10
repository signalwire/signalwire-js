import {
  validateAudioMute,
  validateAudioUnmute,
  validateDeaf,
  validateLock,
  validateRemoveMember,
  validateSetInputSensitivity,
  validateSetInputVolume,
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
  setInputVolume: validateSetInputVolume,
  setOutputVolume: validateSetOutputVolume,
  setInputSensitivity: validateSetInputSensitivity,
  setPositions: validateSetPositions,
  lock: validateLock,
  unlock: validateUnlock,
}

export function createFabricRoomSessionValidateProxy(
  instance: FabricRoomSession
) {
  return new Proxy(instance, {
    get(target, prop: keyof FabricRoomSession, receiver) {
      if (typeof prop === 'string' && prop in validationsMap) {
        const targetConn = target as unknown as FabricRoomSessionConnection
        const origMethod = targetConn[prop]
        if (typeof origMethod === 'function') {
          return function (...args: unknown[]) {
            // Run the validator before calling the method
            const validator = validationsMap[prop]
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
