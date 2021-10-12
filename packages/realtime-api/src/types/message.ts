import { MessageObject } from '../message'

export type MessageAPIEventHandlerMapping = Record<'state' | 'receive', (messageObj: MessageObject) => void>