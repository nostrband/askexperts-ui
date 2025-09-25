"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { UserButton } from "@clerk/nextjs";
import { useAuth } from "./NostrAuthProvider";
import { Nostr } from "askexperts/experts";
import { globalPool } from "../../utils/nostr";
import Dialog from "../ui/Dialog";
import { useRouter } from "next/navigation";

interface ProfileInfo {
  pubkey: string;

  /** Profile data (kind:0 event content) */
  profile?: any;

  /** Nostr event */
  event?: Event;
}

// Profile cache
const profileCache = new Map<string, ProfileInfo>();
let currentCachedPubkey: string | null = null;

export default function CustomUserButton({
  showName = false,
}: {
  showName?: boolean;
}) {
  const { isNostrAuth, isClerkAuth, nostrPubkey, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const nostrRef = useRef<Nostr | null>(null);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setShowLogoutDialog(false);
    }
  };

  // Track mounted state for portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Nostr instance
  useEffect(() => {
    if (isNostrAuth && !nostrRef.current) {
      nostrRef.current = new Nostr(globalPool);
    }
  }, [isNostrAuth]);

  // Fetch profile when pubkey changes
  useEffect(() => {
    if (!isNostrAuth || !nostrPubkey || !nostrRef.current) {
      setProfile(null);
      return;
    }

    // Clear cache if pubkey changed
    if (currentCachedPubkey && currentCachedPubkey !== nostrPubkey) {
      profileCache.clear();
    }
    currentCachedPubkey = nostrPubkey;

    // Check cache first
    const cached = profileCache.get(nostrPubkey);
    if (cached) {
      setProfile(cached);
      return;
    }

    // Fetch profile
    const fetchProfile = async () => {
      if (!nostrRef.current || !nostrPubkey) return;

      setLoading(true);
      try {
        const profileData = (await nostrRef.current.fetchProfile(
          nostrPubkey
        )) as ProfileInfo;
        if (profileData) {
          // Cache the profile
          profileCache.set(nostrPubkey, profileData);
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Failed to fetch Nostr profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isNostrAuth, nostrPubkey]);

  // Cleanup Nostr instance on unmount
  useEffect(() => {
    return () => {
      if (nostrRef.current) {
        // Note: SimplePool doesn't have a dispose method, but we can null the reference
        nostrRef.current = null;
      }
    };
  }, []);

  // For Clerk auth, use the original UserButton
  if (isClerkAuth) {
    return (
      <div className="px-2 py-2">
        <UserButton showName={showName} />
      </div>
    );
  }

  // For Nostr auth, show custom user button
  if (isNostrAuth) {
    const displayName =
      profile?.profile?.name || profile?.profile?.display_name;
    const name = displayName || nostrPubkey!.substring(0, 10);
    const picture = profile?.profile?.picture;

    return (
      <>
        <div
          className="px-4 py-2 flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setShowLogoutDialog(true)}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {picture ? (
              <img
                src={picture}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            ) : (
              <span className="text-sm font-medium text-gray-600">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name (if showName is true) */}
          {showName && (
            <span className="text-sm font-medium text-gray-700">
              {loading ? "Loading..." : name}
            </span>
          )}
        </div>

        {/* Logout Dialog - render using portal to avoid positioning issues */}
        {mounted && showLogoutDialog && createPortal(
          <Dialog
            isOpen={showLogoutDialog}
            onClose={() => setShowLogoutDialog(false)}
            title="Logout"
            footer={
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowLogoutDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            }
          >
            <p className="text-gray-600">Are you sure you want to logout?</p>
          </Dialog>,
          document.body
        )}
      </>
    );
  }

  // Fallback - should not happen
  return null;
}
