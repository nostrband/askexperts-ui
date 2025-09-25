"use client";

// Utility to add nostr auth header to requests when nostr-login is active
let isNostrAuthActive = false;

// Listen for nostr-login events to track auth state
if (typeof window !== 'undefined') {
  document.addEventListener('nlAuth', (e: any) => {
    if (e.detail.type === 'login' || e.detail.type === 'signup') {
      isNostrAuthActive = true;
    } else if (e.detail.type === 'logout') {
      isNostrAuthActive = false;
    }
  });

  // Check initial state
  if ((window as any).nostr) {
    isNostrAuthActive = true;
  }
}

// Function to get headers with nostr auth indicator
export function getNostrAuthHeaders(): Record<string, string> {
  if (isNostrAuthActive) {
    return {
      'x-nostr-auth': 'true'
    };
  }
  return {};
}

// Function to check if nostr auth is active
export function isNostrAuthenticated(): boolean {
  return isNostrAuthActive;
}