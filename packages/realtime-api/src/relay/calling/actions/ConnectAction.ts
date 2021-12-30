import { BaseAction } from './BaseAction'
import type { Connect } from '../components/Connect'
import { ConnectResult } from '../results/ConnectResult'

export class ConnectAction extends BaseAction<Connect, ConnectResult> {
  get result() {
    return new ConnectResult(this.component)
  }
}
