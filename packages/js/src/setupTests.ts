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
}

// Mock MediaStream globally
global.MediaStream = MockMediaStream as any

class MockHTMLMediaElement {
  static HAVE_NOTHING = 0
  readyState: number = MockHTMLMediaElement.HAVE_NOTHING
}

// Mock global HTMLMediaElement
;(global as any).HTMLMediaElement = MockHTMLMediaElement

global.WebSocket = WebSocket
