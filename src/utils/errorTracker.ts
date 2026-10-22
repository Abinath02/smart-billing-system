/**
 * Global Error Tracking Service for Spice Garden Smart Billing POS.
 * Captures uncaught exceptions, promise rejections, and component crashes.
 */

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  path: string;
  userAgent?: string;
  context?: Record<string, any>;
}

const ERROR_STORAGE_KEY = 'spice_garden_error_logs';
const MAX_ERRORS = 50;

export const captureException = (
  error: Error | string | any,
  context?: Record<string, any>
): void => {
  const errorMessage =
    typeof error === 'string'
      ? error
      : error?.message || 'Unknown runtime error occurred.';
  const errorStack = error?.stack || undefined;

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : 'server';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'server';

  const log: ErrorLog = {
    id: `ERR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
    path: currentPath,
    userAgent,
    context,
  };

  console.error('[ErrorTracker Captured]:', log);

  if (typeof window !== 'undefined') {
    try {
      const existing = localStorage.getItem(ERROR_STORAGE_KEY);
      const logs: ErrorLog[] = existing ? JSON.parse(existing) : [];
      logs.unshift(log);

      if (logs.length > MAX_ERRORS) {
        logs.length = MAX_ERRORS;
      }

      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(logs));
    } catch (storageErr) {
      console.warn('Could not persist error log:', storageErr);
    }
  }
};

export const getStoredErrors = (): ErrorLog[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ERROR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearErrorLogs = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ERROR_STORAGE_KEY);
};
