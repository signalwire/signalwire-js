import { BaseResult } from './BaseResult'
import type { Prompt } from '../components/Prompt'

export class PromptResult extends BaseResult<Prompt> {
  get type(): string {
    return this.component.type
  }

  get result(): string {
    return this.component.input
  }

  get terminator(): string {
    return this.component.terminator
  }

  get confidence(): number {
    return this.component.confidence
  }
}
