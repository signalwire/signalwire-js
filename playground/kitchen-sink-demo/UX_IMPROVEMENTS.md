# Kitchen Sink Demo — UX Redesign Plan

## Design System

Replace Tailwind CDN with SignalWire DTCG design tokens. Dark-mode-first.

### Brand Colors (locked)
| Name | Hex | Usage |
|------|-----|-------|
| Blue | `#044EF4` | Buttons, focus rings, primary actions, info status |
| Fuchsia | `#F72A72` | CTAs, accent, emphasis text (light mode), active tabs (light) |
| Turquoise | `#40E0D0` | Emphasis text (dark mode), success indicators, active tabs (dark), quality "healthy" |
| Gold | `#FFD700` | Warnings, caution states |
| Purple | `#601BE6` | Gradients, glow effects |

### Dark Theme (default)
| Token | Value | Use |
|-------|-------|-----|
| `bg-page` | `#0e0e18` | Page background |
| `bg-surface` | `#181a28` | Cards, panels |
| `bg-surface-raised` | `#222436` | Elevated cards, modals |
| `bg-overlay` | `rgba(14,14,24,0.94)` | Modal backdrops |
| `fg-default` | `#f0f0f4` | Primary text |
| `fg-secondary` | `#e8e8ec` | Body text |
| `fg-muted` | `#a0a0aa` | Labels, captions |
| `fg-subtle` | `#73737e` | Placeholder, disabled |
| `border-default` | `rgba(255,255,255,0.12)` | Card borders, dividers |
| `input-bg` | `#2a2a2e` | Input fields |
| `input-border-focus` | `#044EF4` | Focus state |

### Light Theme
| Token | Value | Use |
|-------|-------|-----|
| `bg-page` | `#FAFBFC` | Page background |
| `bg-surface` | `#F3F4F6` | Cards, panels |
| `bg-surface-raised` | `#E8EAF0` | Elevated cards |
| `fg-default` | `#1A1A18` | Primary text |
| `fg-secondary` | `#3A3A38` | Body text |
| `fg-muted` | `#737371` | Labels |
| `fg-headings` | `#070c2d` | Headings (deep navy) |
| `border-default` | `rgba(0,0,0,0.1)` | Card borders |
| `input-bg` | `#ffffff` | Input fields |

### Typography
| Role | Font | Weight |
|------|------|--------|
| Headings | Instrument Sans | 700 |
| Body | Lexend | 400 |
| Code/Stats | JetBrains Mono | 400 |
| Labels | Lexend | 500 |

Google Fonts import:
```
Instrument+Sans:wght@400;500;600;700&family=Lexend:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500
```

### Status Colors
| State | Dark | Light |
|-------|------|-------|
| Success | `#22c55e` | `#16a34a` |
| Warning | `#FFD700` | `#a16207` |
| Error | `#ef4444` | `#dc2626` |
| Info | `#044EF4` | `#044EF4` |

### Interactive Components
- **Buttons primary**: bg `#044EF4`, text white, hover `#0342cf`
- **Buttons destructive**: bg `#dc2626`, text white
- **Buttons ghost**: transparent bg, `fg-secondary` text, hover `rgba(255,255,255,0.06)` (dark)
- **Inputs**: bg `#2a2a2e` (dark) / `#ffffff` (light), border `rgba(255,255,255,0.15)`, focus ring `0 0 0 3px rgba(4,78,244,0.3)`
- **Tabs**: inactive `#a0a0aa`, active `#40E0D0` (dark) / `#F72A72` (light)
- **Badges**: bg `rgb(23,14,23)` (dark) / `#ECECEA` (light), fuchsia/blue/turquoise/gold text variants
- **Toggles**: track off `#333338`, track on `#044EF4`, thumb white

---

## Layout

### Structure
```
+--------------------------------------------------+
| Top Bar: Logo + Theme Toggle + Sign Out           |
+------------+-------------------------------------+
| Sidebar    | Main Content                         |
| (280px)    |                                      |
|            | +------+ +------+                     |
| Connection | |Local | |Remote|  <- Video Grid      |
| Status     | |Video | |Video |                     |
|            | +------+ +------+                     |
| Devices    |                                      |
| - Audio In | [Controls Bar]                        |
| - Audio Out|                                      |
| - Video In | +----------------------------------+  |
|            | | Tabs: Stats | People | Events |  |  |
| Directory  | |       Messages | Dial | Diag   |  |  |
| - Search   | |                                  |  |
| - Contacts | | [Tab Content]                    |  |
|            | +----------------------------------+  |
| Platform   |                                      |
| Caps       |                                      |
+------------+-------------------------------------+
```

### Sidebar (always visible, 280px)
- **Connection status**: dot + "Connected" / "Connecting..."
- **Device pickers**: 3 dropdowns (mic, camera, speaker) with current device label
- **Directory**: Searchable list of addresses, click to dial
- **Platform capabilities**: Compact grid of green/red indicators
- **Remember/Auto-connect checkboxes**: At bottom

