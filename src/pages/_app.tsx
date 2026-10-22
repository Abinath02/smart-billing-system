import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { trackPageView } from '../utils/analytics';
import { captureException } from '../utils/errorTracker';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // 1. Initial Page View tracking
    trackPageView(router.asPath);

    // 2. Route change tracking
    const handleRouteChange = (url: string) => {
      trackPageView(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    // 3. Global Unhandled Errors & Rejections Listener
    const handleGlobalError = (event: ErrorEvent) => {
      captureException(event.error || event.message, { source: 'window.onerror' });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      captureException(event.reason || 'Unhandled Promise Rejection', { source: 'window.onunhandledrejection' });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [router]);

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
