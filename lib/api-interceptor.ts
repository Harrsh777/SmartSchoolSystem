/**
 * API Interceptor for Session Management
 * 
 * Intercepts fetch calls to:
 * 1. Reset session timer on successful API responses (2xx)
 * 2. Handle 401 (Unauthorized) responses by logging out
 * 3. Track API activity as user activity
 */

import { updateActivity } from '@/hooks/useSessionTimeout';

// Store original fetch
let originalFetch: typeof globalThis.fetch | null = null;

// Track if interceptor is set up
let isInterceptorSetup = false;

// Logout handler (will be set by the layout components)
let logoutHandler: (() => void) | null = null;

// Track last user interaction timestamp (for detecting user-initiated API calls)
let lastUserInteraction: number = 0;
const USER_INTERACTION_WINDOW_MS = 2000; // 2 seconds window

/**
 * Mark that user interaction occurred (called by event listeners)
 */
export function markUserInteraction(): void {
  lastUserInteraction = Date.now();
}

/**
 * Check if an API call is likely user-initiated
 * Returns true if there was user interaction within the last 2 seconds
 */
function checkIfUserInitiated(): boolean {
  const now = Date.now();
  return (now - lastUserInteraction) <= USER_INTERACTION_WINDOW_MS;
}

/**
 * Set the logout handler to be called on 401 responses
 */
export function setLogoutHandler(handler: () => void): void {
  logoutHandler = handler;
}

/**
 * Intercept fetch calls to handle session management
 */
export function setupApiInterceptor(): void {
  if (typeof window === 'undefined') return;

  // Store original fetch on first call
  if (!originalFetch) {
    originalFetch = globalThis.fetch;
  }

  // Only intercept if not already intercepted
  if (!isInterceptorSetup && originalFetch) {
    globalThis.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      // Check if this is a user-initiated request
      // We detect this by checking if there was recent user interaction
      // (click/keydown events set a flag that expires after 2 seconds)
      const isUserInitiated = checkIfUserInitiated();
      
      // Call original fetch
      const response = await originalFetch!(input, init);

      // Check response status
      if (response.status >= 200 && response.status < 300) {
        // Only reset timer for user-initiated API calls
        // This prevents background/polling requests from resetting the timer
        if (isUserInitiated) {
          updateActivity();
        }
      } else if (response.status === 401) {
        // Unauthorized - session expired on server
        if (logoutHandler) {
          logoutHandler();
        }
      }

      return response;
    };
    
    isInterceptorSetup = true;
  }
}

/**
 * Remove API interceptor (cleanup)
 */
export function removeApiInterceptor(): void {
  if (typeof window !== 'undefined' && isInterceptorSetup && originalFetch) {
    globalThis.fetch = originalFetch;
    isInterceptorSetup = false;
    // Don't reset originalFetch or logoutHandler - they may be needed again
  }
}
