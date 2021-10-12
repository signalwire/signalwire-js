import { EventEmitter } from '..'
import { BaseComponent } from '../BaseComponent'

interface MessageMethodPropertyDescriptor<T, ParamsType> extends PropertyDescriptor {
  value: (params: ParamsType) => Promise<T>
}

type MessageMethodDescriptor<
  T = unknown,
  ParamsType = MessageMethodParams
> = MessageMethodPropertyDescriptor<T, ParamsType> &
  ThisType<BaseComponent<EventEmitter.ValidEventTypes>>

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> 
  & {
      [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

export type MessageMethodParams = RequireAtLeastOne<{
  type: 'sms' | 'mms',
  context: string,
  region?: string,
  body: string,
  tags?: string[],
  medias: string[],
  to: string,
  from: string,
}, 'medias' | 'body'>

export type MessageMethodResponse = {
  message_id: string,
  code: string,
  message: string
}

export type MessageMethodParamsWithoutType = Omit<MessageMethodParams, 'type'>

export const send: MessageMethodDescriptor<MessageMethodResponse> = {
  value: function({ to: to_number, from: from_number, ...rest}: MessageMethodParams): Promise<MessageMethodResponse> {
    return this.execute({
      method: 'messaging.send',
      params: {
        to_number,
        from_number,
        ...rest
      }
    })
  }
}

export const sendSMS: MessageMethodDescriptor<MessageMethodResponse> = {
  value: function({ to: to_number, from: from_number, ...rest}: MessageMethodParamsWithoutType): Promise<MessageMethodResponse> {
    return this.execute({
      method: 'messaging.send',
      params: {
        type: 'sms',
        to_number,
        from_number,
        ...rest
      }
    })
  }
}


export const sendMMS: MessageMethodDescriptor<MessageMethodResponse> = {
  value: function({ to: to_number, from: from_number, ...rest}: MessageMethodParamsWithoutType): Promise<MessageMethodResponse> {
    return this.execute({
      method: 'messaging.send',
      params: {
        type: 'mms',
        to_number,
        from_number,
        ...rest
      }
    })
  }
}
