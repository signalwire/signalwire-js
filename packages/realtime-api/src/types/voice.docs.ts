import { Call } from '../voice/Call'
import { CallPlayback } from '../voice/CallPlayback'
import { CallPrompt } from '../voice/CallPrompt'
import { CallRecording } from '../voice/CallRecording'
import { CallTap } from '../voice/CallTap'

export interface RealTimeCallApiEventsDocs {
  /**
   * A call has been received. You can use the provided Call object to answer.
   */
  'call.received': (call: Call) => void

  /** A playback has started. */
  'playback.started': (playback: CallPlayback) => void

  /** The state of a playback changed. */
  'playback.updated': (playback: CallPlayback) => void

  /** A playback ended. */
  'playback.ended': (playback: CallPlayback) => void

  /** A recording started. */
  'recording.started': (recording: CallRecording) => void

  /** The state of a recording changed. */
  'recording.updated': (recording: CallRecording) => void

  /** A recording ended. */
  'recording.ended': (recording: CallRecording) => void

  /** A recording failed. */
  'recording.failed': (recording: CallRecording) => void

  /** A prompt started. */
  'prompt.started': (prompt: CallPrompt) => void

  /** The state of a prompt changed. */
  'prompt.updated': (prompt: CallPrompt) => void

  /** A prompt has ended. */
  'prompt.ended': (prompt: CallPrompt) => void

  /** A prompt has failed. */
  'prompt.failed': (prompt: CallPrompt) => void

  /** A tap started. */
  'tap.started': (tap: CallTap) => void

  /** A tap ended. */
  'tap.ended': (tap: CallTap) => void
}
