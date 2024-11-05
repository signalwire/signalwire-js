import { OVERLAY_PREFIX, SDK_PREFIX } from '../utils/videoElement'
import { DeprecatedVideoMemberHandlerParams } from '../video'
import { CallFabricRoomSession } from './CallFabricRoomSession'
import { getLogger } from '@signalwire/core'

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
  room: CallFabricRoomSession
  mirrorLocalVideoOverlay: boolean
}

export class LocalVideoOverlay extends UserOverlay {
  private _room: CallFabricRoomSession
  private _mirrored: boolean

  constructor(options: LocalVideoOverlayOptions) {
    super(options)
    this._room = options.room
    this._mirrored = options.mirrorLocalVideoOverlay

    this.attachListeners()
  }

  get userId() {
    return this.id.split(SDK_PREFIX)[1]
  }

  get mirrored() {
    return this._mirrored
  }

  private attachListeners() {
    this._room.on('member.updated.video_muted', this.memberVideoMutedHandler)
  }

  /** @internal */
  public detachListeners() {
    this._room.off('member.updated.video_muted', this.memberVideoMutedHandler)
  }

  private memberVideoMutedHandler(params: DeprecatedVideoMemberHandlerParams) {
    try {
      const { member } = params
      if (member.id === this._room.memberId && 'video_muted' in member) {
        member.video_muted ? this.hide() : this.show()
      }
    } catch (error) {
      getLogger().error(
        'Error handling video_muted in LocalVideoOverlay',
        error
      )
    }
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
