import { BaseResult } from './BaseResult'
import { Tap } from '../components/Tap'
import {
  IRelayCallingTapTap,
  IRelayCallingTapDevice,
} from '../../../util/interfaces'

export class TapResult extends BaseResult<Tap> {
  get tap(): IRelayCallingTapTap {
    return this.component.tap
  }

  get sourceDevice(): IRelayCallingTapDevice {
    return this.component.sourceDevice
  }

  get destinationDevice(): IRelayCallingTapDevice {
    return this.component.device
  }
}
