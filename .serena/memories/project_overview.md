# SignalWire JS SDK Project Overview

## Purpose
A monorepo containing SignalWire's JavaScript SDKs for building real-time communication applications with WebRTC, video calling, chat, and messaging capabilities.

## Tech Stack
- **Languages**: TypeScript, JavaScript
- **Build Tools**: Custom sw-build system using esbuild/Rollup
- **Testing**: Jest with jsdom environment
- **Package Management**: npm workspaces
- **State Management**: Redux with saga middleware
- **WebRTC**: Custom WebRTC implementation

## Package Structure
- `@signalwire/core`: Shared utilities, Redux store, base classes
- `@signalwire/client`: Browser SDK for Call Fabric API
- `@signalwire/webrtc`: WebRTC utilities and helpers

## Key Commands
- `npm run build`: Build all packages
- `npm test`: Run all tests
- `npm run clean`: Clean all build artifacts
- `npm run changeset`: Create changeset for releases