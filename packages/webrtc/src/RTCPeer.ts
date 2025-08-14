import { EventEmitter, getLogger, uuid } from '@signalwire/core'
import { BaseConnection } from './BaseConnection'
import RTCPeerCore, { RTCPeerDependencies, RTCPeerCallContract } from './RTCPeerCore'

export default class RTCPeer<EventTypes extends EventEmitter.ValidEventTypes> extends RTCPeerCore<EventTypes> {

  constructor(call: BaseConnection<EventTypes>, type: RTCSdpType) {
    // Create dependencies object using @signalwire/core functions
    const dependencies: RTCPeerDependencies = {
      logger: getLogger(),
      uuidGenerator: uuid
    }

    // Pass to parent RTCPeerCore with proper interface adaptation
    super(call as RTCPeerCallContract<EventTypes>, type, dependencies)
  }


}
