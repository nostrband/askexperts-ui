'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDBClient } from '../../hooks/useDBClient';
import { useDocStoreClient, DocStore } from '../../hooks/useDocStoreClient';
import Dialog from '../ui/Dialog';
import { DBExpert } from 'askexperts/db'

interface ExpertDetailsProps {
  expertId: string;
}

export default function ExpertDetails({ expertId }: ExpertDetailsProps) {
  const router = useRouter();
  const { client: dbClient, loading: dbLoading, error: dbError } = useDBClient();
  const { client: docStoreClient, loading: docStoreLoading, error: docStoreError } = useDocStoreClient();
  const [expert, setExpert] = useState<DBExpert | null>(null);
  const [wallet, setWallet] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Docstores state
  const [availableDocStores, setAvailableDocStores] = useState<DocStore[]>([]);
  const [loadingDocStores, setLoadingDocStores] = useState(false);
  
  // Edit expert dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [pubkey, setPubkey] = useState('');
  const [env, setEnv] = useState('');
  const [docstores, setDocstores] = useState('');
  const [selectedDocStoreIds, setSelectedDocStoreIds] = useState<string[]>([]);
  const [type, setType] = useState<'nostr' | 'openrouter'>('nostr');
  const [updatingExpert, setUpdatingExpert] = useState(false);
  const [updateExpertError, setUpdateExpertError] = useState<string | null>(null);

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

  // Fetch expert data
  useEffect(() => {
    const fetchExpertData = async () => {
      if (!dbClient || dbLoading) return;

      try {
        setLoading(true);
        
        // Fetch the expert
        const expertData = await dbClient.getExpert(expertId);
        
        // Set the expert data
        setExpert(expertData);
        
        // Initialize form fields
        if (expertData) {
          setNickname(expertData.nickname || '');
          setPubkey(expertData.pubkey || '');
          setEnv(expertData.env || '');
          setDocstores(expertData.docstores || '');
          
          // Parse comma-separated docstore IDs into array
          const docstoreIds = expertData.docstores ? expertData.docstores.split(',').map(id => id.trim()) : [];
          setSelectedDocStoreIds(docstoreIds);
          
          setType(expertData.type as 'nostr' | 'openrouter' || 'nostr');
          
          // Fetch wallet if wallet_id exists
          if (expertData.wallet_id) {
            try {
              const walletData = await dbClient.getWallet(expertData.wallet_id);
              setWallet(walletData);
            } catch (walletErr) {
              console.error('Error fetching wallet data:', walletErr);
              // Don't set error state here to avoid UI disruption
            }
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching expert data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    fetchExpertData();
  }, [dbClient, dbLoading, expertId]);

  // Handle updating expert
  const handleUpdateExpert = async () => {
    if (!dbClient || !expert) return;
    if (!nickname.trim()) {
      setUpdateExpertError('Expert nickname is required');
      return;
    }

    try {
      setUpdatingExpert(true);
      setUpdateExpertError(null);
      
      // Convert selected docstore IDs to comma-separated string
      const docstoresString = selectedDocStoreIds.join(',');
      
      // Create updated expert data
      const updatedExpertData = {
        ...expert,
        nickname: nickname.trim(),
        pubkey: pubkey.trim(),
        env: env.trim(),
        docstores: docstoresString,
        type: type
      };
      
      // Update the expert
      await dbClient.updateExpert(updatedExpertData as any);

      // Close the dialog
      setEditDialogOpen(false);
      
      // Refresh expert data
      const refreshedExpertData = await dbClient.getExpert(expertId);
      setExpert(refreshedExpertData);
      
    } catch (err) {
      console.error('Error updating expert:', err);
      setUpdateExpertError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setUpdatingExpert(false);
    }
  };
  
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

  // Handle deleting expert
  const handleDeleteExpert = async () => {
    if (!dbClient || !expert) return;
    
    if (!confirm('Are you sure you want to delete this expert?')) {
      return;
    }

    try {
      await dbClient.deleteExpert(expertId);
      
      // Redirect to experts list
      router.push('/home/experts');
    } catch (err) {
      console.error('Error deleting expert:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  if (loading || dbLoading) {
    return <div className="p-4 text-center">Loading expert data...</div>;
  }

  if (error || dbError) {
    return (
      <div className="p-4 text-center text-red-500">
        Error: {error || (dbError instanceof Error ? dbError.message : 'Unknown error')}
      </div>
    );
  }

  if (!expert) {
    return <div className="p-4 text-center">Expert not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Expert Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">{expert.nickname}</h2>
            <p className="text-sm text-gray-500">{expert.type}</p>
          </div>
          <button
            onClick={() => setEditDialogOpen(true)}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit
          </button>
        </div>
        
        {/* Expert Details */}
        <div className="space-y-4 mt-6">
          <div>
            <h3 className="text-lg font-medium">Pubkey</h3>
            <p className="text-gray-700 mt-1 break-all">{expert.pubkey || 'No pubkey provided'}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Environment</h3>
            <p className="text-gray-700 mt-1">{expert.env || 'No environment specified'}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Docstores</h3>
            {expert.docstores ? (
              <div className="mt-1">
                {expert.docstores.split(',').map((docstoreId, index) => {
                  const docstore = availableDocStores.find(ds => ds.id === docstoreId.trim());
                  return (
                    <div key={index} className="mb-1 text-gray-700">
                      {docstore ? (
                        <>
                          <span>{docstore.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({docstoreId.trim()})</span>
                        </>
                      ) : (
                        <span>{docstoreId.trim()}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-700 mt-1">No docstores specified</p>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Status</h3>
            <p className="text-gray-700 mt-1">
              {expert.disabled ?
                <span className="text-red-500">Disabled</span> :
                <span className="text-green-500">Active</span>
              }
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Wallet</h3>
            <p className="text-gray-700 mt-1">
              {wallet ? (
                <Link href={`/home/wallet/${wallet.id}`} className="text-blue-600 hover:underline">
                  {wallet.name}
                </Link>
              ) : expert.wallet_id ? (
                <span className="text-gray-500">Loading wallet...</span>
              ) : (
                <span className="text-gray-500">No wallet assigned</span>
              )}
            </p>
          </div>
        </div>
        
        {/* Delete Button */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <button
            onClick={handleDeleteExpert}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Delete Expert
          </button>
        </div>
      </div>

      {/* Edit Expert Dialog */}
      <Dialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          // Reset form to current expert values
          if (expert) {
            setNickname(expert.nickname || '');
            setPubkey(expert.pubkey || '');
            setEnv(expert.env || '');
            setDocstores(expert.docstores || '');
            const docstoreIds = expert.docstores ? expert.docstores.split(',').map(id => id.trim()) : [];
            setSelectedDocStoreIds(docstoreIds);
            setType(expert.type as 'nostr' | 'openrouter' || 'nostr');
          }
          setUpdateExpertError(null);
        }}
        title="Edit Expert"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setEditDialogOpen(false);
                // Reset form to current expert values
                if (expert) {
                  setNickname(expert.nickname || '');
                  setPubkey(expert.pubkey || '');
                  setEnv(expert.env || '');
                  setDocstores(expert.docstores || '');
                  const docstoreIds = expert.docstores ? expert.docstores.split(',').map(id => id.trim()) : [];
                  setSelectedDocStoreIds(docstoreIds);
                  setType(expert.type as 'nostr' | 'openrouter' || 'nostr');
                }
                setUpdateExpertError(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateExpert}
              disabled={!nickname.trim() || updatingExpert}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                !nickname.trim() || updatingExpert
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {updatingExpert ? 'Updating...' : 'Update Expert'}
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
            <label htmlFor="pubkey" className="block text-sm font-medium text-gray-700 mb-1">
              Pubkey (Read-only)
            </label>
            <input
              type="text"
              id="pubkey"
              value={pubkey}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
            />
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
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as 'nostr' | 'openrouter')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="nostr">Nostr</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          
          {updateExpertError && (
            <div className="p-2 bg-red-100 text-red-800 rounded-md">
              {updateExpertError}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}