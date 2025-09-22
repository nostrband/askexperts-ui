"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/nextjs";
import Button from "../ui/Button";
import { useDefaultWalletBalance } from "../../hooks/useDefaultWalletBalance";
import { Expert } from "askexperts/common";

interface ExpertChatHeaderProps {
  expert: Expert | null;
  showExpertInfo: boolean;
}

export default function ExpertChatHeader({ expert, showExpertInfo }: ExpertChatHeaderProps) {
  const { openSignIn } = useClerk();
  const { wallet, balance, loading } = useDefaultWalletBalance();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        {/* Left side - Expert info when collapsed, or back arrow when expanded */}
        <div className="flex items-center min-w-0 flex-1">
          {!showExpertInfo && expert ? (
            // Show expert info when main block is hidden
            <div className="flex items-center space-x-3 min-w-0 max-w-md">
              <div className="flex-shrink-0">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={expert.picture || "/nostr.png"}
                    alt={expert.name || "Expert"}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {expert.name || "Expert"}
                </h1>
              </div>
            </div>
          ) : (
            // Show AE logo when expert info is visible
            <Link href="/" className="flex items-center">
              <div className="w-40 h-12 relative overflow-hidden">
                <Image
                  src="/logo.jpeg"
                  alt="askexperts.io"
                  fill
                  className="object-contain"
                  style={{
                    objectPosition: "left center",
                  }}
                />
              </div>
            </Link>
          )}
        </div>

        {/* Right side - User controls (same as original header but without chat button) */}
        <div className="flex items-center space-x-4">
          <SignedOut>
            <div className="flex items-center space-x-4">
              <Button variant="primary" onClick={openSignIn}>
                ⚡ Get Started
              </Button>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center space-x-2">
              {wallet && (
                <Link
                  href="/home/wallet"
                  className="flex items-center px-3 py-1 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                >
                  <span className="text-sm font-medium text-blue-800">
                    {loading
                      ? "Loading..."
                      : balance !== null
                      ? `₿ ${balance.toLocaleString()}`
                      : "-"}
                  </span>
                </Link>
              )}
              <UserDropdown />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

function UserDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Link href={"#"} onClick={() => setIsOpen(!isOpen)}>
        &equiv;
      </Link>

      <div
        className={`${
          // We have to hide, not delete it, bcs UserButton must be in the DOM to show
          // the user menu
          !isOpen ? "invisible" : ""
        } absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 z-50`}
      >
        <div className="py-2">
          <div className="px-2 py-2 border-b border-gray-100">
            <UserButton showName={true} />
          </div>

          <Link
            href="/home/wallet"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Wallet
          </Link>

          <Link
            href="/home/experts"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            My Experts
          </Link>

          <Link
            href="/home/docstores"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Documents
          </Link>
        </div>
      </div>
    </div>
  );
}