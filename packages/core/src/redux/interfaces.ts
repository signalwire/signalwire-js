interface SWComponent {
  id: string
}

export interface WebRTCCall extends SWComponent {
  state?: string
  remoteSDP?: string
}

export interface Message extends SWComponent {
  state?: string
}

export type ReduxComponent = WebRTCCall | Message

export interface ComponentState {
  [key: string]: ReduxComponent
}

export interface SDKState {
  components: ComponentState
}
