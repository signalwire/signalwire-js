import { Participant, SelfParticipant, type ExecuteMethod } from '../core/entities/Participant';

import type { DeviceController } from '../interfaces/DeviceController';
import type { VertoManager } from '../interfaces/VertoManager';

/**
 * Factory for creating Participant instances with proper dependency injection
 * Eliminates circular dependency between Call and Participant
 */
export class ParticipantFactory {
  constructor(
    private executeMethod: ExecuteMethod,
    private vertoManager: VertoManager,
    private deviceController: DeviceController
  ) {}

  /**
   * Create a self participant (the local user in the call)
   */
  public createSelfParticipant(id: string): SelfParticipant {
    return new SelfParticipant(id, this.executeMethod, this.vertoManager, this.deviceController);
  }

  /**
   * Create a remote participant
   */
  public createParticipant(id: string): Participant {
    return new Participant(id, this.executeMethod, this.deviceController);
  }
}
