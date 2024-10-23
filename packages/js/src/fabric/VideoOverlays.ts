import { CallFabricRoomSession } from './CallFabricRoomSession'
import { getLogger } from '@signalwire/core'

export type LayerMap = Map<string, UserOverlay>

interface UserOverlayOptions {
  id: string
  layerMap: LayerMap
}

type OverlayStatus = 'hidden' | 'visible'

export class UserOverlay {
  public id: string
  protected layerMap: LayerMap
  private _status: OverlayStatus
  private _domElement: HTMLDivElement | undefined

  constructor(options: UserOverlayOptions) {
    this.id = options.id
    this.layerMap = options.layerMap
    this._status = 'hidden'

    this.layerMap.set(this.id, this)
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

  hide() {
    if (!this.domElement) {
      return getLogger().warn('Missing overlay to hide')
    }
    this.domElement.style.opacity = '0'
    this.status = 'hidden'
  }

  show() {
    if (!this.domElement) {
      return getLogger().warn('Missing overlay to show')
    }
    if (this.status === 'hidden') {
      return getLogger().info('Overlay not visible for ', this.id)
    }
    this.domElement.style.opacity = '1'
    this.status = 'visible'
  }
}

interface LocalVideoOverlayOptions {
  id: string
  layerMap: LayerMap
  room: CallFabricRoomSession
}

export class LocalVideoOverlay extends UserOverlay {
  private room: CallFabricRoomSession

  constructor(options: LocalVideoOverlayOptions) {
    super(options)
    this.room = options.room
  }

  setMediaStream(stream: MediaStream) {
    if (!this.domElement) {
      return getLogger().warn('Missing local overlay to set the stream')
    }
    const localVideo = this.domElement.querySelector('video')
    if (localVideo) {
      localVideo.srcObject = stream
    }
  }

  setMirror(mirror: boolean = this.room.localOverlay.mirrored) {
    if (!this.domElement || !this.domElement.firstChild) {
      return getLogger().warn('Missing local overlay to set the mirror')
    }
    const videoEl = this.domElement.firstChild as HTMLVideoElement
    const mirrorVideo = mirror ?? this.room.localOverlay.mirrored
    videoEl.style.transform = mirrorVideo ? 'scale(-1, 1)' : 'scale(1, 1)'
    videoEl.style.webkitTransform = mirrorVideo ? 'scale(-1, 1)' : 'scale(1, 1)'
  }
}
