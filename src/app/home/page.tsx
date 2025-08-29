'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useDBClient } from '../../hooks/useDBClient';
import { useDefaultWalletBalance } from '../../hooks/useDefaultWalletBalance';
import { DBExpert } from 'askexperts/db';

export default function HomePage() {
  const { client, loading: clientLoading, error: clientError } = useDBClient();
  const { balance, wallet, loading: walletLoading } = useDefaultWalletBalance();
  const [experts, setExperts] = useState<DBExpert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!client || clientLoading) return;

      try {
        setLoading(true);
        
        // Fetch experts
        const expertsData = await client.listExperts();
        setExperts(expertsData);
      } catch (err) {
        console.error('Error fetching experts:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [client, clientLoading]);

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Welcome to AskExperts.io</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Chat with experts box */}
            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col h-full">
              <div>
                <h2 className="text-xl font-semibold mb-2">Chat with experts</h2>
                <p className="text-gray-600 mb-4">Access hundreds of popular LLMs and specialized experts</p>
              </div>
              <div className="mt-auto pt-4 text-center">
                <Link
                  href="/experts"
                  className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Explore
                </Link>
              </div>
            </div>
            
            {/* Your experts box */}
            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col h-full">
              <div>
                <h2 className="text-xl font-semibold mb-2">Your experts</h2>
                
                {(loading || clientLoading) && (
                  <div className="text-gray-600 mb-4">Loading...</div>
                )}
                
                {!loading && !clientLoading && (
                  <>
                    {experts.length === 0 ? (
                      <p className="text-gray-600 mb-4">Create your own expert. Choose any LLM, customize the system prompt, upload your documents, and it's ready to go!</p>
                    ) : (
                      <p className="text-gray-600 mb-4">Experts: <b>{experts.length}</b></p>
                    )}
                  </>
                )}
              </div>
              
              <div className="mt-auto pt-4 text-center">
                {!loading && !clientLoading && (
                  <Link
                    href="/home/experts"
                    className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {experts.length === 0 ? 'Create' : 'View'}
                  </Link>
                )}
              </div>
            </div>
            
            {/* Wallet box */}
            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col h-full">
              <div>
                <h2 className="text-xl font-semibold mb-2">Wallet</h2>
                
                {(walletLoading || !wallet) ? (
                  <p className="text-gray-600 mb-4">Loading wallet information...</p>
                ) : (
                  <p className="text-gray-600 mb-4">Balance: <b>₿ {balance !== undefined ? balance : '...'}</b></p>
                )}
              </div>
              
              <div className="mt-auto pt-4 text-center">
                <Link
                  href="/home/wallet"
                  className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Manage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}