import { BaseResult } from './BaseResult'
import type { Record } from '../components/Record'

export class RecordResult extends BaseResult<Record> {
  get url(): string {
    return this.component.url
  }

  get duration(): number {
    return this.component.duration
  }

  get size(): number {
    return this.component.size
  }
}
