"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { DBRemoteClient } from "askexperts/db";
import { API_BASE_URL, APP_DOMAIN } from "../../utils/const";
import type { WindowNostr } from "nostr-tools/nip07";
import { createAuthToken, parseAuthToken } from "askexperts/common";

// Types for nostr-login events
export interface NostrLoginEvent extends CustomEvent {
  detail: {
    type: "login" | "signup" | "logout";
  };
}

// Auth context type
interface AuthContextType {
  // Unified auth methods
  getToken?: () => Promise<string | null>;
  signOut: () => Promise<void>;

  // Auth status
  isLoaded: boolean;
  isSignedIn: boolean;
  // userId: string | null;

  // Auth method identification
  isNostrAuth: boolean;
  isClerkAuth: boolean;

  // Nostr user pubkey
  nostrPubkey?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface NostrToken {
  token: string;
  pubkey: string;
  expiration: number;
}

function parseAppNostrToken(token: string) {
  return parseAuthToken(`https://${APP_DOMAIN}`, {
    cookies: {},
    method: "GET",
    originalUrl: document.location.pathname + document.location.search,
    headers: {
      authorization: token,
    },
  });
}

function parseNostrToken(token: string): NostrToken | undefined {
  if (!token) return undefined;
  try {
    const info = parseAppNostrToken(token);
    if (info.pubkey) {
      const now = Math.floor(Date.now() / 1000);
      if (!info.expiration) throw new Error("Nostr token without expiration");
      if (info.expiration < now) throw new Error("Nostr token expired");
      return { pubkey: info.pubkey, token, expiration: info.expiration };
    }
  } catch (e) {
    console.error("nostr token parse error", e);
  }
  return undefined;
}

// Parse saved session info
let _session: NostrToken | undefined;
function getSessionNostrToken(): NostrToken | undefined {
  if (_session) return _session;
  try {
    const token = globalThis.localStorage?.getItem("nostr_token");
    if (token) {
      _session = parseNostrToken(token);
      return _session;
    }
  } catch (e) {
    console.error("nostr token error", e);
    globalThis.localStorage?.removeItem("nostr_token");
  }
  return undefined;
}

function setSessionNostrToken(token: string): NostrToken | undefined {
  _session = parseNostrToken(token);
  try {
    globalThis.localStorage?.setItem("nostr_token", token);
  } catch {}
  return _session;
}

async function getNostrToken(pubkey: string) {
  try {
    let session = getSessionNostrToken();

    // Need to update token?
    const now = Math.floor(Date.now() / 1000);
    if (!session || session.pubkey !== pubkey || session.expiration < now) {
      const signer = (window as any).nostr as WindowNostr;
      const token = await createAuthToken({
        signer,
        domain: APP_DOMAIN,
      });
      session = setSessionNostrToken(token);
      console.log("new session token", session);
    }

    return session?.token || "";
  } catch (e) {
    console.log("Failed to get nostr token", e);
    return "";
  }
}

// Provider component
export function NostrAuthProvider({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();

  const session = getSessionNostrToken();
  const [isNostrSignedIn, setIsNostrSignedIn] = useState(!!session?.pubkey);
  const [isNostrLoaded, setIsNostrLoaded] = useState(!!session?.pubkey);
  const [nostrPubkey, setNostrPubkey] = useState(session?.pubkey || "");

  const nostrSignOut = useCallback(
    async (noDispatch?: boolean) => {
      setSessionNostrToken("");
      setIsNostrSignedIn(false);
      setNostrPubkey("");
      if (!noDispatch) document.dispatchEvent(new Event("nlLogout"));
    },
    [setIsNostrSignedIn, setNostrPubkey]
  );

  useEffect(() => {
    const onSignedIn = async () => {
      try {
        const signer = (window as any).nostr as WindowNostr;
        const pubkey = await signer.getPublicKey();

        // Need to signup?
        if (pubkey !== nostrPubkey) {
          // Create a temporary DBRemoteClient to call signup
          const tempClient = new DBRemoteClient({
            url: API_BASE_URL,
            token: () => getNostrToken(pubkey),
          });

          // Call signup to register the user
          await tempClient.signup();

          // Dispose of the temporary client
          tempClient[Symbol.dispose]();

          // Ensure token
          await getNostrToken(pubkey);
        }

        // Set pubkey to state
        setNostrPubkey(pubkey);

        // Only set authentication state after successful signup
        setIsNostrSignedIn(true);
      } catch (error) {
        console.error("Error during nostr signup:", error);
        // Don't set authentication state if signup failed
      }
    };

    // Listen for nostr-login auth events
    const handleNostrAuth = async (e: Event) => {
      const event = e as NostrLoginEvent;
      if (event.detail.type === "login" || event.detail.type === "signup") {
        await onSignedIn();
      } else if (event.detail.type === "logout") {
        nostrSignOut(true);
      }
    };

    const handleNostrReady = () => {
      setIsNostrLoaded(true);
    };

    document.addEventListener("nlAuth", handleNostrAuth);
    document.addEventListener("nlReady", handleNostrReady);

    return () => {
      document.removeEventListener("nlAuth", handleNostrAuth);
      document.removeEventListener("nlReady", handleNostrReady);
    };
  }, []);

  // Create unified auth object
  const authValue: AuthContextType = {
    getToken: async () => {
      if (isNostrSignedIn) return await getNostrToken(nostrPubkey);
      else return `Bearer ${await clerkAuth.getToken()}`;
    },

    isLoaded: clerkAuth.isLoaded || isNostrLoaded,
    isSignedIn: isNostrSignedIn || (clerkAuth.isSignedIn ?? false),
    isNostrAuth: isNostrSignedIn,
    isClerkAuth: !isNostrSignedIn && (clerkAuth.isSignedIn ?? false),
    nostrPubkey,

    // Include other useful properties from Clerk auth
    // userId: clerkAuth.userId ?? null,
    signOut: isNostrSignedIn ? nostrSignOut : clerkAuth.signOut,
  };

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a NostrAuthProvider");
  }
  return context;
}

// Hook to get just the nostr auth state (for components that only need this)
export function useNostrAuth(): boolean {
  const { isNostrAuth } = useAuth();
  return isNostrAuth;
}
