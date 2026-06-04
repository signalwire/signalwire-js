import { css } from 'lit';

export const deviceSelectorStyles = css`
  :host {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    position: relative;

    /* ctrl primitive defaults (overridden by parent theme) */
    --sw-device-selector-size: 44px;
    --sw-device-selector-radius: 50%;
    --sw-device-selector-bg: rgba(255, 255, 255, 0.12);
    --sw-device-selector-bg-hover: rgba(255, 255, 255, 0.22);
    --sw-device-selector-fg: #ffffff;
    --sw-device-selector-focus-ring: #044cf6;
    --sw-device-selector-label-color: rgba(255, 255, 255, 0.55);
    --sw-device-selector-label-size: 10px;
    --sw-device-selector-menu-bg: #1e1e2e;
    --sw-device-selector-menu-border: rgba(255, 255, 255, 0.14);
    --sw-device-selector-menu-item-hover: rgba(255, 255, 255, 0.1);
    --sw-device-selector-menu-item-active: rgba(4, 76, 246, 0.35);
    --sw-device-selector-menu-radius: 10px;
    --sw-device-selector-menu-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  /* ── trigger button ─────────────────────────────────────────────── */

  .trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--sw-device-selector-size);
    height: var(--sw-device-selector-size);
    min-width: 36px;
    min-height: 36px;
    padding: 0;
    background: var(--sw-device-selector-bg);
    color: var(--sw-device-selector-fg);
    border: none;
    border-radius: var(--sw-device-selector-radius);
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .trigger:hover:not(:disabled) {
    background: var(--sw-device-selector-bg-hover);
  }

  .trigger[aria-expanded='true'] {
    background: var(--sw-device-selector-bg-hover);
  }

  .trigger:active:not(:disabled) {
    transform: scale(0.93);
  }

  .trigger:focus-visible {
    outline: 2px solid var(--sw-device-selector-focus-ring);
    outline-offset: 2px;
  }

  .trigger:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }

  .trigger sw-ui-icon {
    flex-shrink: 0;
    pointer-events: none;
  }

  .label {
    font-size: var(--sw-device-selector-label-size);
    color: var(--sw-device-selector-label-color);
    white-space: nowrap;
    user-select: none;
    line-height: 1.2;
  }

  /* ── popover panel ──────────────────────────────────────────────── */

  .panel {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 240px;
    max-width: 320px;
    background: var(--sw-device-selector-menu-bg);
    border: 1px solid var(--sw-device-selector-menu-border);
    border-radius: var(--sw-device-selector-menu-radius);
    box-shadow: var(--sw-device-selector-menu-shadow);
    padding: 6px;
    z-index: 9999;
    animation: panel-in 0.1s ease-out;
  }

  @keyframes panel-in {
    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  /* ── sections ───────────────────────────────────────────────────── */

  .section {
    padding: 4px 0;
  }

  .section + .section {
    border-top: 1px solid var(--sw-device-selector-menu-border);
    margin-top: 4px;
    padding-top: 8px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--sw-device-selector-label-color);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    user-select: none;
  }

  .section-header sw-ui-icon {
    flex-shrink: 0;
  }

  /* ── device items ───────────────────────────────────────────────── */

  .device-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: calc(var(--sw-device-selector-menu-radius) - 2px);
    cursor: pointer;
    font-size: 13px;
    color: var(--sw-device-selector-fg);
    transition: background 0.1s ease;
  }

  .device-item:hover {
    background: var(--sw-device-selector-menu-item-hover);
  }

  .device-item.selected {
    background: var(--sw-device-selector-menu-item-active);
  }

  .check {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    opacity: 0;
  }

  .device-item.selected .check {
    opacity: 1;
  }

  .device-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .no-devices {
    padding: 6px 10px;
    font-size: 12px;
    color: var(--sw-device-selector-label-color);
  }

  /* ── previews (show-preview mode) ───────────────────────────────── */

  :host([show-preview]) .panel {
    min-width: 280px;
  }

  .preview {
    margin: 8px 4px 2px;
  }

  .preview-camera sw-local-camera {
    display: block;
    width: 100%;
    border-radius: 6px;
    overflow: hidden;
  }

  .preview-mic {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 6px;
    min-height: 28px;
  }

  .preview-empty {
    padding: 8px 4px;
    font-size: 12px;
    color: var(--sw-device-selector-label-color);
    text-align: center;
  }

  .test-speaker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: var(--sw-device-selector-menu-item-hover);
    color: var(--sw-device-selector-fg);
    border: 1px solid var(--sw-device-selector-menu-border);
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .test-speaker:hover:not(:disabled) {
    background: var(--sw-device-selector-menu-item-active);
  }

  .test-speaker:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
