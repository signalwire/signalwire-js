import { BaseResult } from './BaseResult'
import type { Detect } from '../components/Detect'

export class DetectResult extends BaseResult<Detect> {
  get type(): string {
    return this.component.type
  }

  get result(): string {
    return this.component.result
  }
}
