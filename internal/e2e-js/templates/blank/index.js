console.log('Loading SDKs...')

import * as VideoSDK from '@signalwire/js'
import * as FabricSDK from '@signalwire/browser-js'

console.log('VideoSDK loaded:', VideoSDK)
console.log('FabricSDK loaded:', FabricSDK)

// Expose Video SDK (backward compatibility)
window._SWJS = VideoSDK

// Expose Fabric SDK
window._SWBROWSERJS = FabricSDK

console.log('SDKs exposed on window')
