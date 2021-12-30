import { BaseResult } from './BaseResult'
import type { BaseFax } from '../components/BaseFax'

export class FaxResult extends BaseResult<BaseFax> {
  get direction(): string {
    return this.component.direction
  }

  get identity(): string {
    return this.component.identity
  }

  get remoteIdentity(): string {
    return this.component.remoteIdentity
  }

  get document(): string {
    return this.component.document
  }

  get pages(): number {
    return this.component.pages
  }
}
