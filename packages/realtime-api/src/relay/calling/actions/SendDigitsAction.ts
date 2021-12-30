import { BaseAction } from './BaseAction'
import { SendDigits } from '../components/SendDigits'
import { SendDigitsResult } from '../results/SendDigitsResult'

export class SendDigitsAction extends BaseAction<SendDigits, SendDigitsResult> {
  get result() {
    return new SendDigitsResult(this.component)
  }
}