### Main Area
- **Video grid**: Local (small PiP) + Remote (fills area), both with black bg rounded corners
- **Quality overlay**: Semi-transparent badge on remote video corner — MOS score + colored dot + quality level. Pulses during recovery. Click to switch to Stats tab.
- **Controls bar**: Mute audio, mute video, screen share, hangup. Centered below video.
- **Tabbed panel**: Below controls, 6 tabs

### Tabbed Panel
| Tab | Content |
|-----|---------|
| **Stats** | MOS score (large), quality level badge, network health dot, recovery state, live stats table (RTT, jitter, packets, loss, bitrate) with color-coded values, active issues list |
| **People** | Participant list with per-participant controls (mute, volume, remove) |
| **Events** | Recovery event log (scrollable, monospace, timestamped) + "Request Keyframe" and "Request ICE Restart" buttons |
| **Messages** | Text messaging (existing) |
| **Dial** | DTMF dialpad (existing) |
| **Diagnostics** | Export button + collapsible JSON, device recovery log |

---

## Toast Notification System

Position: bottom-right, stacked, auto-dismiss 5s.

### Toast Types
| Source | Message | Style |
|--------|---------|-------|
| `client.deviceRecovered$` | "Mic switched to Built-in Microphone" | Info (blue border) |
| `call.recoveryEvent$` action=`reinvite_started` | "Reconnecting..." | Warning (gold border) |
| `call.recoveryEvent$` action=`reinvite_succeeded` | "Connection restored" | Success (turquoise border) |
| `call.recoveryEvent$` action=`max_attempts_reached` | "Connection lost" | Error (fuchsia border) |
| `call.bandwidthConstrained$` true | "Video paused, low bandwidth" | Warning |
| `call.bandwidthConstrained$` false | "Video restored" | Success |

### Toast HTML
```html
<div class="toast toast-info">
  <div class="toast-icon"><!-- SVG --></div>
  <div class="toast-content">
    <p class="toast-title">Device Changed</p>
    <p class="toast-message">Mic switched to Built-in Microphone</p>
  </div>
  <button class="toast-close">&times;</button>
</div>
```

---

## Quality Overlay on Video

Positioned absolute bottom-left of remote video container.

```html
<div class="quality-overlay">
  <span class="quality-dot"></span>  <!-- green/yellow/red -->
  <span class="quality-score">4.2</span>
  <span class="quality-level">Good</span>
</div>
```

- Green: MOS >= 3.5 (excellent/good)
- Yellow: MOS >= 2.0 (fair/poor)
- Red: MOS < 2.0 (critical)
- Pulses when `recoveryState$` is `'recovering'`
- Click opens Stats tab

---

## Color-Coded Stats Table

Each stat cell gets a color class based on value:

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| RTT | < 100ms | 100-300ms | > 300ms |
| Jitter | < 30ms | 30-100ms | > 100ms |
| Packet Loss | < 1% | 1-5% | > 5% |
| Bitrate | > 1Mbps | 500k-1M | < 500k |

Use status token colors: success green, warning gold, error red.

---

## Dark/Light Mode Toggle

- Toggle button in top bar (sun/moon icon)
- Stores preference in localStorage (`ks_theme`)
- Applies `data-theme="dark"` or `data-theme="light"` on `<html>`
- CSS custom properties switch based on `data-theme`
- Default: dark (matches SignalWire brand, better for video)

---

## Auth Modal

Keep existing two-tab (Token / User) design but restyle with brand tokens:
- Dark surface background (`#181a28`)
- Blue primary button
- Fuchsia accent on active tab
- Remember me + auto-connect + auto-dial checkboxes
- Clear saved button

---

## Implementation Approach

### CSS Architecture
Replace Tailwind CDN with a single `style.css` that:
1. Imports Google Fonts (Instrument Sans, Lexend, JetBrains Mono)
2. Defines CSS custom properties from DTCG tokens for both themes
3. Uses `[data-theme="dark"]` / `[data-theme="light"]` selectors
4. Defines component classes (`.card`, `.btn`, `.input`, `.badge`, `.tab`, `.toast`, etc.)
5. Keeps the file under 500 lines — utility classes only where needed

### HTML Structure
- Remove all Tailwind classes
- Use semantic classes (`.sidebar`, `.main-content`, `.video-grid`, `.controls-bar`, `.tab-panel`)
- Keep `<template>` elements for dynamic content
- Add toast container, quality overlay, tab navigation

### TypeScript Changes
- Update all DOM references for new structure
- Add tab switching logic
- Add toast system (create/show/auto-dismiss)
- Add theme toggle logic
- Move device subscriptions to sidebar section
- Existing observable subscriptions stay the same — just target different DOM elements

### File Changes
| File | Change |
|------|--------|
| `index.html` | Full restructure — sidebar layout, tabs, toasts, quality overlay |
| `src/style.css` | Replace Tailwind with DTCG token CSS variables + component classes |
| `src/main.ts` | Update DOM refs, add tab/toast/theme logic, restructure subscriptions |
| `vite.config.ts` | Remove Tailwind CDN (it's in the HTML `<script>` tag, just remove it) |

### What stays the same
- All SDK subscriptions (just retargeted to new DOM elements)
- Auth flow (token / subscriber)
- Call flow (dial / hangup / incoming)
- Device selection logic
- Resilience feature subscriptions
- Remember me / auto-connect / auto-dial
