import type { Rooms } from '@signalwire/core'

/**
 * Interface for room member self-control methods (audio/video mute, volume, etc.)
 */
interface RoomMemberSelfMethodsInterface {
  /**
   * Puts the microphone on mute. The other participants will not hear audio
   * from the muted device anymore.
   */
  audioMute(): Rooms.AudioMuteMember

  /**
   * Unmutes the microphone if it had been previously muted.
   */
  audioUnmute(): Rooms.AudioUnmuteMember

  /**
   * Puts the video on mute. Participants will see a mute image instead of the
   * video stream.
   */
  videoMute(): Rooms.VideoMuteMember

  /**
   * Unmutes the video if it had been previously muted. Participants will start
   * seeing the video stream again.
   */
  videoUnmute(): Rooms.VideoUnmuteMember

  /**
   * @deprecated Use {@link setInputVolume} instead.
   */
  setMicrophoneVolume(params: { volume: number }): Rooms.SetInputVolumeMember

  /**
   * Sets the input volume level (e.g. for the microphone).
   * @param params
   * @param params.volume desired volume. Values range from -50 to 50, with a
   * default of 0.
   */
  setInputVolume(params: { volume: number }): Rooms.SetInputVolumeMember

  /**
   * Sets the input level at which the participant is identified as currently
   * speaking.
   * @param params
   * @param params.value desired sensitivity. The default value is 30 and the
   * scale goes from 0 (lowest sensitivity, essentially muted) to 100 (highest
   * sensitivity).
   */
  setInputSensitivity(params: {
    value: number
  }): Rooms.SetInputSensitivityMember
}

/**
 * Methods available on RoomSessionDevice instances
 */
export interface RoomSessionDeviceMethods
  extends RoomMemberSelfMethodsInterface {}

/**
 * Methods available on RoomSessionScreenShare instances
 */
export interface RoomScreenShareMethods
  extends RoomMemberSelfMethodsInterface {}