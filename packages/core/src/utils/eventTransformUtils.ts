import { EventTransform, EventTransformType } from './interfaces'
import { proxyFactory } from './proxyUtils'

interface InstanceProxyFactoryParams {
  transform: EventTransform
  payload: Record<any, unknown>
}

interface NestedFieldToProcess {
  /** Nested field to transform through an EventTransform */
  field: string
  /**
   * Allow us to update the nested `payload` to match the shape we already
   * treat consuming other events from the server.
   * For example: wrapping the `payload` within a specific key.
   *  `payload` becomes `{ "member": payload }`
   */
  preProcessPayload: (payload: any) => any
  /** Type of the EventTransform to select from `instance._emitterTransforms` */
  eventTransformType: EventTransformType
}

/**
 * Note: the cached instances within `_instanceByTransformType` will never be
 * cleaned since we're caching by `transform.type` so we will always have one
 * instance per type regardless of the Room/Member/Recording we're working on.
 * This is something we can improve in the future, but not an issue right now.
 * Exported for test purposes
 */
export const _instanceByTransformType = new Map<string, EventTransform>()
export const NESTED_FIELDS_TO_PROCESS: NestedFieldToProcess[] = [
  {
    field: 'members',
    preProcessPayload: (payload) => ({ member: payload }),
    eventTransformType: 'roomSessionMember',
  },
  {
    field: 'recordings',
    preProcessPayload: (payload) => ({ recording: payload }),
    eventTransformType: 'roomSessionRecording',
  },
]

const _getOrCreateInstance = ({
  transform,
  payload,
}: InstanceProxyFactoryParams) => {
  if (!_instanceByTransformType.has(transform.type)) {
    const instance = transform.instanceFactory(payload)
    _instanceByTransformType.set(transform.type, instance)

    return instance
  }

  return _instanceByTransformType.get(transform.type)
}

export const instanceProxyFactory = ({
  transform,
  payload,
}: InstanceProxyFactoryParams) => {
  /** Create the instance or pick from cache */
  const cachedInstance = _getOrCreateInstance({
    transform,
    payload,
  })

  const transformedPayload = transform.payloadTransform(payload)
  const proxiedObj = proxyFactory({
    transform,
    payload,
    instance: cachedInstance,
    transformedPayload,
  })

  return proxiedObj
}
