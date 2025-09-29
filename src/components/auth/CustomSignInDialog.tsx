"use client";

import { useState } from "react";
import { useSignIn, useSignUp, useClerk } from "@clerk/nextjs";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import * as SignUp from "@clerk/elements/sign-up";
import Image from "next/image";

interface CustomSignInDialogProps {
  onCustomAction?: () => void;
  next?: string;
}

export default function CustomSignInDialog({
  onCustomAction,
  next,
}: CustomSignInDialogProps) {
  const [mode, setMode] = useState<"idle" | "signin" | "signup" | "verify">("idle");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authFlow, setAuthFlow] = useState<"signin" | "signup" | null>(null);
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { setActive } = useClerk();

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to create a sign-in attempt
      const signInAttempt = await signIn?.create({ identifier: email });
      
      // Find the email address ID for email code strategy
      const emailCodeFactor = signInAttempt?.supportedFirstFactors?.find(
        (factor) => factor.strategy === "email_code"
      );
      
      if (emailCodeFactor && "emailAddressId" in emailCodeFactor) {
        // Prepare email verification for sign-in
        await signIn?.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailCodeFactor.emailAddressId,
        });
        
        setAuthFlow("signin");
        setMode("verify");
      } else {
        setError("Email verification not available for this account.");
      }
    } catch (err: any) {
      const code = err?.errors?.[0]?.code;
      if (code === "form_identifier_not_found") {
        // User doesn't exist, create signup
        try {
          await signUp?.create({ emailAddress: email });
          
          // Prepare email verification for sign-up
          await signUp?.prepareEmailAddressVerification({
            strategy: "email_code",
          });
          
          setAuthFlow("signup");
          setMode("verify");
        } catch (signUpErr: any) {
          setError("Failed to start signup process. Please try again.");
          console.error("SignUp creation error:", signUpErr);
        }
      } else {
        setError("Something went wrong. Please try again.");
        console.error("SignIn creation error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setMode("idle");
    setEmail("");
    setVerificationCode("");
    setError(null);
    setAuthFlow(null);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (authFlow === "signin") {
        const result = await signIn?.attemptFirstFactor({
          strategy: "email_code",
          code: verificationCode,
        });
        
        if (result?.status === "complete" && result.createdSessionId) {
          // Set the newly created session as active
          await setActive({ session: result.createdSessionId });
          
          // Sign-in successful - reset form state and let provider handle redirect
          setMode("idle");
          setEmail("");
          setVerificationCode("");
          setError(null);
          setAuthFlow(null);
          return;
        }
      } else if (authFlow === "signup") {
        const result = await signUp?.attemptEmailAddressVerification({
          code: verificationCode,
        });
        
        if (result?.status === "complete" && result.createdSessionId) {
          // Set the newly created session as active
          await setActive({ session: result.createdSessionId });
          
          // Sign-up successful - reset form state and let provider handle redirect
          setMode("idle");
          setEmail("");
          setVerificationCode("");
          setError(null);
          setAuthFlow(null);
          return;
        }
      }
      // Success - the auth state will be handled by the provider
    } catch (err: any) {
      setError("Invalid verification code. Please try again.");
      console.error("Verification error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (authFlow === "signin") {
        // Find the email address ID for email code strategy
        const emailCodeFactor = signIn?.supportedFirstFactors?.find(
          (factor) => factor.strategy === "email_code"
        );
        
        if (emailCodeFactor && "emailAddressId" in emailCodeFactor) {
          await signIn?.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          });
        } else {
          setError("Email verification not available.");
          return;
        }
      } else if (authFlow === "signup") {
        await signUp?.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      }
    } catch (err: any) {
      setError("Failed to resend code. Please try again.");
      console.error("Resend error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Render custom verification screen
  if (mode === "verify") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">
            {authFlow === "signin" ? "Welcome back!" : "Create your account"}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            We sent a verification code to {email}
          </p>
        </div>
        
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Verification code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={isLoading}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter verification code"
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-bold text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading
                ? "Verifying..."
                : authFlow === "signin"
                  ? "Sign in"
                  : "Create account"
              }
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? "Resending..." : "Resend code"}
            </button>

            <button
              type="button"
              onClick={handleBackToEmail}
              className="flex w-full justify-center text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to email
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Default idle state with custom email form and social providers
  return (
    <div className="space-y-4">
      {/* Social authentication buttons */}
      <SignIn.Root routing="virtual">
        <SignIn.Step name="start">
          <div className="grid gap-3">
            <Clerk.Connection
              name="github"
              className="flex w-full items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center w-5 h-5">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <Clerk.Loading scope="provider:github">
                {(isLoading) => (
                  <span className="flex-1 text-center">
                    {isLoading ? "Connecting..." : "Continue with GitHub"}
                  </span>
                )}
              </Clerk.Loading>
            </Clerk.Connection>

            {/* Nostr button */}
            {onCustomAction && (
              <button
                onClick={onCustomAction}
                className="flex w-full items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <svg
                    className="w-7 h-7"
                    width="225"
                    height="224"
                    viewBox="0 0 225 224"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      width="224.047"
                      height="224"
                      rx="64"
                      fill="#6951FA"
                    ></rect>
                    <path
                      d="M162.441 135.941V88.0593C170.359 85.1674 176 77.5348 176 68.6696C176 57.2919 166.708 48 155.33 48C143.953 48 134.661 57.2444 134.661 68.6696C134.661 77.5822 140.302 85.1674 148.219 88.0593V135.941C147.698 136.13 147.176 136.367 146.655 136.604L87.3956 77.3452C88.6282 74.6904 89.2919 71.7511 89.2919 68.6696C89.2919 57.2444 80.0474 48 68.6696 48C57.2919 48 48 57.2444 48 68.6696C48 77.5822 53.6415 85.1674 61.5585 88.0593V135.941C53.6415 138.833 48 146.465 48 155.33C48 166.708 57.2444 176 68.6696 176C80.0948 176 89.3393 166.708 89.3393 155.33C89.3393 146.418 83.6978 138.833 75.7807 135.941V88.0593C76.3022 87.8696 76.8237 87.6326 77.3452 87.3956L136.604 146.655C135.372 149.31 134.708 152.249 134.708 155.33C134.708 166.708 143.953 176 155.378 176C166.803 176 176.047 166.708 176.047 155.33C176.047 146.418 170.406 138.833 162.489 135.941H162.441Z"
                      fill="white"
                    ></path>
                  </svg>{" "}
                </div>
                <span className="flex-1 text-center">Continue with Nostr</span>
              </button>
            )}
          </div>
        </SignIn.Step>
      </SignIn.Root>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">Or</span>
        </div>
      </div>

      {/* Custom email form */}
      <form onSubmit={handleEmailContinue} className="space-y-4">
        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your email"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-bold text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? "Continuing..." : "Continue with Email"}
        </button>
      </form>
    </div>
  );
}
