import type {
  CreateVoicePlaylistParams,
  VoicePlaylist,
  VoiceCallPlayParams,
  VoiceCallPlayAudioParams,
  VoiceCallPlayAudioMethodParams,
  VoiceCallPlayTTSParams,
  VoiceCallPlayTTSMethodParams,
  VoiceCallPlaySilenceParams,
  VoiceCallPlaySilenceMethodParams,
  VoiceCallPlayRingtoneParams,
  VoiceCallPlayRingtoneMethodParams,
} from '@signalwire/core'

/**
 * A Playlist object allows you to specify a series of media which should be
 * played in sequence. You can then use the playlist to the methods that support
 * it, for example {@link Call.play}.
 *
 * @example
 *
 * Creates a playlist for playing, in sequence, a TTS message, 1 second of
 * silence, and an mp3 file.
 *
 * ```js
 * const playlist = new Voice.Playlist({ volume: 1.0 })
 *   .add(Voice.Playlist.TTS({
 *     text: 'Welcome to SignalWire!',
 *   }))
 *   .add(Voice.Playlist.Silence({ duration: 1 }))
 *   .add(Voice.Playlist.Audio({
 *     url: 'https://cdn.signalwire.com/default-music/welcome.mp3'
 *   }))
 * ```
 */
export class Playlist implements VoicePlaylist {
  private _media: VoicePlaylist['media'] = []

  constructor(private params: CreateVoicePlaylistParams = {}) {}

  /** Default volume for the audio in the playlist. */
  get volume() {
    return this.params?.volume
  }

  /** The media in this playlist. */
  get media() {
    return this._media
  }

  /** Adds a new media to the playlist*/
  add(params: VoiceCallPlayParams) {
    this._media.push(params)
    return this
  }

  /** An audio media. */
  static Audio(
    params: VoiceCallPlayAudioMethodParams
  ): VoiceCallPlayAudioParams {
    return { type: 'audio', ...params }
  }

  /** A TTS media. */
  static TTS(params: VoiceCallPlayTTSMethodParams): VoiceCallPlayTTSParams {
    return { type: 'tts', ...params }
  }

  /** A silence interval. */
  static Silence(
    params: VoiceCallPlaySilenceMethodParams
  ): VoiceCallPlaySilenceParams {
    return { type: 'silence', ...params }
  }

  /** A ringtone media. */
  static Ringtone(
    params: VoiceCallPlayRingtoneMethodParams
  ): VoiceCallPlayRingtoneParams {
    return { type: 'ringtone', ...params }
  }
}
