# @signalwire/web-components

## 4.0.0

### Minor Changes

- 0de3f81: `startScreenShare()` can now request the shared surface's audio, and whether a share
  carries audio no longer depends on which microphone is selected.

  Sharing a tab or window never offered to bring its audio along. The method took no
  arguments, so `getDisplayMedia` was always asked for video alone and Chrome never showed
  the "Also share tab audio" checkbox in its picker — there was no way for an application
  to ask for it. Screen shares of a video call, a browser game, or a music tab arrived
  silent, and the only workaround was for the sharer to unmute their microphone and point
  it at their own speakers.
  - **`startScreenShare()` accepts `ScreenShareOptions`.** Pass `{ audio: true }` to request
    the surface's audio; the default is `false`, so existing callers are unaffected. The
    type is exported for applications that build their own options object.

    Whether audio actually arrives is the browser's and the user's decision, not the SDK's.
    Chrome offers the checkbox for tabs and windows, other browsers and platforms differ,
    and a user who shares a surface without ticking it yields a video-only stream. Treat the
    option as a request, and don't promise the remote side will hear anything.

  - **`<sw-call-controls>` and `<sw-call-widget>` gained a `screen-share-audio` attribute**
    that turns the request on for their built-in screen-share button. It is off by default,
    matching the SDK.

  **Screen-share audio is no longer wired to the microphone.** Internally the display
  capture asked for audio based on the selected _microphone's_ constraints, so two unrelated
  capabilities shared one flag. Nothing could reach it while the method took no arguments —
  the internal default short-circuited the microphone lookup — but adding the parameter
  would have made it live, in two directions at once. `startScreenShare({})` would have
  requested display audio nobody asked for, because an empty object skips a parameter
  default and the selected microphone's constraints are truthy; meanwhile an application
  that had explicitly disabled audio input would have found `{ audio: true }` silently
  ignored, since a disabled microphone resolved to "no audio" for the share as well. The
  display capture now reads the caller's explicit intent, so muting, switching, or disabling
  the microphone has no bearing on what a screen share carries.

  This pairs with the track-provenance fix released earlier: a display-capture audio track
  is no longer mistaken for a microphone the SDK may stop and re-acquire, so a surface's
  audio survives a server-pushed media-params update instead of being destroyed by it.
  Requesting tab audio is only safe to offer because that guard is already in place.

- cc41782: Enforce the single-screen-share contract: `startScreenShare()` now rejects while a
  share is already active, instead of silently orphaning the live one.

  A call carries at most one screen share — `startScreenShare()` returns `void`, so the
  only handle to a share is the id the SDK keeps internally. That id was overwritten
  unconditionally on every `startScreenShare()`, before the new leg had even connected, so
  a second call while a share was live left the first one **capturing and sending with no
  way to stop it**: `screenShareStatus` read `'none'`, the UI offered "Share screen", and
  `stopScreenShare()` was a no-op. Other participants kept seeing the shared screen and
  the browser's own sharing indicator stayed up. The only way out was hanging up.

  This is easy to hit by accident: the toggle in every consumer tested `screenShareStatus
=== 'started'`, which is false during `'starting'` — so a double-click on the share
  button, while the picker or the aux leg was still settling, took the _start_ branch twice.
  - **`startScreenShare()` rejects with `ScreenShareAlreadyActiveError`** when the call is
    already sharing, and the live share is left untouched. This is a **behaviour change**:
    the second call used to resolve. Call `stopScreenShare()` first to replace a share.
    The new error class is exported for `instanceof` checks and carries the active
    `screenShareId`.
  - **A failed screen-share attempt no longer leaves state behind.** The failed leg is
    deregistered and the screen-share id cleared, so a dismissed picker doesn't wedge
    screen share for the rest of the call, and a later `stopScreenShare()` can't `verto.bye`
    a destroyed leg — a signaling error the call classified as fatal and tore itself down
    over.
  - **`'starting'`/`'stopping'` are busy states.** `sw-call-controls` now follows
    `screenShareStatus$` (previously it rendered the status it happened to mount with, so
    the button could stay permanently wrong) and disables the control while a start or stop
    is in flight. `sw-ui-control-bar` gained a `screenShareBusy` property and
    `sw-ui-split-button` a `disabled` property.
  - **`stopScreenShare()` is safe to call twice.** A second call while a stop was already in
    flight fell through the "no active screen share" warning and sent a **second `verto.bye`
    for the same leg** — the id outlives the awaited bye. It now returns.

  Apps driving screen share themselves should read `screenShareStatus` before toggling and
  treat `'starting'`/`'stopping'` as busy rather than testing only for `'started'`.

  **Type change:** `Call.self$` is now `Observable<CallSelfParticipant>` instead of
  `Observable<CallSelfParticipant | null>`. The implementation has always filtered `null`
  out, so this is a documentation fix with no runtime change — but the declared type was the
  only thing consumers could program against, and it made every `self$` subscriber write a
  null branch that could never run. `Call.self` (the scalar) stays nullable: it really is
  `null` before the call is joined, whereas `self$` withholds the emission instead.

  Reading `call.self$` is unaffected — existing null checks still compile, they are just
  redundant now. This only breaks code that **supplies** a `Call`, such as a test double
  declaring `self$: Observable<CallSelfParticipant | null>`, since that is no longer
  assignable. `WebRTCCall` now declares `implements Call`, so the contract and the
  implementation cannot drift apart again.

### Patch Changes

- Updated dependencies [2204a51]
- Updated dependencies [5aebd1b]
- Updated dependencies [94b1a8f]
- Updated dependencies [d84e31c]
- Updated dependencies [55ee75b]
- Updated dependencies [59af226]
- Updated dependencies [27a9ecf]
- Updated dependencies [c2f619c]
- Updated dependencies [0996cbe]
- Updated dependencies [e0953c1]
- Updated dependencies [6adad85]
- Updated dependencies [065afa0]
- Updated dependencies [48c6356]
- Updated dependencies [0de3f81]
- Updated dependencies [cc41782]
- Updated dependencies [27a9ecf]
  - @signalwire/js@4.0.0

## 4.0.0

### Major Changes

This release replaces the prior `@signalwire/js` and introduce `@signalwire/web-components` packages with a redesigned, reactive (RxJS-based) SDK and a new web-components layer (`sw-*` SDK-aware components and `sw-ui-*` UI primitives). Public types, constructors, and event surfaces have changed across the board — drop-in upgrades from v1.x, v2.x, or v3.x are not supported.

Refer to the migration guides for the upgrade path appropriate to your starting version.
