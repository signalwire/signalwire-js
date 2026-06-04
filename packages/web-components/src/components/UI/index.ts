// pure layout components, no signalwire logic or contexts used here.

// layout components
export { SwUiCallLayout } from './layout/sw-ui-call-layout';
export { SwUiBackground } from './layout/sw-ui-background';
export { SwUiModal } from './layout/sw-ui-modal';
export { SwUiResponsiveContainer } from './layout/sw-ui-responsive-container';

//alert component
export { SwUiAlert, showPrompt } from './sw-ui-alert';

//controls components
export { SwUiDropup } from './controls/sw-ui-dropup';
export { SwUiSplitButton } from './controls/sw-ui-split-button';
export { SwUiControlBar } from './controls/sw-ui-control-bar';
export { SwUiIcon } from './icons';
export type { IconName } from './icons';

//other components
export { SwUiDialpad } from './controls/sw-ui-dialpad';

export { SwUiContentDrawer } from './layout/sw-ui-content-drawer';
export type { DisplayContentPayload, ContentFormat } from './layout/sw-ui-content-drawer';

export { SwUiTranscriptView } from './sw-ui-transcript-view';
export type { TranscriptEntry, TranscriptEntryMeta } from './sw-ui-transcript-view';
export type { PromptType } from './sw-ui-alert';
export type {
  MicToggleDetail,
  CameraToggleDetail,
  SpeakerToggleDetail,
  DeviceChangeDetail,
  FullscreenToggleDetail,
  ScreenShareToggleDetail,
  HandRaiseToggleDetail,
} from './controls/sw-ui-control-bar';
