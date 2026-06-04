# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

This is the **Kitchen Sink Demo** - a comprehensive test application for the `@signalwire/js` SDK. It demonstrates all SDK features including outbound/inbound calls, media controls, participant management, text messaging, DTMF dialpad, quality metrics, and directory services. Built with vanilla TypeScript and Vite.

## Commands

```bash
# Development (auto-generates SAT token from scripts/issue-sat.js)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server runs at http://localhost:5173/

## Architecture

### Single-File Application

The entire demo lives in `src/main.ts` (~1500 lines) with DOM templates in `index.html`. This is intentional - it serves as sample code for SDK users and keeps all feature demonstrations in one place.

### Key Components

1. **SignalWire Initialization** - Authenticates using SAT token injected via Vite's `define` config
2. **Device Management** - Subscribes to `audioInputDevices$`, `audioOutputDevices$`, `videoInputDevices$`
3. **Directory Service** - Paginated address loading via `client.directory.addresses$` and `loadMore()`
4. **Call Management** - `client.dial()` for outbound, `client.session.incomingCalls$` for inbound
5. **Self Participant Controls** - Audio/video toggles, device selection, volume controls, audio processing
6. **Quality Metrics** - Real-time `call.quality` observables for video, audio, and network stats

### Observable Subscription Pattern

All SDK observables are subscribed to directly and update DOM elements:

```typescript
call.status$.subscribe((status) => {
  DOM.callStatus.textContent = status.toUpperCase();
});
```

### DOM Reference Pattern

DOM elements are cached in a `DOM` const object at the top of `main.ts`:

```typescript
const DOM = {
  statusElement: document.querySelector<HTMLSpanElement>('#status')!
  // ... all other elements
} as const;
```

### HTML Templates

Uses `<template>` elements for participant cards, device items, and address cards:

```typescript
const template = DOM.participantTemplate.content.cloneNode(true) as DocumentFragment;
```

## Testing This Demo

The demo is used for manual SDK testing:

1. Call to `/public/test-room` or select "Test Room" from directory
2. Test all self-participant controls (mute, video, deaf, hand raise)
3. Test volume sliders and audio processing toggles
4. Test dialpad DTMF functionality
5. Test incoming call accept/reject modal
6. Verify quality metrics update in real-time

## Code Quality Notes

This is sample code - console.log statements are acceptable here. Focus on:

- Demonstrating SDK features clearly
- Adding comments for SDK learning
- Keeping interactions simple and testable
