import { BaseResult } from './BaseResult'
import type { Dial } from '../components/Dial'
import type Call from '../Call'

export class DialResult extends BaseResult<Dial> {
  get call(): Call {
    return this.component.call
  }
}
