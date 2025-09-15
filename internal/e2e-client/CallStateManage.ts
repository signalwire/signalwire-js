export class CallStateManager {
  public history: any[] = []

  constructor() {}

  update(event: string, payload: any) {

    let safePayload = {}

    try {
      safePayload = JSON.parse(JSON.stringify(payload))
    } catch { }
    
    const timestamp = Date.now()

    let newState

    if (!event.startsWith('member')) {
      newState = {
        ...this.getState(),
        ...safePayload,
      }
    } else {
      newState = {
        ...this.getState(),
      }
      const memberIndex = newState.room_session.members.findIndex(
        (m: any) => m.member_id == payload.member.member_id
      )
      if (memberIndex >= 0) {
        newState.room_session.members[memberIndex] = {
          ...newState.room_session.members[memberIndex],
          ...payload.member,
        }
      }
    }

    const entry = { event, payload, timestamp, state: newState }

    // Add to history
    this.history.push(entry)
  }

  getState() {
    return this.history.length
      ? { ...this.history[this.history.length - 1].state }
      : null
  }

  getSelfState() {
    const state = this.getState()
    return state?.room_session?.members.find(
      (m: any) => m.member_id == state.member_id
    )
  }

  logHistory() {
    console.log('Call State History:', JSON.stringify(this.history, null, 2))
  }
}
