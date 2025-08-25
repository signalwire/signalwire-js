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

// Browser APIs needed by visibility features
if (typeof navigator === 'undefined') {
  global.navigator = {}
}

// Extend navigator with visibility feature requirements
Object.assign(global.navigator, {
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  platform: 'Linux x86_64',
  maxTouchPoints: 0,
  hardwareConcurrency: 4,
  onLine: true,
  languages: ['en-US', 'en'],
  language: 'en-US',
  cookieEnabled: true,
})

// Mock navigator.permissions
Object.defineProperty(navigator, 'permissions', {
  value: {
    query: jest.fn(() => Promise.resolve({ state: 'granted' })),
  },
  configurable: true,
})

// Mock navigator.mediaDevices with extended functionality
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    enumerateDevices: jest.fn().mockResolvedValue([
      {
        deviceId: 'default',
        kind: 'audioinput',
        label: 'Default - Built-in Microphone',
        groupId: 'group1',
      },
      {
        deviceId: 'camera1',
        kind: 'videoinput',
        label: 'Built-in Camera',
        groupId: 'group2',
      },
      {
        deviceId: 'speaker1',
        kind: 'audiooutput',
        label: 'Built-in Speakers',
        groupId: 'group3',
      },
    ]),
    getSupportedConstraints: jest.fn().mockReturnValue({
      deviceId: true,
      facingMode: true,
      frameRate: true,
      height: true,
      width: true,
      audio: true,
      video: true,
    }),
    getUserMedia: jest.fn((constraints) => {
      const tracks = []
      if (constraints.audio) {
        tracks.push(new global.MediaStreamTrack('audio'))
      }
      if (constraints.video) {
        tracks.push(new global.MediaStreamTrack('video'))
      }
      const stream = new global.MediaStream(tracks)
      return Promise.resolve(stream)
    }),
    getDisplayMedia: jest.fn(() => {
      const tracks = [new global.MediaStreamTrack('video')]
      const stream = new global.MediaStream(tracks)
      return Promise.resolve(stream)
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ondevicechange: null,
  },
  configurable: true,
})

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  },
  configurable: true,
})

// Mock document APIs needed by visibility features
Object.defineProperty(global, 'document', {
  value: {
    hidden: false,
    visibilityState: 'visible',
    hasFocus: jest.fn(() => true),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(),
    createElement: jest.fn(() => ({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      remove: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
      })),
      clientWidth: 100,
      clientHeight: 100,
    })),
    getBoundingClientRect: jest.fn(() => ({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
    })),
  },
  configurable: true,
})

// Mock window APIs
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    screen: {
      width: 1920,
      height: 1080,
    },
    location: {
      href: 'http://localhost',
      origin: 'http://localhost',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
    },
    performance: {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
    },
  },
  configurable: true,
})

// Mock URL constructor
Object.defineProperty(global, 'URL', {
  value: class URL {
    constructor(url: string, base?: string) {
      Object.assign(this, new (require('url').URL)(url, base))
    }
  },
  configurable: true,
})

// Mock requestAnimationFrame
Object.defineProperty(global, 'requestAnimationFrame', {
  value: jest.fn((cb) => setTimeout(cb, 16)),
  configurable: true,
})

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: jest.fn((id) => clearTimeout(id)),
  configurable: true,
})
