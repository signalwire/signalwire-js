type eventExpectation = Record<string, Record<string, string>>

export const roomStartedEvents: eventExpectation[] = [
  { 'call.state.created': {} },
  { 'room.started': {} }, // SDK Public Event
]
if (!!process.env.DEBUG_EVENTS)
  roomStartedEvents.push({ 'call.state': { call_state: 'created' } })

export const callAnsweredEvents: eventExpectation[] = [
  { 'call.state.answered': {} },
]
if (!!process.env.DEBUG_EVENTS)
  callAnsweredEvents.push({ 'call.state': { call_state: 'answered' } })

export const ttsPlayingEvents: eventExpectation[] = [
  { 'call.play.playing': {} },
]
if (!!process.env.DEBUG_EVENTS)
  ttsPlayingEvents.push({ 'call.play': { state: 'playing' } })

export const ttsFinishedEvents: eventExpectation[] = [
  { 'call.play.finished': {} },
]
if (!!process.env.DEBUG_EVENTS)
  ttsFinishedEvents.push({ 'call.play': { state: 'finished' } })

export const callEndingEvents: eventExpectation[] = [
  { 'call.state.ending': {} },
  // { 'room.ending': {} },
]
if (!!process.env.DEBUG_EVENTS)
  callEndingEvents.push({ 'call.state': { call_state: 'ending' } })

export const roomEndedEvents: eventExpectation[] = [
  { 'call.state.ended': {} },
  { 'room.ended': {} }, // SDK Public Event
]
if (!!process.env.DEBUG_EVENTS)
  roomEndedEvents.push({ 'call.state': { call_state: 'ended' } })
