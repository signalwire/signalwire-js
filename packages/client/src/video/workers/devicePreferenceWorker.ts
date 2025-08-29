import {
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
} from '@signalwire/core'
import { BaseRoomSessionConnection } from '../../BaseRoomSession'

export type DevicePreferenceWorkerParams =
  SDKWorkerParams<BaseRoomSessionConnection> & {
    action: any
  }

export const devicePreferenceWorker: SDKWorker<BaseRoomSessionConnection> =
  function* (options): SagaIterator {
    getLogger().trace('devicePreferenceWorker started')

    const { channels, instance: roomSession } = options
    const { swEventChannel } = channels

    function* worker(action: any) {
      const { type, payload } = action

      switch (type) {
        case 'device.preference.update':
          try {
            const { deviceType, deviceId, preference } = payload
            const deviceManager = roomSession.deviceManager

            if (deviceManager) {
              switch (deviceType) {
                case 'camera':
                  yield sagaEffects.call(
                    [deviceManager, 'setCamera'],
                    deviceId,
                    preference
                  )
                  break
                case 'microphone':
                  yield sagaEffects.call(
                    [deviceManager, 'setMicrophone'],
                    deviceId,
                    preference
                  )
                  break
                case 'speaker':
                  yield sagaEffects.call(
                    [deviceManager, 'setSpeaker'],
                    deviceId,
                    preference
                  )
                  break
              }
            }
          } catch (error) {
            getLogger().error('Device preference update failed:', error)
            roomSession.emit('device.preference.update.failed', {
              error,
              payload,
            })
          }
          return

        case 'device.preference.clear':
          try {
            const { deviceType } = payload
            const deviceManager = roomSession.deviceManager

            if (deviceManager) {
              yield sagaEffects.call(
                [deviceManager, 'clearPreferences'],
                deviceType
              )
            }
          } catch (error) {
            getLogger().error('Device preference clear failed:', error)
            roomSession.emit('device.preference.clear.failed', {
              error,
              payload,
            })
          }
          return

        case 'device.recovery.trigger':
          try {
            const { deviceType } = payload
            const deviceManager = roomSession.deviceManager

            if (deviceManager) {
              yield sagaEffects.call(
                [deviceManager, 'recoverDevice'],
                deviceType
              )
            }
          } catch (error) {
            getLogger().error('Device recovery failed:', error)
            roomSession.emit('device.recovery.failed', {
              error,
              payload,
            })
          }
          return

        default:
          break
      }
    }

    const isDevicePreferenceEvent = (action: any) => {
      return (
        action.type.startsWith('device.preference.') ||
        action.type.startsWith('device.recovery.')
      )
    }

    while (true) {
      const action = yield sagaEffects.take(
        swEventChannel,
        isDevicePreferenceEvent
      )

      yield sagaEffects.fork(worker, action)
    }

    getLogger().trace('devicePreferenceWorker ended')
  }
