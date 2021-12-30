import { BaseAction } from './BaseAction'
import type { Detect } from '../components'
import { DetectResult } from '../results/DetectResult'

export class DetectAction extends BaseAction<Detect, DetectResult> {
  get result() {
    return new DetectResult(this.component)
  }

  stop() {
    return this.component.stop()
  }
}
