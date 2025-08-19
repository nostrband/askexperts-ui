'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { useDBClient } from '../../../hooks/useDBClient';
import { useDocStoreClient, DocStore } from '../../../hooks/useDocStoreClient';
import Dialog from '../../../components/ui/Dialog';
import { DBExpert } from 'askexperts/db';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

export default function ExpertsPage() {
  const { client, loading: clientLoading, error: clientError } = useDBClient();
  const { client: docStoreClient, loading: docStoreLoading, error: docStoreError } = useDocStoreClient();
  const [experts, setExperts] = useState<DBExpert[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Docstores state
  const [availableDocStores, setAvailableDocStores] = useState<DocStore[]>([]);
  const [loadingDocStores, setLoadingDocStores] = useState(false);
  
  // Create expert dialog state
  const [createExpertDialogOpen, setCreateExpertDialogOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [env, setEnv] = useState('');
  const [selectedDocStoreIds, setSelectedDocStoreIds] = useState<string[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('new');
  const [selectedType, setSelectedType] = useState<'nostr' | 'openrouter'>('nostr');
  const [creatingExpert, setCreatingExpert] = useState(false);
  const [createExpertError, setCreateExpertError] = useState<string | null>(null);

  // Fetch docstores
  useEffect(() => {
    const fetchDocStores = async () => {
      if (!docStoreClient || docStoreLoading) return;

      try {
        setLoadingDocStores(true);
        const stores = await docStoreClient.listDocstores();
        setAvailableDocStores(stores);
        setLoadingDocStores(false);
      } catch (err) {
        console.error('Error fetching docstores:', err);
        // Don't set error state here to avoid UI disruption
        setLoadingDocStores(false);
      }
    };

    fetchDocStores();
  }, [docStoreClient, docStoreLoading]);

  useEffect(() => {
    const fetchData = async () => {
      if (!client || clientLoading) return;

      try {
        setLoading(true);
        
        // Fetch experts
        const expertsData = await client.listExperts();
        setExperts(expertsData);
        
        // Fetch wallets
        const walletsData = await client.listWallets();
        setWallets(walletsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [client, clientLoading]);
  
  // Handle docstore selection
  const handleDocStoreSelection = (docStoreId: string) => {
    setSelectedDocStoreIds(prevSelected => {
      if (prevSelected.includes(docStoreId)) {
        // Remove if already selected
        return prevSelected.filter(id => id !== docStoreId);
      } else {
        // Add if not selected
        return [...prevSelected, docStoreId];
      }
    });
  };

  const handleCreateExpert = async () => {
    if (!client) return;
    if (!nickname.trim()) {
      setCreateExpertError('Expert nickname is required');
      return;
    }

    try {
      setCreatingExpert(true);
      setCreateExpertError(null);
      
      // Generate a new key pair
      const privkey = generateSecretKey();
      const privkeyHex = bytesToHex(privkey);
      const pubkeyHex = getPublicKey(privkey);
      
      // Handle wallet selection
      let walletId = '';
      
      if (selectedWallet !== 'new') {
        // Use the selected wallet
        walletId = selectedWallet;
      }

      // Create a new expert with the required fields
      const expertData: DBExpert = {
        nickname: nickname.trim(),
        pubkey: pubkeyHex,
        privkey: privkeyHex,
        env: env.trim(),
        docstores: selectedDocStoreIds.join(','),
        disabled: true,
        user_id: await client.getUserId(),
        type: selectedType,
        wallet_id: walletId
      };

      await client.insertExpert(expertData);

      // Close the dialog and reset form
      setCreateExpertDialogOpen(false);
      setNickname('');
      setEnv('');
      setSelectedDocStoreIds([]);
      setSelectedWallet('new');
      setSelectedType('nostr');
      
      // Redirect to the new expert page
      router.push(`/home/experts/${pubkeyHex}`);
    } catch (err) {
      console.error('Error creating expert:', err);
      setCreateExpertError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setCreatingExpert(false);
    }
  };

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
            
            {(loading || clientLoading) && (
              <div className="text-gray-600">Loading experts...</div>
            )}
            
            {(error || clientError) && (
              <div className="text-red-500">
                <p>Error loading experts:</p>
                <p>{error || (clientError instanceof Error ? clientError.message : 'Unknown error')}</p>
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
                      <div>
                        <h3 className="font-medium text-gray-900">{expert.nickname}</h3>
                        <p className="text-sm text-gray-500">{expert.type}</p>
                        {expert.disabled && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Disabled
                          </span>
                        )}
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
      <Dialog
        isOpen={createExpertDialogOpen}
        onClose={() => {
          setCreateExpertDialogOpen(false);
          setNickname('');
          setEnv('');
          setSelectedDocStoreIds([]);
          setSelectedWallet('new');
          setSelectedType('nostr');
          setCreateExpertError(null);
        }}
        title="Create Expert"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setCreateExpertDialogOpen(false);
                setNickname('');
                setEnv('');
                setSelectedDocStoreIds([]);
                setSelectedWallet('new');
                setSelectedType('nostr');
                setCreateExpertError(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateExpert}
              disabled={!nickname.trim() || creatingExpert}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                !nickname.trim() || creatingExpert
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {creatingExpert ? 'Creating...' : 'Create Expert'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
              Nickname *
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter expert nickname"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="wallet" className="block text-sm font-medium text-gray-700 mb-1">
              Wallet
            </label>
            <select
              id="wallet"
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="new">Create New Wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'nostr' | 'openrouter')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="nostr">Nostr</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div>
            <label htmlFor="env" className="block text-sm font-medium text-gray-700 mb-1">
              Environment
            </label>
            <textarea
              id="env"
              value={env}
              onChange={(e) => setEnv(e.target.value)}
              placeholder="Enter environment"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Docstores
            </label>
            <div className="w-full border border-gray-300 rounded-md shadow-sm max-h-60 overflow-y-auto">
              {loadingDocStores ? (
                <div className="p-3 text-gray-500 text-sm">Loading docstores...</div>
              ) : availableDocStores.length === 0 ? (
                <div className="p-3 text-gray-500 text-sm">No docstores available</div>
              ) : (
                availableDocStores.map(docStore => (
                  <div
                    key={docStore.id}
                    className={`p-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      selectedDocStoreIds.includes(docStore.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleDocStoreSelection(docStore.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedDocStoreIds.includes(docStore.id)}
                        onChange={(e) => {
                          e.stopPropagation(); // Stop event from bubbling up to parent div
                          handleDocStoreSelection(docStore.id);
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent parent div's onClick from firing
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{docStore.name}</div>
                        <div className="text-xs text-gray-500">{docStore.id}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {selectedDocStoreIds.length} docstore{selectedDocStoreIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          
          {createExpertError && (
            <div className="p-2 bg-red-100 text-red-800 rounded-md">
              {createExpertError}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}