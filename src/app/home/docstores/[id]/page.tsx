'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Header from '../../../../components/layout/Header';
import Footer from '../../../../components/layout/Footer';
import { AuthGuard } from '../../../../components/auth/AuthGuard';
import DocStoreDetails from '../../../../components/docstore/DocStoreDetails';

export default function DocStorePage() {
  const params = useParams();
  const docStoreId = params.id as string;

  return (
    <AuthGuard>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Doc Store</h1>
          <DocStoreDetails docStoreId={docStoreId} />
        </div>
      </main>
      <Footer />
    </AuthGuard>
  );
}