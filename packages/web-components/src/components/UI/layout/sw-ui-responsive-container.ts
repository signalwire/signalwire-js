import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

/**
 * Resizes itself to an appropriate modal size based on viewport size
 * @slot items to hold inside responsive modal
 */
@customElement('sw-ui-responsive-container')
export class SwUiResponsiveContainer extends LitElement {
  static styles = css`
    .container {
      margin: 0 auto;

      /* Default: small monitors */
      width: 90vw;

      /* Maintain 16:9 baseline */
      aspect-ratio: 16 / 9;

      /* Height cap: (16/9 height) + 300px */
      max-height: calc((100vw * 9 / 16) + 300px);

      /* Prevent overflow issues */
      overflow: hidden;
    }

    /* 1. Larger monitors (MacBook Air 13" and up ~1280px+) */
    @media (min-width: 1280px) {
      .container {
        width: 80vw;

        /* Adjust cap relative to actual width */
        max-height: calc((80vw * 9 / 16) + 300px);
      }
    }

    /* 3. Mobile devices (portrait) */
    @media (max-width: 600px) {
      .container {
        width: calc(100vw - 40px);

        aspect-ratio: auto; /* let it flow naturally */
        max-height: none;
        height: 85svh;
      }
    }

    /* 4. Edge cases: very small but not mobile (e.g., 500x400, landscape phones) */
    @media (max-height: 500px) and (min-width: 600px) {
      .container {
        width: 90vw;

        /* Cap height more aggressively */
        max-height: 90vh;

        /* Drop strict aspect ratio if needed */
        aspect-ratio: auto;
      }
    }

    /* Optional: landscape phones treated like small monitors */
    @media (max-width: 900px) and (orientation: landscape) {
      .container {
        width: 90vw;
        max-height: 90vh;
      }
    }
  `;

  render() {
    return html`<div class="container"><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-responsive-container': SwUiResponsiveContainer;
  }
}
