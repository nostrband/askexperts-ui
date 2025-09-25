import { useSignInDialog } from '../components/auth/SignInDialogProvider'

interface SignInOptions {
  forceRedirectUrl?: string
  fallbackRedirectUrl?: string
}

export function useCustomSignIn() {
  const { openSignIn: openDialog } = useSignInDialog()

  const openSignIn = (options?: SignInOptions) => {
    openDialog({ forceRedirectUrl: options?.forceRedirectUrl })
  }

  return {
    openSignIn
  }
}