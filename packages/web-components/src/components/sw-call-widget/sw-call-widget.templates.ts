import { css, html, nothing, type TemplateResult } from 'lit';
import type { DisplayContentPayload } from '../UI/layout/sw-ui-content-drawer.js';
import type { TranscriptEntry } from '../../context/transcript-context.js';

export const widgetStyles = css`
  :host {
    display: block;
    height: 100%;
    font-family: var(--type-family-body);

    --sw-control-bar-bg: #000;
    --sw-control-bar-padding: 6px 12px;
    --sw-control-bar-gap: 6px;
    --sw-control-bar-radius: 0;
    --sw-split-button-width: 56px;
    --sw-split-button-height: 36px;
  }

  .call-view-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
`;

export interface CallViewOpts {
  transcription: boolean;
  hasLayoutLayers: boolean;
  drawer: DisplayContentPayload | null;
  transcriptEntries: TranscriptEntry[];
  onHangUp: () => void;
  onFullscreenToggle: () => void;
  onTranscriptToggle: () => void;
  onDrawerClose: () => void;
}

export function renderCallView(opts: CallViewOpts): TemplateResult {
  return html`
    <div class="call-view-wrapper">
      <sw-ui-call-layout
        ?transcript=${opts.transcription}
        shadow
        style="--sw-call-layout-radius: 10px;"
      >
        <slot name="background" slot="background"></slot>

        <sw-call-media slot="video"></sw-call-media>

        ${!opts.hasLayoutLayers
          ? html`<sw-local-camera slot="floating-video" mirror></sw-local-camera>`
          : nothing}

        <sw-call-controls
          slot="controls"
          show-screen-share
          show-hand-raise
          show-transcript
          .transcriptActive=${opts.transcription}
          @sw-call-hangup=${opts.onHangUp}
          @sw-fullscreen-toggle=${opts.onFullscreenToggle}
          @sw-transcript-toggle=${opts.onTranscriptToggle}
        ></sw-call-controls>

        <sw-ui-transcript-view
          slot="transcript"
          .entries=${opts.transcriptEntries}
        ></sw-ui-transcript-view>
      </sw-ui-call-layout>

      <sw-ui-content-drawer
        ?open=${opts.drawer !== null}
        .title=${opts.drawer?.title ?? ''}
        .content=${opts.drawer?.content ?? ''}
        .format=${opts.drawer?.format ?? 'text'}
        .language=${opts.drawer?.language ?? ''}
        @sw-content-drawer-close=${opts.onDrawerClose}
      ></sw-ui-content-drawer>
    </div>
  `;
}

export function renderConnecting(): TemplateResult {
  return html`
    <div class="call-view-wrapper">
      <sw-ui-call-layout loading shadow style="--sw-call-layout-radius: 10px;">
        <slot name="background" slot="background"></slot>
      </sw-ui-call-layout>
    </div>
  `;
}
