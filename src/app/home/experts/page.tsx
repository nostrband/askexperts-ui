'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { AuthGuard } from '../../../components/auth/AuthGuard';
import { useDBClient } from '../../../hooks/useDBClient';
import { DBExpert } from 'askexperts/db';
import CreateExpertDialog from '../../../components/experts/CreateExpertDialog';
import EditExpertDialog from '../../../components/experts/EditExpertDialog';

export default function ExpertsPage() {
  const { client, loading: clientLoading, error: clientError } = useDBClient();
  const [experts, setExperts] = useState<DBExpert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const router = useRouter();
  
  // Create/Edit expert dialog state
  const [createExpertDialogOpen, setCreateExpertDialogOpen] = useState(false);
  const [editExpertId, setEditExpertId] = useState<string | null>(null);


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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  return (
    <AuthGuard>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Experts Management</h1>
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
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
                  <div
                    key={expert.pubkey}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
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
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 truncate">{expert.nickname}</h3>
                          <div className="flex items-center space-x-2">
                            {/* Status indicator: text on desktop, dot on mobile */}
                            <div className="flex items-center">
                              <span className="hidden sm:inline text-sm">
                                {!expert.disabled ? (
                                  <span className="text-green-600">Active</span>
                                ) : (
                                  <span className="text-red-600">Stopped</span>
                                )}
                              </span>
                              <div className="sm:hidden">
                                <div
                                  className={`w-2 h-2 rounded-full ${!expert.disabled ? 'bg-green-500' : 'bg-red-500'}`}
                                  title={expert.disabled ? "Stopped" : "Active"}
                                />
                              </div>
                            </div>
                            {expert.model && (
                              <span className="text-sm text-gray-500 truncate max-w-20 sm:max-w-32">{expert.model}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Desktop actions */}
                      <div className="hidden sm:flex space-x-3 flex-shrink-0">
                        <Link
                          href={`/experts/${expert.pubkey}`}
                          className="p-3 rounded-full text-blue-600 hover:bg-blue-50"
                          title="Chat with expert"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => {
                            // Toggle disabled status
                            if (client) {
                              client.setExpertDisabled(expert.pubkey, !expert.disabled)
                                .then(() => {
                                  // Refresh experts list
                                  client.listExperts().then(setExperts);
                                })
                                .catch(err => {
                                  console.error('Error toggling expert status:', err);
                                });
                            }
                          }}
                          className={`p-3 rounded-full cursor-pointer ${!expert.disabled ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={expert.disabled ? "Start expert" : "Stop expert"}
                        >
                          {!expert.disabled ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                              <rect x="6" y="6" width="8" height="8" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditExpertId(expert.pubkey);
                            setCreateExpertDialogOpen(true);
                          }}
                          className="p-3 rounded-full text-gray-600 hover:bg-gray-100 cursor-pointer"
                          title="Settings"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      {/* Mobile dropdown */}
                      <div className="relative sm:hidden flex-shrink-0 dropdown-container">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === expert.pubkey ? null : expert.pubkey)}
                          className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
                          title="Actions"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                        {openDropdownId === expert.pubkey && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                              <Link
                                href={`/experts/${expert.pubkey}`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => setOpenDropdownId(null)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                </svg>
                                Chat with expert
                              </Link>
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  if (client) {
                                    client.setExpertDisabled(expert.pubkey, !expert.disabled)
                                      .then(() => {
                                        client.listExperts().then(setExperts);
                                      })
                                      .catch(err => {
                                        console.error('Error toggling expert status:', err);
                                      });
                                  }
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {!expert.disabled ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                      <rect x="6" y="6" width="8" height="8" />
                                    </svg>
                                    Stop expert
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    Start expert
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setEditExpertId(expert.pubkey);
                                  setCreateExpertDialogOpen(true);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                Settings
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Create Expert Dialog */}
      <CreateExpertDialog
        isOpen={createExpertDialogOpen && !editExpertId}
        onClose={() => {
          setCreateExpertDialogOpen(false);
          setEditExpertId(null);
        }}
      />

      {/* Edit Expert Dialog */}
      {editExpertId && (
        <EditExpertDialog
          isOpen={createExpertDialogOpen && !!editExpertId}
          onClose={() => {
            setCreateExpertDialogOpen(false);
            setEditExpertId(null);
            // Refresh experts list after editing
            if (client) {
              client.listExperts().then(setExperts);
            }
          }}
          expertId={editExpertId}
        />
      )}
    </AuthGuard>
  );
}