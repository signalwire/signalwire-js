import { defer, from, shareReplay, takeUntil } from 'rxjs';

import { Destroyable } from './Destroyable';

import type { HTTPRequestController } from '../controllers/HTTPRequestController';
import type { Observable } from 'rxjs';

export abstract class Fetchable<T = unknown> extends Destroyable {
  public fetched$: Observable<boolean>;

  constructor(
    public fromPath: string,
    protected http: HTTPRequestController
  ) {
    super();
    this.fetched$ = defer(() => from(this.fetch())).pipe(
      shareReplay(1),
      takeUntil(this.destroyed$)
    );
  }

  protected abstract populateInstance(data: T): void;

  private async fetch(): Promise<boolean> {
    const response = await this.http.request({
      url: this.fromPath,
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });
    if (response.ok && response.body) {
      const data = JSON.parse(response.body) as T;
      this.populateInstance(data);
      return true;
    }
    return false;
  }
}
