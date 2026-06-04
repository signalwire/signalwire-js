import type { ReactiveControllerHost } from 'lit';

/**
 * Host type accepted by `@lit/context`'s `ContextProvider`. The library types
 * its host as `Partial<ReactiveControllerHost> & HTMLElement`, so any
 * controller that wraps a `ContextProvider` should require the same to avoid
 * `as any` casts at the call site.
 */
export type ContextHost = ReactiveControllerHost & HTMLElement;
