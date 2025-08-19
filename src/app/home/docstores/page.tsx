'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocStoreClient, DocStore } from '../../../hooks/useDocStoreClient';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import Dialog from '../../../components/ui/Dialog';

export default function DocStoresPage() {
  const router = useRouter();
  const { client, loading: clientLoading, error: clientError } = useDocStoreClient();
  const [docStores, setDocStores] = useState<DocStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDocStoreName, setNewDocStoreName] = useState('');

  // Fetch docstores
  useEffect(() => {
    const fetchDocStores = async () => {
      if (!client || clientLoading) return;

      try {
        setLoading(true);
        const stores = await client.listDocstores();
        setDocStores(stores);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching docstores:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    fetchDocStores();
  }, [client, clientLoading]);

  // Handle creating a new docstore
  const handleCreateDocStore = async () => {
    if (!client) return;
    if (!newDocStoreName.trim()) {
      setError('Please enter a name for the docstore');
      return;
    }

    try {
      // Create a new docstore with all required parameters
      const newDocStoreId = await client.createDocstore(
        newDocStoreName,
        'Xenova/all-MiniLM-L6-v2',
        384,
        ''
      );

      // Fetch the newly created docstore to get its full details
      const newDocStore: DocStore = {
        id: newDocStoreId,
        name: newDocStoreName,
        model: 'Xenova/all-MiniLM-L6-v2',
        vector_size: 384,
        options: '',
        timestamp: Date.now()
      };

      // Add the new docstore to the list
      setDocStores([...docStores, newDocStore]);
      
      // Close the dialog and reset the form
      setCreateDialogOpen(false);
      setNewDocStoreName('');
      
      // Navigate to the new docstore's page
      router.push(`/home/docstores/${newDocStoreId}`);
    } catch (err) {
      console.error('Error creating docstore:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Doc Stores</h1>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Doc Store
            </button>
          </div>

          {loading || clientLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading doc stores...</p>
            </div>
          ) : error || clientError ? (
            <div className="text-center py-8">
              <p className="text-red-500">
                Error: {error || (clientError instanceof Error ? clientError.message : 'Unknown error')}
              </p>
            </div>
          ) : docStores.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No doc stores found. Create your first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docStores.map((docStore) => (
                <div
                  key={docStore.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/home/docstores/${docStore.id}`)}
                >
                  <h2 className="text-xl font-semibold mb-2">{docStore.name}</h2>
                  <p className="text-sm text-gray-500 mb-1">
                    Created: {new Date(docStore.timestamp * 1000).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Model: {docStore.model}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Doc Store Dialog */}
      <Dialog
        isOpen={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setNewDocStoreName('');
        }}
        title="Create New Doc Store"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setCreateDialogOpen(false);
                setNewDocStoreName('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateDocStore}
              disabled={!newDocStoreName.trim()}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                !newDocStoreName.trim()
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Create
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="docstore-name" className="block text-sm font-medium text-gray-700 mb-1">
              Doc Store Name
            </label>
            <input
              type="text"
              id="docstore-name"
              value={newDocStoreName}
              onChange={(e) => setNewDocStoreName(e.target.value)}
              placeholder="Enter a name for your doc store"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <p className="text-sm text-gray-500">
              The doc store will use the <span className="font-mono">Xenova/all-MiniLM-L6-v2</span> model with a vector size of 384.
            </p>
          </div>
        </div>
      </Dialog>

      <Footer />
    </>
  );
}