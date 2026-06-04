import { css } from 'lit';

/**
 * Defensive reset for inheritable CSS properties that cross the shadow
 * boundary. Host pages frequently set these on `body` or layout wrappers
 * (`text-align: center`, `text-transform: uppercase`, etc.) and they would
 * otherwise inherit into our shadow trees and distort component rendering.
 *
 * Properties intentionally NOT reset: `color`, `font-family`, `font-size`.
 * Those are how design tokens flow into components — consumers legitimately
 * theme by inheriting these from an ancestor.
 *
 * Slotted content is unaffected: slotted nodes inherit from their flat-tree
 * parent (the host's tree), not from `:host`, which is the desired behavior
 * for user-provided slot content.
 */
export const hostReset = css`
  :host {
    text-align: start;
    letter-spacing: normal;
    word-spacing: normal;
    text-transform: none;
    text-indent: 0;
    line-height: normal;
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
    white-space: normal;
    text-shadow: none;
  }
`;
