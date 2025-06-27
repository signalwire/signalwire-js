import { WebRTCEventType } from '..'

const UPPERCASE_REGEX = /[A-Z]/g
/**
 * Converts values from camelCase to snake_case
 * @internal
 */
export const fromCamelToSnakeCase = <T>(value: T): T => {
  // @ts-ignore
  return value.replace(UPPERCASE_REGEX, (letter) => {
    return `_${letter.toLowerCase()}`
  }) as T
}

export const WEBRTC_EVENT_TYPES: WebRTCEventType[] = [
  'webrtc.message',
  // 'webrtc.verto',
]
export const isWebrtcEventType = (
  eventType: string
): eventType is WebRTCEventType => {
  // @ts-expect-error
  return WEBRTC_EVENT_TYPES.includes(eventType)
}
