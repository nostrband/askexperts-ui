'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'
import { useAuth } from './NostrAuthProvider'
import Dialog from '../ui/Dialog'
import CustomSignInDialog from './CustomSignInDialog'

interface SignInDialogContextType {
  openSignIn: (options?: { forceRedirectUrl?: string }) => void
  closeSignIn: () => void
  isOpen: boolean
}

const SignInDialogContext = createContext<SignInDialogContextType | undefined>(undefined)

interface SignInDialogProviderProps {
  children: ReactNode
}

export function SignInDialogProvider({ children }: SignInDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState<string | undefined>()
  const { isLoaded, isSignedIn } = useAuth()
  const { redirectWithAuth } = useClerk()

  const openSignIn = (options?: { forceRedirectUrl?: string }) => {
    setRedirectUrl(options?.forceRedirectUrl)
    setIsOpen(true)
  }

  const closeSignIn = () => {
    setIsOpen(false)
    setRedirectUrl(undefined)
  }

  // Handle auth state changes and redirect
  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn && isOpen) {
      // Close the dialog first
      closeSignIn()
      
      // For nostr auth, redirect directly since we don't use Clerk's redirectWithAuth
      if (redirectUrl || window.location.pathname !== '/home') {
        window.location.href = redirectUrl || '/home'
      }
    }
  }, [isLoaded, isSignedIn, isOpen, redirectUrl])

  const handleCustomAction = () => {
    // Trigger nostr-login to show the login screen
    document.dispatchEvent(new CustomEvent('nlLaunch', { detail: 'welcome-login' }));
    // Close our dialog since nostr-login will handle the UI
    closeSignIn();
  }

  return (
    <SignInDialogContext.Provider value={{ openSignIn, closeSignIn, isOpen }}>
      {children}
      <Dialog
        isOpen={isOpen}
        onClose={closeSignIn}
        title="Sign in to your account"
      >
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600">
            Access expert conversations and manage your wallet
          </p>
        </div>
        <CustomSignInDialog
          onCustomAction={handleCustomAction}
          next={redirectUrl}
        />
      </Dialog>
    </SignInDialogContext.Provider>
  )
}

export function useSignInDialog() {
  const context = useContext(SignInDialogContext)
  if (context === undefined) {
    throw new Error('useSignInDialog must be used within a SignInDialogProvider')
  }
  return context
}