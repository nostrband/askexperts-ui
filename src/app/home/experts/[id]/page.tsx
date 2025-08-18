'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../../components/layout/Header';
import Footer from '../../../../components/layout/Footer';
import ExpertDetails from '../../../../components/experts/ExpertDetails';

export default function ExpertPage() {
  const router = useRouter();
  const params = useParams();
  const expertId = params.id as string;

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Expert Details</h1>
          <ExpertDetails expertId={expertId} />
        </div>
      </main>
      <Footer />
    </>
  );
}