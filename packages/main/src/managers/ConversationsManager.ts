import { map, tap, type Observable } from 'rxjs';

import { EntityCollection, Fetcher } from '../behaviors/Collection';
import { POST_PARAMS } from '../controllers/HTTPRequestController';
import { ConversationError } from '../core/errors';
import { isConversationMessageMetadata } from '../core/RPCMessages/guards/events.guards';
import { filterAs } from '../operators/filterEventAs';
import { isString } from '../utils/isString';
import { getLogger } from '../utils/logger';

import type { ClientSessionManager } from './ClientSessionManager';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';
import type {
  GetConversationMessageResponse,
  GetConversationResponse
} from '../core/types/conversation.types';
import type { ConversationsProvider } from '../interfaces/Conversations';

const logger = getLogger();

const toAddressId = (groupId: string): string => {
  const [, toAddressId] = groupId.split('_');
  return toAddressId;
};

class ConversationMessagesFetcher extends Fetcher<GetConversationMessageResponse> {
  constructor(
    public readonly groupId: string,
    http: HTTPRequestController
  ) {
    super(`/api/fabric/conversations/${groupId}/messages`, 'page_size=100', http);
  }
}

class ConversationsFetcher extends Fetcher<GetConversationResponse> {
  filter = (item: unknown): item is GetConversationResponse =>
    !!(item as GetConversationResponse).from_fabric_address_id;
  mapper = (item: unknown) => ({
    ...(item as GetConversationResponse),
    id: (item as GetConversationResponse).group_id,

    address_id: toAddressId((item as GetConversationResponse).group_id)
  });
  constructor(http: HTTPRequestController) {
    super(`/api/fabric/conversations`, 'page_size=100', http);
  }
}

export class ConversationMessageCollection extends EntityCollection<GetConversationMessageResponse> {
  constructor(
    groupId: string,
    update$: Observable<Partial<GetConversationMessageResponse>>,
    http: HTTPRequestController,
    onError?: (error: Error) => void
  ) {
    super(new ConversationMessagesFetcher(groupId, http), update$, onError);
  }
}

export class ConversationCollection extends EntityCollection<GetConversationResponse> {
  constructor(
    update$: Observable<Partial<GetConversationResponse>>,
    http: HTTPRequestController,
    onError?: (error: Error) => void
  ) {
    super(new ConversationsFetcher(http), update$, onError);
  }
}

export class ConversationsManager implements ConversationsProvider {
  private groupIds = new Map<string, string>();

  constructor(
    private clientSession: ClientSessionManager,
    private http: HTTPRequestController,
    private getUserAddressId: () => string,
    private readonly onError?: (error: Error) => void
  ) {}
  private async join(addressId: string): Promise<string> {
    const userFromAddressId = this.getUserAddressId();

    try {
      const response = await this.http.request({
        ...POST_PARAMS,
        url: `/api/fabric/conversations/join`,
        body: JSON.stringify({
          from_fabric_address_id: userFromAddressId,
          fabric_address_ids: [addressId, userFromAddressId]
        })
      });

      if (response.ok && !!response.body) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data = JSON.parse(response.body);
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */

        if (isString(data.group_id)) {
          this.groupIds.set(addressId, data.group_id as string);
          return data.group_id as string;
        }
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      }
      throw new ConversationError('Join Failed - Unexpected response');
    } catch (error) {
      logger.error('[ConversationsManager] Failed to join conversation:', error);
      throw error;
    }
  }

  public async getConversationMessageCollection(
    addressId: string
  ): Promise<ConversationMessageCollection> {
    const groupId = this.groupIds.get(addressId) ?? (await this.join(addressId));

    return Promise.resolve(
      new ConversationMessageCollection(
        groupId,
        this.clientSession.signalingEvent$.pipe(
          filterAs(isConversationMessageMetadata, 'params'),
          tap((event) => logger.debug('[ConversationsManager ] Conversation Event:', event)),
          // FIXME after Conversation API Fixes
          map(
            (params) =>
              ({
                ...params
              }) as Partial<GetConversationMessageResponse>
          )
        ),
        this.http,
        this.onError
      )
    );
  }

  public async sendText(text: string, destinationAddressId: string): Promise<void> {
    const groupId =
      this.groupIds.get(destinationAddressId) ?? (await this.join(destinationAddressId));
    const userFromAddressId = this.getUserAddressId();

    try {
      const response = await this.http.request({
        ...POST_PARAMS,
        url: '/api/fabric/messages',
        body: JSON.stringify({
          group_id: groupId,
          from_fabric_address_id: userFromAddressId,
          text
        })
      });
      if (response.ok) {
        return;
      }
      throw new ConversationError('Send Text Failed - Unexpected response');
    } catch (error) {
      logger.error('[ConversationsManager] Failed to send text message:', error);
      throw error;
    }
  }
}
