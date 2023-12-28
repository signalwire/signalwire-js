export const roomStartedEvents: Record<string, Record<string, string>>[] = [
  { 'call.state': { call_state: 'created' } }, //From Server Event
  { 'call.state.created': {} },
  { 'room.started': {} }, // SDK Public Event
]

export const callAnsweredEvents: Record<string, Record<string, string>>[] = [
  { 'call.state': { call_state: 'answered' } }, //From Server Event
  { 'call.state.answered': {} },
]

export const ttsPlayingEvents: Record<string, Record<string, string>>[] = [
  { 'call.play': { state: 'playing' } }, //From Server Event
  { 'call.play.playing': {} },
]

export const ttsFinishedEvents: Record<string, Record<string, string>>[] = [
  { 'call.play': { state: 'finished' } }, //From Server Event
  { 'call.play.finished': {} },
]

export const callEndingEvents: Record<string, Record<string, string>>[] = [
  { 'call.state': { call_state: 'ending' } }, //From Server Event
  { 'call.state.ending': {} },
  // { 'room.ending': {} },
]

export const roomEndedEvents: Record<string, Record<string, string>>[] = [
  { 'call.state': { call_state: 'ended' } }, //From Server Event
  { 'call.state.ended': {} },
  { 'room.ended': {} }, // SDK Public Event
]
