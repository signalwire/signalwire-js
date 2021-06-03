# Video SDK

### Packages

| Project                | Description               | README                                   | CHANGELOG                                      |
| ---------------------- | ------------------------- | ---------------------------------------- | ---------------------------------------------- |
| **@signalwire/core**   | TBD                       | [`README.md`](packages/node/README.md)   | [`CHANGELOG.md`](packages/node/CHANGELOG.md)   |
| **@signalwire/web**    | SignalWire in the browser | [`README.md`](packages/web/README.md)    | [`CHANGELOG.md`](packages/web/CHANGELOG.md)    |
| **@signalwire/node**   | SignalWire in Node.js     | [`README.md`](packages/node/README.md)   | [`CHANGELOG.md`](packages/node/CHANGELOG.md)   |
| **@signalwire/webrtc** | SignalWire WebRTC         | [`README.md`](packages/webrtc/README.md) | [`CHANGELOG.md`](packages/webrtc/CHANGELOG.md) |

Refer to the README of each package for further details.

### Development Setup

#### Requirements

- npm 7+ ([more info](https://docs.npmjs.com/cli/v7/using-npm/workspaces))
- Node.js 14+

#### Local Environment Setup

From the root folder run:

1. `npm i`
2. `npm run build`

#### Development Workflow

The normal flow should look to something like this:

1. Make a change in one of the existing (or new) packages
2. Run `npm run changeset`. This will ask you a set of questions about the changes you've made.
3. Create a `Pull Request` on GitHub.
