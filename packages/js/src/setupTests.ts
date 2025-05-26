import { WebSocket } from 'mock-socket'

// Define a mock MediaStreamTrack
class MockMediaStreamTrack {
  kind: string
  private listeners: { [key: string]: Array<() => void> } = {}

  constructor(kind: string) {
    this.kind = kind
  }

  addEventListener(event: string, handler: () => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(handler)
  }

  removeEventListener(event: string, handler: () => void) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter((h) => h !== handler)
  }

  // Simulate event trigger for testing purposes
  trigger(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((handler) => handler())
    }
  }
}

global.MediaStreamTrack = MockMediaStreamTrack as any

// Define a mock MediaStream
class MockMediaStream {
  tracks: MediaStreamTrack[]
  constructor(tracks: MediaStreamTrack[]) {
    this.tracks = tracks
  }
  getTracks() {
    return this.tracks
  }
  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video')
  }
}

// Mock MediaStream globally
global.MediaStream = MockMediaStream as any

class MockHTMLMediaElement {
  static HAVE_NOTHING = 0
  readyState: number = MockHTMLMediaElement.HAVE_NOTHING
}

// Mock global HTMLMediaElement
;(global as any).HTMLMediaElement = MockHTMLMediaElement

// Define a mock ResizeObserver
class MockResizeObserver {
  private callback: ResizeObserverCallback
  private observedElements = new Map<
    Element,
    {
      contentRect: DOMRectReadOnly
      contentBoxSize: readonly { inlineSize: number; blockSize: number }[]
      target: Element
      borderBoxSize?: readonly { inlineSize: number; blockSize: number }[]
      devicePixelContentBoxSize?: readonly {
        inlineSize: number
        blockSize: number
      }[]
    }
  >()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    const entry: ResizeObserverEntry = {
      contentRect: target.getBoundingClientRect(),
      contentBoxSize: [
        { inlineSize: target.clientWidth, blockSize: target.clientHeight },
      ],
      target,
      borderBoxSize: [],
      devicePixelContentBoxSize: [],
    }

    this.observedElements.set(target, entry)

    // Trigger callback immediately to simulate initial observation
    this.callback([entry], this)
  }

  unobserve(target: Element) {
    this.observedElements.delete(target)
  }

  disconnect() {
    this.observedElements.clear()
  }
}

// Mock global ResizeObserver
global.ResizeObserver = MockResizeObserver

// Define a mock Audio
class MockAudio {
  src: string
  constructor(src: string) {
    this.src = src
  }
  play() {}
  pause() {}
}

// Mock global Audio
global.Audio = MockAudio as any

global.WebSocket = WebSocket
