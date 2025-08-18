'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../../components/layout/Header';
import Footer from '../../../../components/layout/Footer';
import WalletDetails from '../../../../components/wallet/WalletDetails';

export default function WalletPage() {
  const router = useRouter();
  const params = useParams();
  const walletId = params.id as string;

  // Handle wallet change (for wallet switcher)
  const handleWalletChange = (newWalletId: string) => {
    if (newWalletId !== walletId) {
      router.push(`/home/wallet/${newWalletId}`);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Wallet</h1>
          <WalletDetails walletId={walletId} onWalletChange={handleWalletChange} />
        </div>
      </main>
      <Footer />
    </>
  );
}