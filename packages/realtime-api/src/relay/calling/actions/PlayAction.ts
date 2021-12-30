import { BaseAction } from './BaseAction'
import type { Play } from '../components/Play'
import {
  PlayResult,
  PlayPauseResult,
  PlayResumeResult,
  PlayVolumeResult,
} from '../results'

export class PlayAction extends BaseAction<Play, PlayResult> {
  get result() {
    return new PlayResult(this.component)
  }

  stop() {
    return this.component.stop()
  }

  async pause() {
    const res = await this.component.pause()
    return new PlayPauseResult(res)
  }

  async resume() {
    const res = await this.component.resume()
    return new PlayResumeResult(res)
  }

  async volume(value: number) {
    const res = await this.component.volume(value)
    return new PlayVolumeResult(res)
  }
}
