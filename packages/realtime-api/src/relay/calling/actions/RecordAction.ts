import { BaseAction } from './BaseAction'
import type { Record } from '../components/Record'
import { RecordResult } from '../results/RecordResult'

export class RecordAction extends BaseAction<Record, RecordResult> {
  get result() {
    return new RecordResult(this.component)
  }

  get url(): string {
    return this.component.url
  }

  stop() {
    return this.component.stop()
  }
}
