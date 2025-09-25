"use client";

import React from 'react';
import { SignedIn as ClerkSignedIn, SignedOut as ClerkSignedOut } from '@clerk/nextjs';
import { useAuth, useNostrAuth } from './NostrAuthProvider';

// Custom SignedIn component that checks both Clerk and nostr-login
export function SignedIn({ children }: { children: React.ReactNode }) {
  const isNostrSignedIn = useNostrAuth();

  if (isNostrSignedIn) {
    // If nostr-login is signed in, show children directly
    return <>{children}</>;
  }

  // Otherwise, use Clerk's SignedIn component
  return <ClerkSignedIn>{children}</ClerkSignedIn>;
}

// Custom SignedOut component that checks both Clerk and nostr-login
export function SignedOut({ children }: { children: React.ReactNode }) {
  const isNostrSignedIn = useNostrAuth();

  if (isNostrSignedIn) {
    // If nostr-login is signed in, don't show children
    return null;
  }

  // Otherwise, use Clerk's SignedOut component
  return <ClerkSignedOut>{children}</ClerkSignedOut>;
}

// Custom SignedOut component that checks both Clerk and nostr-login
export function LoadingSignedIn({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth();

  if (isLoaded) {
    // Already finished
    return null;
  }

  // Otherwise, print children
  return <>{children}</>;
}