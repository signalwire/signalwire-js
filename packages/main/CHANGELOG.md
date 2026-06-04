# @signalwire/js

## 4.0.0

### Major Changes

- 947e300: Complete API rewrite. Active migration required from any previous version.

  This release replaces the prior `@signalwire/js` and introduce `@signalwire/web-components` packages with a redesigned, reactive (RxJS-based) SDK and a new web-components layer (`sw-*` SDK-aware components and `sw-ui-*` UI primitives). Public types, constructors, and event surfaces have changed across the board — drop-in upgrades from v1.x, v2.x, or v3.x are not supported.

  Refer to the migration guides for the upgrade path appropriate to your starting version.

### Patch Changes

- 0089ca6: fix: developer `CredentialProvider.refresh()` not invoked for plain SATs (#19074)

  When a developer-supplied `CredentialProvider` was paired with a SAT that lacked
  the `sat:refresh` scope (the default for tokens minted via
  `POST /api/fabric/subscribers/tokens` without explicit scope/fingerprint), the
  SDK cancelled the developer's refresh timer before discovering that the Client
  Bound SAT path could not take over. Sessions silently terminated at the initial
  SAT expiry.

  The orchestrator now only disarms the developer refresh timer after
  `DeviceTokenManager.activate()` confirms it accepted ownership. The reconnect
  path (`onBeforeReconnect`) also re-arms the developer timer against the new
  credential's expiry so reconnections honor the precedence rules. A transient
  failure of the `/devices/token` exchange now declines ownership rather than
  seeding the reactive pipeline with an unbound token.

  **New observable:** `SignalWire.warnings$` emits non-fatal `SDKWarning` events
  on a separate channel from `errors$`. The two warnings emitted today are:
  - `credential_refresh_fallback` — Client Bound SAT activation declined; the
    developer-provided `refresh()` will continue to drive refresh.
  - `credential_no_refresh_handler` — credential has `expiry_at` but no
    `refresh()` handler and the SAT lacks `sat:refresh` scope; the session will
    end at expiry unless a refresh mechanism is supplied.

  Subscribe to `warnings$` to detect bound-SAT downgrades and other liveness
  events that were previously silent. The `errors$` channel is unaffected.

  **Migration:** none required. The fix aligns implementation with the documented
  `CredentialProvider` contract. Existing consumers of `errors$` see no change.
  Applications that want telemetry on refresh-path transitions should subscribe
  to the new `warnings$` observable.

## 4.0.0

### Major Changes

- 1fefd3f: Signalwire Browser SDK v4 - Breaking Changes
