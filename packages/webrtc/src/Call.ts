import { CallEvents } from '@signalwire/core'
import { BaseCall } from './BaseCall'

export class Call<T extends string = CallEvents> extends BaseCall<T> {
  desktopOnlyMethod() {
    console.debug('Desktop Method')
  }
}
