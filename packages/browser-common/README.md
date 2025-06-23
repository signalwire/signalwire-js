# @signalwire/browser-common

The SignalWire Browser Common package contains shared browser components and utilities used by both the Video SDK (`@signalwire/js`) and the Call Fabric SDK (`@signalwire/browser-js`).

**Important**: This package is intended for internal use by the SignalWire browser SDKs. You should not use it directly in your production projects, as the APIs can and will change often. Usage of this package directly is currently not supported.

## Overview

This package provides common browser-specific functionality including:

- **Base Session Management**: Core session components for WebRTC connections
- **Client Infrastructure**: WebSocket and JWT session management
- **Room Components**: Device management and screen sharing capabilities
- **Media Utilities**: Video element building and overlay management
- **Browser Utilities**: Storage abstractions and media element helpers
- **Testing Utilities**: Shared test setup and utilities

## Related

- [Get Started](https://developer.signalwire.com/)
- [`@signalwire/js`](https://www.npmjs.com/package/@signalwire/js) - Video SDK for browser environments
- [`@signalwire/browser-js`](https://www.npmjs.com/package/@signalwire/browser-js) - Call Fabric SDK for browser environments
- [`@signalwire/core`](https://www.npmjs.com/package/@signalwire/core) - Core utilities shared across all SignalWire SDKs

## License

`@signalwire/browser-common` is copyright © 2018-2025 [SignalWire](http://signalwire.com). It is free software, and may be redistributed under the terms specified in the [MIT-LICENSE](https://github.com/signalwire/signalwire-js/blob/master/LICENSE) file.