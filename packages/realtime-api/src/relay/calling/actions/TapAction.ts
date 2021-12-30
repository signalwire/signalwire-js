import { BaseAction } from './BaseAction'
import type { Tap } from '../components/Tap'
import { TapResult } from '../results/TapResult'

export class TapAction extends BaseAction<Tap, TapResult> {
  get result() {
    return new TapResult(this.component)
  }

  get sourceDevice() {
    return this.component.sourceDevice
  }

  stop() {
    return this.component.stop()
  }
}
