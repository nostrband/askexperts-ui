'use client'

import { useSearchParams } from 'next/navigation'
import CustomSignIn from '../../../components/auth/CustomSignIn'

export default function Page() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url')
  const fallbackRedirectUrl = searchParams.get('fallback_redirect_url')

  const handleCustomAction = () => {
    // Custom Lightning Wallet sign-in logic can be added here
    console.log('Custom Lightning Wallet sign-in clicked')
    // For now, this is just a placeholder
  }

  return (
    <CustomSignIn
      forceRedirectUrl={redirectUrl || undefined}
      fallbackRedirectUrl={fallbackRedirectUrl || undefined}
      onCustomAction={handleCustomAction}
    />
  )
}