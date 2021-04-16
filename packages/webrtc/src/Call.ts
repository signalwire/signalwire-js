import { BaseCall } from './BaseCall'

export class Call extends BaseCall {
  desktopOnlyMethod() {
    console.debug('Desktop Method')
  }
}
