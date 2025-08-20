// Import specific exports to ensure they're available during ESM resolution
import { SignalWire, buildVideoElement } from '@signalwire/client'
// Import the entire module namespace
import * as ClientModule from '@signalwire/client'

// Ensure all exports are available on window._SWJS
// Explicitly include SignalWire and buildVideoElement to handle ESM re-export issues
window._SWJS = {
  ...ClientModule,
  SignalWire, // Explicitly ensure SignalWire is available
  buildVideoElement, // Explicitly ensure buildVideoElement is available
}
