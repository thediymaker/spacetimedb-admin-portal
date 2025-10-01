/**
 * Application configuration
 * Centralizes environment variable access with validation
 */

interface SpacetimeConfig {
  uri: string;
  module: string;
  httpApi: string;
  moduleVersion?: string;
  maxRetries: number;
  retryBackoff: number;
  cacheTtlMinutes: number;
  maxLiveRows: number;
}

interface AppConfig {
  name: string;
  spacetime: SpacetimeConfig;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return parsed;
}

export const config: AppConfig = {
  name: getEnvVar('NEXT_PUBLIC_APP_NAME', 'SpacetimeDB Admin Portal'),
  spacetime: {
    uri: getEnvVar('NEXT_PUBLIC_SPACETIME_URI'),
    module: getEnvVar('NEXT_PUBLIC_SPACETIME_MODULE'),
    httpApi: getEnvVar('NEXT_PUBLIC_SPACETIME_HTTP_API'),
    moduleVersion: process.env.NEXT_PUBLIC_SPACETIME_MODULE_VERSION,
    maxRetries: getEnvNumber('NEXT_PUBLIC_SPACETIME_MAX_RETRIES', 3),
    retryBackoff: getEnvNumber('NEXT_PUBLIC_SPACETIME_RETRY_BACKOFF', 2),
    cacheTtlMinutes: getEnvNumber('NEXT_PUBLIC_CACHE_TTL_MINUTES', 10),
    maxLiveRows: getEnvNumber('NEXT_PUBLIC_MAX_LIVE_ROWS', 10000),
  },
};
