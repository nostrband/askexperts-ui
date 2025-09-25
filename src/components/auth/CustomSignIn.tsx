'use client'

import * as Clerk from '@clerk/elements/common'
import * as SignIn from '@clerk/elements/sign-in'

interface CustomSignInProps {
  forceRedirectUrl?: string
  fallbackRedirectUrl?: string
  onCustomAction?: () => void
}

export default function CustomSignIn({ 
  forceRedirectUrl, 
  fallbackRedirectUrl,
  onCustomAction 
}: CustomSignInProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access expert conversations and manage your wallet
          </p>
        </div>
        
        <SignIn.Root>
          <SignIn.Step name="start">
            <div className="rounded-md bg-white px-6 py-8 shadow">
              <div className="space-y-4">
                {/* Social authentication buttons */}
                <div className="grid gap-3">
                  <Clerk.Connection
                    name="github"
                    className="flex w-full items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-5 h-5">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="flex-1 text-center">Continue with GitHub</span>
                  </Clerk.Connection>
      
                  {/* Nostr button */}
                  {onCustomAction && (
                    <button
                      onClick={onCustomAction}
                      className="flex w-full items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer"
                    >
                      <div className="flex items-center justify-center w-5 h-5">
                        <img
                          src="/nostr.png"
                          alt="Nostr"
                          className="w-5 h-5"
                        />
                      </div>
                      <span className="flex-1 text-center">Continue with Nostr</span>
                    </button>
                  )}
                </div>

                {/* Email/username field and continue button */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Clerk.Field name="identifier" className="space-y-2">
                    {/* <Clerk.Label className="block text-sm font-medium text-gray-700">
                      Email address
                    </Clerk.Label> */}
                    <Clerk.Input 
                      type="email"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter your email"
                    />
                    <Clerk.FieldError className="text-sm text-red-600" />
                  </Clerk.Field>

                  <SignIn.Action
                    submit
                    className="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-bold text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
                  >
                    Continue with Email
                  </SignIn.Action>
                </div>
              </div>
            </div>
          </SignIn.Step>

          {/* Password input step */}
          <SignIn.Step name="verifications">
            <SignIn.Strategy name="password">
              <div className="rounded-md bg-white px-6 py-8 shadow">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900">Enter your password</h3>
                  </div>
                  <Clerk.Field name="password" className="space-y-2">
                    <Clerk.Label className="block text-sm font-medium text-gray-700">
                      Password
                    </Clerk.Label>
                    <Clerk.Input 
                      type="password"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter your password"
                    />
                    <Clerk.FieldError className="text-sm text-red-600" />
                  </Clerk.Field>
                  <SignIn.Action 
                    submit
                    className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Sign in
                  </SignIn.Action>
                </div>
              </div>
            </SignIn.Strategy>

            {/* Email code verification */}
            <SignIn.Strategy name="email_code">
              <div className="rounded-md bg-white px-6 py-8 shadow">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      We sent a verification code to your email address.
                    </p>
                  </div>
                  <Clerk.Field name="code" className="space-y-2">
                    <Clerk.Label className="block text-sm font-medium text-gray-700">
                      Verification code
                    </Clerk.Label>
                    <Clerk.Input 
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter verification code"
                    />
                    <Clerk.FieldError className="text-sm text-red-600" />
                  </Clerk.Field>
                  <SignIn.Action 
                    submit
                    className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Verify
                  </SignIn.Action>
                </div>
              </div>
            </SignIn.Strategy>
          </SignIn.Step>
        </SignIn.Root>
      </div>
    </div>
  )
}