import type { Task } from './Task'

export interface TaskClientDocs extends Task {
  new (opts: {
    /** SignalWire project id, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
    project: string
    /** SignalWire project token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9` */
    token: string
    /** SignalWire contexts, e.g. 'home', 'office'... */
    contexts: string[]
  }): this

  /** @ignore */
  subscribe(): Promise<void>
}
