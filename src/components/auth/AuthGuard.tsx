"use client";

import React from "react";
import { LoadingSignedIn, SignedIn, SignedOut } from "./NostrAuthComponents";
import { useCustomSignIn } from "../../hooks/useCustomSignIn";
import Button from "../ui/Button";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { openSignIn } = useCustomSignIn();

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <LoadingSignedIn>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Loading...
              </h2>
            </div>
          </div>
        </div>
      </LoadingSignedIn>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Authentication Required
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please sign in to access this page
              </p>
            </div>
            <div>
              <Button variant="primary" onClick={openSignIn} className="w-full">
                ⚡ Sign In
              </Button>
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  );
}
