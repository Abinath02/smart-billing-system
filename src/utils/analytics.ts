/**
 * Lightweight, privacy-first analytics tracker for Spice Garden Smart Billing.
 * Tracks operational portal events, table QR orders, and staff actions.
 */

export interface AnalyticsEvent {
  name: string;
  timestamp: string;
  path: string;
  properties?: Record<string, any>;
}

const STORAGE_KEY = 'spice_garden_analytics_events';
const MAX_STORED_EVENTS = 100;

export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
): void => {
  if (typeof window === 'undefined') return;

  try {
    const currentPath = window.location.pathname;
    const event: AnalyticsEvent = {
      name: eventName,
      timestamp: new Date().toISOString(),
      path: currentPath,
      properties,
    };

    // Store in localStorage for audit and dashboard summary
    const existingStr = localStorage.getItem(STORAGE_KEY);
    const events: AnalyticsEvent[] = existingStr ? JSON.parse(existingStr) : [];
    events.unshift(event);

    if (events.length > MAX_STORED_EVENTS) {
      events.length = MAX_STORED_EVENTS;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

    // Optional: Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics Event] ${eventName}:`, properties || {});
    }
  } catch (err) {
    // Analytics failure should never crash the user experience
    console.warn('Analytics tracking notice:', err);
  }
};

export const trackPageView = (path: string): void => {
  trackEvent('page_view', { path, title: typeof document !== 'undefined' ? document.title : '' });
};

export const getStoredEvents = (): AnalyticsEvent[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const clearAnalytics = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};
