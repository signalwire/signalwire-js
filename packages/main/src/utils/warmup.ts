import { take } from 'rxjs';

import type { Observable } from 'rxjs';

export const warmup = (observable: Observable<unknown>): void => {
  observable.pipe(take(1)).subscribe();
};
