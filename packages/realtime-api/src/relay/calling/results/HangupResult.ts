import { BaseResult } from './BaseResult'
import type { Hangup } from '../components/Hangup'

export class HangupResult extends BaseResult<Hangup> {
  get reason(): string {
    return this.component.reason
  }
}
