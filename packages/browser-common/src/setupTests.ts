/**
 * Test setup for @signalwire/browser-common package
 * 
 * This file is executed before running tests and can be used to configure
 * the testing environment, set up mocks, or add global test utilities.
 */

import { TextEncoder, TextDecoder } from 'util'

// Set up TextEncoder/TextDecoder for Node.js environment BEFORE importing JSDOM
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

import { JSDOM } from 'jsdom'

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

// Mock MediaStreamTrack for buildVideoElement tests
global.MediaStreamTrack = class MockMediaStreamTrack {
  constructor(public kind: string = 'video') {}
  addEventListener = jest.fn()
  removeEventListener = jest.fn()
  stop = jest.fn()
  clone = jest.fn()
} as any

// Mock MediaStream 
global.MediaStream = class MockMediaStream {
  private tracks: any[] = []
  
  constructor(tracks: any[] = []) {
    this.tracks = tracks
  }
  
  getTracks = jest.fn(() => this.tracks)
  getVideoTracks = jest.fn(() => this.tracks.filter(t => t.kind === 'video'))
  getAudioTracks = jest.fn(() => this.tracks.filter(t => t.kind === 'audio'))
  addTrack = jest.fn((track: any) => this.tracks.push(track))
} as any

// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
  constructor(_callback: any) {}
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
} as any