import type { BaseComponent } from '../components/BaseComponent'
import type { BaseResult } from '../results/BaseResult'

export abstract class BaseAction<
  T extends BaseComponent,
  R extends BaseResult<T>
> {
  constructor(public component: T) {}

  abstract get result(): R

  get controlId(): string {
    return this.component.controlId
  }

  get payload(): any {
    return this.component.payload
  }

  get completed(): boolean {
    return this.component.completed
  }

  get state(): string {
    return this.component.state
  }
}
