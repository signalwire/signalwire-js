import type { BaseComponent } from '../components/BaseComponent'
import type { Event } from '../Event'

export abstract class BaseResult<T extends BaseComponent> {
  constructor(public component: T) {}

  get successful(): boolean {
    return this.component.successful
  }

  get event(): Event {
    return this.component.event
  }
}
