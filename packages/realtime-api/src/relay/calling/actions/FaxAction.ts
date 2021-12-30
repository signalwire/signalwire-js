import { BaseAction } from './BaseAction'
import type { BaseFax } from '../components/BaseFax'
import { FaxResult } from '../results/FaxResult'

export class FaxAction extends BaseAction<BaseFax, FaxResult> {
  get result() {
    return new FaxResult(this.component)
  }

  stop() {
    return this.component.stop()
  }
}
