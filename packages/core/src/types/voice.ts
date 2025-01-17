import { PRODUCT_PREFIX_VOICE_CALL } from '../utils/constants'

export type VoiceNamespace = typeof PRODUCT_PREFIX_VOICE_CALL
export type ToInternalVoiceEvent<T extends string> = `${VoiceNamespace}.${T}`

export interface NestedArray<T> extends Array<T | NestedArray<T>> {}

export * from './voiceCall'
export * from './voicePlayback'
export * from './voiceRecording'
export * from './voiceDetect'
export * from './voiceTap'
export * from './voiceCollect'
export * from './voicePrompt'
export * from './voiceSendDigits'
export * from './voiceConnect'
