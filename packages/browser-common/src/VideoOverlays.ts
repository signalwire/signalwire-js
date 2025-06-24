import { FabricMemberUpdatedEventParams, getLogger } from '@signalwire/core'
import { VideoRoomSession, isVideoRoomSession } from '../../js/src/video/VideoRoomSession'
import {
  CallSession,
  isCallSession,
} from '@signalwire/browser-js'
import { VideoMemberUpdatedHandlerParams } from '../../js/src/utils/interfaces'
import { OVERLAY_PREFIX, SDK_PREFIX } from '../../js/src/utils/roomSession'

export type OverlayMap = Map<string, UserOverlay>

interface UserOverlayOptions {
  id: string
}

export type OverlayStatus = 'hidden' | 'visible'

export class UserOverlay {
  public id: string
  private _domElement: HTMLDivElement | undefined
  private _status: OverlayStatus

  constructor(options: UserOverlayOptions) {
    this.id = options.id
    this._status = 'hidden'
  }

  get userId() {
    return this.id.split(OVERLAY_PREFIX)[1]
  }

  get domElement() {
    return this._domElement
  }

  set domElement(element: HTMLDivElement | undefined) {
    getLogger().debug('Setting domElement for ', this.id)
    this._domElement = element
  }

  get status() {
    return this._status
  }

  set status(status: OverlayStatus) {
    this._status = status
  }

  public hide() {
    if (!this.domElement) {
      return getLogger().warn('Missing overlay to hide')
    }
    this.domElement.style.opacity = '0'
    this.status = 'hidden'
  }

  public show() {
    if (!this.domElement) {
      return getLogger().warn('Missing overlay to show')
    }
    this.domElement.style.opacity = '1'
    this.status = 'visible'
  }
}

interface LocalVideoOverlayOptions {
  id: string
  mirrorLocalVideoOverlay: boolean
  room: CallSession | VideoRoomSession
}

export class LocalVideoOverlay extends UserOverlay {
  private _mirrored: boolean
  private _room: CallSession | VideoRoomSession

  constructor(options: LocalVideoOverlayOptions) {
    super(options)
    this._mirrored = options.mirrorLocalVideoOverlay
    this._room = options.room

    // Bind the handler to preserve context
    this.fabricMemberVideoMutedHandler =
      this.fabricMemberVideoMutedHandler.bind(this)
    this.videoMemberVideoMutedHandler =
      this.videoMemberVideoMutedHandler.bind(this)

    this.attachListeners()
  }

  get userId() {
    return this.id.split(SDK_PREFIX)[1]
  }

  get mirrored() {
    return this._mirrored
  }

  private attachListeners() {
    if (isCallSession(this._room)) {
      this._room.on(
        'member.updated.videoMuted',
        this.fabricMemberVideoMutedHandler
      )
    } else if (isVideoRoomSession(this._room)) {
      this._room.on(
        'member.updated.videoMuted',
        this.videoMemberVideoMutedHandler
      )
    }
  }

  /** @internal */
  public detachListeners() {
    if (isCallSession(this._room)) {
      this._room.off(
        'member.updated.videoMuted',
        this.fabricMemberVideoMutedHandler
      )
    } else if (isVideoRoomSession(this._room)) {
      this._room.off(
        'member.updated.videoMuted',
        this.videoMemberVideoMutedHandler
      )
    }
  }

  private memberVideoMutedHandler(memberId: string, videoMuted: boolean) {
    try {
      if (memberId === this._room.memberId) {
        videoMuted ? this.hide() : this.show()
      }
    } catch (error) {
      getLogger().error('Error handling videoMuted in LocalVideoOverlay', error)
    }
  }

  private fabricMemberVideoMutedHandler(
    params: FabricMemberUpdatedEventParams
  ) {
    this.memberVideoMutedHandler(
      params.member.member_id,
      params.member.video_muted
    )
  }

  private videoMemberVideoMutedHandler(
    params: VideoMemberUpdatedHandlerParams
  ) {
    this.memberVideoMutedHandler(params.member.id, params.member.video_muted)
  }

  public setMediaStream(stream: MediaStream) {
    if (!this.domElement) {
      return getLogger().warn('Missing local overlay to set the stream')
    }
    const localVideo = this.domElement.querySelector('video')
    if (localVideo) {
      localVideo.srcObject = stream
    }
  }

  public setMirror(mirror: boolean = this._mirrored) {
    if (!this.domElement || !this.domElement.firstChild) {
      return getLogger().warn('Missing local overlay to set the mirror')
    }
    const videoEl = this.domElement.firstChild as HTMLVideoElement
    videoEl.style.transform = mirror ? 'scale(-1, 1)' : 'scale(1, 1)'
    videoEl.style.webkitTransform = mirror ? 'scale(-1, 1)' : 'scale(1, 1)'
    this._mirrored = mirror
  }
}
