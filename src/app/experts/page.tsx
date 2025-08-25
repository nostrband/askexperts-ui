'use client';

import React, { Suspense } from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import dynamic from 'next/dynamic';

// Use dynamic import with ssr: false to avoid hydration issues
const ExpertSearch = dynamic(() => import('../../components/experts/ExpertSearch'), {
  ssr: false
});

export default function ExpertsSearchPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <Suspense fallback={
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold mb-6">Find Experts</h1>
            <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
              <p className="text-gray-600">Loading search...</p>
            </div>
          </div>
        }>
          <ExpertSearch />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}