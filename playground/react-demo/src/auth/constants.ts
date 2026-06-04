// Session storage keys (prefixed to avoid conflicts with other demos)
export const TOKEN_STORAGE_KEY = 'react_demo_auth_token';
export const METHOD_STORAGE_KEY = 'react_demo_auth_method';

// Default token expiry (1 hour)
export const TOKEN_EXPIRY_MS = 3 * 60 * 1000;

// Auth method identifiers
export const AUTH_METHODS = {
  USER: 'user',
  BUILD_TIME: 'build-time'
} as const;

export type AuthMethod = (typeof AUTH_METHODS)[keyof typeof AUTH_METHODS];
