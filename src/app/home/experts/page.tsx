'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { useDBClient } from '../../../hooks/useDBClient';
import { DBExpert } from 'askexperts/db';
import CreateExpertDialog from '../../../components/experts/CreateExpertDialog';

export default function ExpertsPage() {
  const { client, loading: clientLoading, error: clientError } = useDBClient();
  const [experts, setExperts] = useState<DBExpert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Create expert dialog state
  const [createExpertDialogOpen, setCreateExpertDialogOpen] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      if (!client || clientLoading) return;

      try {
        setLoading(true);
        
        // Fetch experts
        const expertsData = await client.listExperts();
        setExperts(expertsData);
        
      } catch (err) {
        console.error('Error fetching data:', err);
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
          <h1 className="text-3xl font-bold mb-6">Experts Management</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Experts</h2>
              <button
                onClick={() => setCreateExpertDialogOpen(true)}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Expert
              </button>
            </div>
            
            {loading && (
              <div className="text-gray-600">Loading experts...</div>
            )}
            
            {error && (
              <div className="text-red-500">
                <p>Error loading experts:</p>
                <p>{error}</p>
              </div>
            )}
            
            {!loading && !error && experts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You don't have any experts yet.</p>
                <button
                  onClick={() => setCreateExpertDialogOpen(true)}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create Your First Expert
                </button>
              </div>
            )}
            
            {!loading && !error && experts.length > 0 && (
              <div className="space-y-4">
                {experts.map((expert) => (
                  <Link
                    key={expert.pubkey}
                    href={`/home/experts/${expert.pubkey}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            <Image
                              src={expert.picture || "/nostr.png"}
                              alt={expert.nickname || "Expert"}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{expert.nickname}</h3>
                          <p className="text-sm text-gray-500">{expert.type}</p>
                          {expert.disabled && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Create Expert Dialog */}
      <CreateExpertDialog
        isOpen={createExpertDialogOpen}
        onClose={() => setCreateExpertDialogOpen(false)}
      />
    </>
  );
}