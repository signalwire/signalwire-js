import backspace from './backspace.svg?raw';
import download from './download.svg?raw';
import copy from './copy.svg?raw';
import cameraOff from './camera-off.svg?raw';
import cameraOn from './camera-on.svg?raw';
import checkCircle from './check-circle.svg?raw';
import chevronUp from './chevron-up.svg?raw';
import close from './close.svg?raw';
import fullscreenExit from './fullscreen-exit.svg?raw';
import fullscreen from './fullscreen.svg?raw';
import handRaise from './hand-raise.svg?raw';
import infoCircle from './info-circle.svg?raw';
import micOff from './mic-off.svg?raw';
import micOn from './mic-on.svg?raw';
import phoneCall from './phone-call.svg?raw';
import person from './person.svg?raw';
import phoneEnd from './phone-end.svg?raw';
import room from './room.svg?raw';
import screenShare from './screen-share.svg?raw';
import screenShareOff from './screen-share-off.svg?raw';
import sendIcon from './sendIcon.svg?raw';
import settings from './settings.svg?raw';
import speakerOff from './speaker-off.svg?raw';
import speakerOn from './speaker-on.svg?raw';
import spinner from './spinner.svg?raw';
import swLogo from './sw-logo.svg?raw';
import transcript from './transcript.svg?raw';

export const ICONS = {
  backspace,
  download,
  copy,
  'camera-off': cameraOff,
  'camera-on': cameraOn,
  'check-circle': checkCircle,
  'chevron-up': chevronUp,
  close,
  'fullscreen-exit': fullscreenExit,
  fullscreen,
  'hand-raise': handRaise,
  'info-circle': infoCircle,
  'mic-off': micOff,
  'mic-on': micOn,
  person,
  'phone-call': phoneCall,
  'phone-end': phoneEnd,
  room,
  'screen-share': screenShare,
  'screen-share-off': screenShareOff,
  'send-icon': sendIcon,
  settings,
  'speaker-off': speakerOff,
  'speaker-on': speakerOn,
  spinner,
  'sw-logo': swLogo,
  transcript
} as const;

export type IconName = keyof typeof ICONS;
