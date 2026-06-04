# @signalwire/web-components

## 4.0.0

### Major Changes

- 947e300: Complete API rewrite. Active migration required from any previous version.

  This release replaces the prior `@signalwire/js` and introduce `@signalwire/web-components` packages with a redesigned, reactive (RxJS-based) SDK and a new web-components layer (`sw-*` SDK-aware components and `sw-ui-*` UI primitives). Public types, constructors, and event surfaces have changed across the board — drop-in upgrades from v1.x, v2.x, or v3.x are not supported.

  Refer to the migration guides for the upgrade path appropriate to your starting version.

### Patch Changes

- Updated dependencies [0089ca6]
- Updated dependencies [947e300]
  - @signalwire/js@4.0.0

## Unreleased

### Added

- `sw-ui-*` UI primitives layer under `src/components/UI/`: `sw-ui-icon`,
  `sw-ui-dropup`, `sw-ui-split-button`, `sw-ui-control-bar`, `sw-ui-dialpad`,
  `sw-ui-call-layout`, `sw-ui-background`, `sw-ui-modal`,
  `sw-ui-content-drawer`, `sw-ui-responsive-container`, `sw-ui-alert`,
  `sw-ui-transcript-view`. Each has a corresponding package subpath export.
- `theme.css` design tokens (`--fg-*`, `--bg-*`, `--interactive-*`, `--sp-*`,
  `--radius-*`, `--type-*`).
- `EmbedTokenCredentialProvider` re-export from `./embed`.
- New runtime deps: `marked`, `dompurify`, `prismjs` (used by
  `sw-ui-transcript-view`).

### Changed (BREAKING)

- `directory` component re-themed onto the new design tokens. The legacy
  `--sw-color-*` / `--sw-space-*` / `--sw-font-*` overrides on
  `<sw-directory>` no longer take effect; migrate to the tokens in
  `theme.css`.
- The component's hard-coded `data-theme="dark"` / `prefers-color-scheme`
  rules were removed. Dark theming now comes from `theme.css`.

### Removed (BREAKING)

- `<sw-dialpad>` element and its `DialpadComponent` export. Use
  `<sw-ui-dialpad>` / `SwUiDialpad` instead.
- `sw-example-button` component and `./example-button` subpath export.

## 1.0.0

### Patch Changes

- Updated dependencies [1fefd3f]
  - @signalwire/js@4.0.0
