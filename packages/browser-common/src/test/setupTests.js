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
global.window = dom.window
global.document = dom.window.document
global.navigator = dom.window.navigator
global.HTMLElement = dom.window.HTMLElement
global.HTMLVideoElement = dom.window.HTMLVideoElement
global.HTMLAudioElement = dom.window.HTMLAudioElement
global.HTMLMediaElement = dom.window.HTMLMediaElement

// Enhanced MediaStreamTrack with real event listener functionality
class MockMediaStreamTrack {
  constructor(kind = 'video') {
    this.kind = kind
    this.listeners = {}
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(handler)
  }

  removeEventListener(event, handler) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter((h) => h !== handler)
  }

  // Simulate event trigger for testing purposes
  trigger(event) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((handler) => handler())
    }
  }

  stop = jest.fn()
  clone = jest.fn()
}

global.MediaStreamTrack = MockMediaStreamTrack

// Enhanced MediaStream with proper track management
class MockMediaStream {
  constructor(tracks = []) {
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
  
  addTrack(track) {
    this.tracks.push(track)
  }

  removeTrack = jest.fn()
}

global.MediaStream = MockMediaStream

// Enhanced HTMLMediaElement with ready state support
class MockHTMLMediaElement {
  constructor() {
    this.readyState = MockHTMLMediaElement.HAVE_NOTHING
    this.play = jest.fn()
    this.pause = jest.fn()
    this.load = jest.fn()
  }
}

MockHTMLMediaElement.HAVE_NOTHING = 0
MockHTMLMediaElement.HAVE_METADATA = 1
MockHTMLMediaElement.HAVE_CURRENT_DATA = 2
MockHTMLMediaElement.HAVE_FUTURE_DATA = 3
MockHTMLMediaElement.HAVE_ENOUGH_DATA = 4

global.HTMLMediaElement = MockHTMLMediaElement

// Comprehensive ResizeObserver with proper callback handling
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback
    this.observedElements = new Map()
  }

  observe(target) {
    const entry = {
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

  unobserve(target) {
    this.observedElements.delete(target)
  }

  disconnect() {
    this.observedElements.clear()
  }
}

global.ResizeObserver = MockResizeObserver

// Mock Audio constructor
class MockAudio {
  constructor(src = '') {
    this.src = src
    this.play = jest.fn()
    this.pause = jest.fn()
    this.load = jest.fn()
  }
}

global.Audio = MockAudio

// Mock WebSocket with mock-socket for better testing
global.WebSocket = WebSocket