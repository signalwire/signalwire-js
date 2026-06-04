/**
 * Represents an on/off capability state
 * Both `on` and `off` can be true if the parent permission grants both
 */
export interface OnOffCapability {
  readonly on: boolean;
  readonly off: boolean;
}

/**
 * Member-level capabilities for self or other members
 */
export interface MemberCapabilities {
  readonly muteAudio: OnOffCapability;
  readonly muteVideo: OnOffCapability;
  readonly deaf: OnOffCapability;
  readonly raisehand: OnOffCapability;
  readonly microphoneVolume: boolean;
  readonly microphoneSensitivity: boolean;
  readonly speakerVolume: boolean;
  readonly position: boolean;
  readonly meta: boolean;
  readonly remove: boolean;
  readonly audioFlags: boolean;
}

/**
 * Call-level capabilities state
 */
export interface CallCapabilitiesState {
  readonly self: MemberCapabilities;
  readonly member: MemberCapabilities;
  readonly end: boolean;
  readonly setLayout: boolean;
  readonly sendDigit: boolean;
  readonly vmutedHide: OnOffCapability;
  readonly lock: OnOffCapability;
  readonly device: boolean;
  readonly screenshare: boolean;
}

/**
 * Default on/off state with no permissions
 */
export const DEFAULT_ON_OFF: OnOffCapability = {
  on: false,
  off: false
};

/**
 * Default member capabilities with no permissions
 */
export const DEFAULT_MEMBER_CAPABILITIES: MemberCapabilities = {
  muteAudio: DEFAULT_ON_OFF,
  muteVideo: DEFAULT_ON_OFF,
  deaf: DEFAULT_ON_OFF,
  raisehand: DEFAULT_ON_OFF,
  microphoneVolume: false,
  microphoneSensitivity: false,
  speakerVolume: false,
  position: false,
  meta: false,
  remove: false,
  audioFlags: false
};

/**
 * Default call capabilities with no permissions
 */
export const DEFAULT_CALL_CAPABILITIES: CallCapabilitiesState = {
  self: DEFAULT_MEMBER_CAPABILITIES,
  member: DEFAULT_MEMBER_CAPABILITIES,
  end: false,
  setLayout: false,
  sendDigit: false,
  vmutedHide: DEFAULT_ON_OFF,
  lock: DEFAULT_ON_OFF,
  device: false,
  screenshare: false
};
