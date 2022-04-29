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

export class Playlist implements VoicePlaylist {
  private _media: VoicePlaylist['media'] = []

  constructor(private params: CreateVoicePlaylistParams = {}) {}

  get volume() {
    return this.params?.volume
  }

  get media() {
    return this._media
  }

  add(params: VoiceCallPlayParams) {
    this._media.push(params)
    return this
  }

  static Audio(
    params: VoiceCallPlayAudioMethodParams
  ): VoiceCallPlayAudioParams {
    return { type: 'audio', ...params }
  }

  static TTS(params: VoiceCallPlayTTSMethodParams): VoiceCallPlayTTSParams {
    return { type: 'tts', ...params }
  }

  static Silence(
    params: VoiceCallPlaySilenceMethodParams
  ): VoiceCallPlaySilenceParams {
    return { type: 'silence', ...params }
  }

  static Ringtone(
    params: VoiceCallPlayRingtoneMethodParams
  ): VoiceCallPlayRingtoneParams {
    return { type: 'ringtone', ...params }
  }
}
