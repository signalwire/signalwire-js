/**
 * Consolidated test setup for SignalWire browser packages
 * 
 * This file is executed before running tests and sets up the testing environment
 * with comprehensive browser API mocks and utilities.
 */

// Set up polyfills before any imports
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Set up essential polyfills
global.structuredClone = global.structuredClone || ((val) => JSON.parse(JSON.stringify(val)))

// Import dependencies after polyfills are set up
const { JSDOM } = require('jsdom')
const { WebSocket } = require('mock-socket')

// Set up JSDOM environment for browser APIs
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
})

// Mock global browser APIs
global.window = dom.window as any
global.document = dom.window.document
global.navigator = dom.window.navigator
global.HTMLElement = dom.window.HTMLElement
global.HTMLVideoElement = dom.window.HTMLVideoElement
global.HTMLAudioElement = dom.window.HTMLAudioElement
global.HTMLMediaElement = dom.window.HTMLMediaElement

// Enhanced MediaStreamTrack with real event listener functionality
class MockMediaStreamTrack {
  kind: string
  private listeners: { [key: string]: Array<() => void> } = {}

  constructor(kind: string = 'video') {
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

  stop = jest.fn()
  clone = jest.fn()
}

global.MediaStreamTrack = MockMediaStreamTrack as any

// Enhanced MediaStream with proper track management
class MockMediaStream {
  private tracks: MediaStreamTrack[]
  
  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = tracks
  }
  
  getTracks() {
    return this.tracks
  }
  
  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video')
  }
  
  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio')
  }
  
  addTrack(track: MediaStreamTrack) {
    this.tracks.push(track)
  }

  removeTrack = jest.fn()
}

global.MediaStream = MockMediaStream as any

// Enhanced HTMLMediaElement with ready state support
class MockHTMLMediaElement {
  static HAVE_NOTHING = 0
  static HAVE_METADATA = 1
  static HAVE_CURRENT_DATA = 2
  static HAVE_FUTURE_DATA = 3
  static HAVE_ENOUGH_DATA = 4
  
  readyState: number = MockHTMLMediaElement.HAVE_NOTHING
  
  play = jest.fn()
  pause = jest.fn()
  load = jest.fn()
}

global.HTMLMediaElement = MockHTMLMediaElement as any

// Comprehensive ResizeObserver with proper callback handling
class MockResizeObserver {
  private callback: ResizeObserverCallback
  private observedElements = new Map<
    Element,
    ResizeObserverEntry
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
      borderBoxSize: [
        { inlineSize: target.clientWidth, blockSize: target.clientHeight },
      ],
      devicePixelContentBoxSize: [
        { inlineSize: target.clientWidth, blockSize: target.clientHeight },
      ],
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

global.ResizeObserver = MockResizeObserver as any

// Mock Audio constructor
class MockAudio {
  src: string
  
  constructor(src: string = '') {
    this.src = src
  }
  
  play = jest.fn()
  pause = jest.fn()
  load = jest.fn()
}

global.Audio = MockAudio as any

// Mock WebSocket with mock-socket for better testing
global.WebSocket = WebSocket