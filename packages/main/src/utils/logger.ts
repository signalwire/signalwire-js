import log from 'loglevel';

// =============================================================================
// Public Interfaces
// =============================================================================

/** Log level names supported by the SDK. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Logger interface that consumers can implement to replace the built-in logger.
 * All methods accept variadic arguments matching the browser console API.
 */
export interface SDKLogger {
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  trace(...args: unknown[]): void;
}

/** Options for WebSocket traffic logging. */
export interface WsTrafficOptions {
  type: 'send' | 'recv' | 'http';
  /** Parsed object or raw string — will be JSON.stringify'd for display if an object. */
  payload: unknown;
}

/**
 * Options for WebSocket traffic logging using raw strings.
 * The string is only parsed when logging is enabled, avoiding
 * unnecessary JSON.parse on every message.
 */
export interface WsTrafficRawOptions {
  type: 'send' | 'recv';
  raw: string;
}

/** Debug options that control verbose SDK logging. */
export interface DebugOptions {
  /** Log all WebSocket send/recv traffic to the console. */
  logWsTraffic?: boolean;
}

/** Extended logger with SDK-internal helpers (wsTraffic). */
export interface InternalSDKLogger extends SDKLogger {
  wsTraffic: (options: WsTrafficOptions | WsTrafficRawOptions) => void;
}

// =============================================================================
// Default Logger (loglevel)
// =============================================================================

const datetime = () => new Date().toISOString();
const defaultLogger = log.getLogger('signalwire');

const originalFactory = defaultLogger.methodFactory;
defaultLogger.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);

  return function (...args: unknown[]) {
    const prefixed = [datetime(), '-', ...args];
    // eslint-disable-next-line prefer-spread
    rawMethod.apply(undefined, prefixed);
  };
};

// Default to WARN in production; consumers opt in to verbose logging
const defaultLoggerLevel = defaultLogger.levels.WARN;
defaultLogger.setLevel(defaultLoggerLevel);

// =============================================================================
// Logger State
// =============================================================================

let userLogger: SDKLogger | null = null;

/** Replace the built-in logger with a custom implementation. Pass `null` to restore defaults. */
const setLogger = (logger: SDKLogger | null): void => {
  userLogger = logger;
};

let debugOptions: DebugOptions = {};

/** Configure debug options (e.g., `{ logWsTraffic: true }`). */
const setDebugOptions = (options: DebugOptions | null): void => {
  if (options == null) {
    debugOptions = {};
    return;
  }
  debugOptions = { ...debugOptions, ...options };
};

/**
 * Set the log level for the built-in logger.
 * Has no effect when a custom logger is set via `setLogger()`.
 */
const setLogLevel = (level: LogLevel): void => {
  defaultLogger.setLevel(level);
};

// =============================================================================
// Logger Instance
// =============================================================================

const getLoggerInstance = (): SDKLogger => {
  // loglevel's Logger matches SDKLogger (error, warn, info, debug, trace)
  return userLogger ?? (defaultLogger as SDKLogger);
};

const shouldStringify = (payload: unknown): boolean => {
  if (payload != null && typeof payload === 'object' && 'method' in payload) {
    return (payload as Record<string, unknown>).method !== 'signalwire.ping';
  }
  return true;
};

const wsTraffic: InternalSDKLogger['wsTraffic'] = (options) => {
  const { logWsTraffic } = debugOptions;

  if (!logWsTraffic) {
    return;
  }

  const loggerInstance = getLoggerInstance();

  // Support raw string payloads — parse only when logging is enabled
  let payload: unknown;
  if ('raw' in options) {
    try {
      payload = JSON.parse(options.raw);
    } catch {
      loggerInstance.debug(`[WebSocket] ${options.type.toUpperCase()}: non-JSON message`);
      return;
    }
  } else {
    ({ payload } = options);
  }

  const msg = shouldStringify(payload) ? JSON.stringify(payload, null, 2) : payload;
  loggerInstance.debug(`${options.type.toUpperCase()}: \n`, msg, '\n');
};

const getLogger = (): InternalSDKLogger => {
  const logger = getLoggerInstance();

  return new Proxy(logger, {
    get(_target, prop: string | symbol, _receiver) {
      if (prop === 'wsTraffic') {
        return wsTraffic;
      }
      // Always resolve from the current logger instance so that
      // setLogger() takes effect for all existing references.
      const instance = getLoggerInstance();
      const value: unknown = Reflect.get(instance, prop);
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(instance);
      }
      return value;
    }
  }) as InternalSDKLogger;
};

export { setLogger, getLogger, setDebugOptions, setLogLevel };
