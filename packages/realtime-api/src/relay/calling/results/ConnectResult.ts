import { BaseResult } from './BaseResult'
import type { Connect } from '../components/Connect'
import { Call } from '../Call'

export class ConnectResult extends BaseResult<Connect> {
  get call(): Call {
    return this.component.call.peer
  }
}
