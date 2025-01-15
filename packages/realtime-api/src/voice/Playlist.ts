import type {
  CreateVoiceCallPlaylistParams,
  VoiceCallPlaylist,
  VoiceCallPlayParams,
  VoiceCallPlayAudioParams,
  VoiceCallPlayTTSParams,
  VoiceCallPlaySilenceParams,
  VoiceCallPlayRingtoneParams,
  VoiceCallPlaylistAudioParams,
  VoiceCallPlaylistTTSParams,
  VoiceCallPlaylistSilenceParams,
  VoiceCallPlaylistRingtoneParams,
} from '@signalwire/core'

/**
 * A Playlist object allows you to specify a series of media which should be
 * played in sequence. You can then pass the playlist to the methods that
 * support it, for example {@link Call.play}.
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
export class Playlist implements VoiceCallPlaylist {
  private _media: VoiceCallPlaylist['media'] = []

  constructor(private params: CreateVoiceCallPlaylistParams = {}) {}

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

  /**
   * An audio media.
   * @params params - {@link VoiceCallPlaylistAudioParams}
   * @returns - {@link VoiceCallPlayAudioParams}
   **/
  static Audio(params: VoiceCallPlaylistAudioParams): VoiceCallPlayAudioParams {
    return { type: 'audio', ...params }
  }

  /**
   * A TTS media.
   * @params params - {@link VoiceCallPlaylistTTSParams}
   * @returns - {@link VoiceCallPlayTTSParams}
   **/
  static TTS(params: VoiceCallPlaylistTTSParams): VoiceCallPlayTTSParams {
    return { type: 'tts', ...params }
  }

  /**
   * A silence interval.
   * @params params - {@link VoiceCallPlaylistSilenceParams}
   * @returns - {@link VoiceCallPlaySilenceParams}
   **/
  static Silence(
    params: VoiceCallPlaylistSilenceParams
  ): VoiceCallPlaySilenceParams {
    return { type: 'silence', ...params }
  }

  /**
   * A ringtone media.
   * @params param - {@link VoiceCallPlaylistRingtoneParams}
   * @returns - {@link VoiceCallPlayRingtoneParams}
   **/
  static Ringtone(
    params: VoiceCallPlaylistRingtoneParams
  ): VoiceCallPlayRingtoneParams {
    return { type: 'ringtone', ...params }
  }
}
