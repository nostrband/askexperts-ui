"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/nextjs";
import Button from "../ui/Button";
import { useDefaultWalletBalance } from "../../hooks/useDefaultWalletBalance";

export default function Header() {
  const { openSignIn } = useClerk();
  const { wallet, balance, loading } = useDefaultWalletBalance();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
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

        {/* Commented out for closed beta
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/#how-it-works" className="text-gray-600 hover:text-[#0F172A]">
            How It Works
          </Link>
          <Link href="/#features" className="text-gray-600 hover:text-[#0F172A]">
            Features
          </Link>
          <Link href="/#for-builders" className="text-gray-600 hover:text-[#0F172A]">
            For Builders
          </Link>
          <Link href="https://github.com/nostrband/askexperts" className="text-gray-600 hover:text-[#0F172A]">
            Docs
          </Link>
        </nav>
        */}

        <div className="flex items-center space-x-4">
          <SignedOut>
            <Button
              variant="primary"
              onClick={openSignIn}
            >
              ⚡ Get Started
            </Button>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center space-x-2">
              <Link
                href="/home/experts"
                className="flex items-center px-3 py-1 bg-green-50 rounded-full hover:bg-green-100 transition-colors"
              >
                <span className="text-sm font-medium text-green-800">
                  Experts
                </span>
              </Link>
              
              {wallet && (
                <Link
                  href="/home/wallet"
                  className="flex items-center px-3 py-1 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                >
                  <span className="text-sm font-medium text-blue-800">
                    {loading ? (
                      "Loading..."
                    ) : balance !== null ? (
                      `₿ ${balance.toLocaleString()}`
                    ) : (
                      "-"
                    )}
                  </span>
                </Link>
              )}
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
