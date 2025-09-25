'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocStoreClient, DocStore } from '../../../hooks/useDocStoreClient';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import { AuthGuard } from '../../../components/auth/AuthGuard';
import Dialog from '../../../components/ui/Dialog';

export default function DocStoresPage() {
  const router = useRouter();
  const { client, loading: clientLoading, error: clientError } = useDocStoreClient();
  const [docStores, setDocStores] = useState<DocStore[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDocStoreName, setNewDocStoreName] = useState('');
  
  // Import dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [dataSource, setDataSource] = useState('Nostr');
  const [selectedDocStore, setSelectedDocStore] = useState<string>('');
  const [nostrPubkey, setNostrPubkey] = useState('');
  const [numberOfPosts, setNumberOfPosts] = useState<number>(100);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Fetch docstores
  useEffect(() => {
    const fetchDocStores = async () => {
      if (!client || clientLoading) return;

      try {
        setLoading(true);
        const stores = await client.listDocstores();
        setDocStores(stores);
        
        // Set the first docstore as selected by default if there are any docstores
        if (stores.length > 0) {
          setSelectedDocStore(stores[0].id);
        }
        
        // Fetch document counts for each docstore
        const counts: Record<string, number> = {};
        for (const store of stores) {
          try {
            const count = await client.countDocs(store.id);
            counts[store.id] = count;
          } catch (err) {
            console.error(`Error fetching doc count for ${store.id}:`, err);
            counts[store.id] = 0;
          }
        }
        setDocCounts(counts);
        
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
  
  // Handle starting the import process
  const handleStartImport = async () => {
    // No SSR here
    if (typeof window === 'undefined') return;
    const { importNostrPosts } = await import('../../../utils/nostrImport');

    // Validate inputs
    if (!selectedDocStore) {
      setError('Please select a doc store');
      return;
    }
    
    if (!nostrPubkey.trim()) {
      setError('Please enter a Nostr pubkey');
      return;
    }
    
    if (!client) {
      setError('DocStore client not available');
      return;
    }
    
    // Start the import process
    setIsImporting(true);
    setImportProgress(0);
    setImportStatus('Starting import...');
    
    try {
      // Call the importNostrPosts function
      const result = await importNostrPosts({
        docstoreClient: client,
        docstoreId: selectedDocStore,
        pubkey: nostrPubkey,
        limit: numberOfPosts,
        onProgress: (progress, status) => {
          setImportProgress(progress);
          setImportStatus(status);
        }
      });
      
      // Handle the result
      if (result.success) {
        // Wait a moment to show the completion message
        setTimeout(() => {
          setIsImporting(false);
          setImportDialogOpen(false);
          // Reset form
          setSelectedDocStore('');
          setNostrPubkey('');
          setNumberOfPosts(100);
          setImportProgress(0);
          setImportStatus('');
        }, 2000);
      } else {
        setError(result.message);
        setIsImporting(false);
      }
    } catch (err) {
      console.error('Error importing Nostr posts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsImporting(false);
    }
  };

  return (
    <AuthGuard>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Document Stores</h1>
            <div className="flex space-x-3">
              <button
                onClick={() => setImportDialogOpen(true)}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Import Documents
              </button>
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Doc Store
              </button>
            </div>
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
                  <p className="text-sm text-gray-500">
                    Documents: {docCounts[docStore.id] || 0}
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

      {/* Import Documents Dialog */}
      <Dialog
        isOpen={importDialogOpen}
        onClose={() => {
          if (!isImporting) {
            setImportDialogOpen(false);
            setSelectedDocStore('');
            setNostrPubkey('');
            setNumberOfPosts(100);
            setImportProgress(0);
            setImportStatus('');
          }
        }}
        title="Import Documents"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                if (!isImporting) {
                  setImportDialogOpen(false);
                  setSelectedDocStore('');
                  setNostrPubkey('');
                  setNumberOfPosts(100);
                }
              }}
              disabled={isImporting}
              className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                isImporting
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleStartImport}
              disabled={isImporting || !selectedDocStore || !nostrPubkey.trim()}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                isImporting || !selectedDocStore || !nostrPubkey.trim()
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Start
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="data-source" className="block text-sm font-medium text-gray-700 mb-1">
              Data Source
            </label>
            <select
              id="data-source"
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isImporting}
            >
              <option value="Nostr">Nostr</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="docstore-select" className="block text-sm font-medium text-gray-700 mb-1">
              Doc Store
            </label>
            <select
              id="docstore-select"
              value={selectedDocStore}
              onChange={(e) => setSelectedDocStore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isImporting}
            >
              {docStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="nostr-pubkey" className="block text-sm font-medium text-gray-700 mb-1">
              Nostr Pubkey
            </label>
            <input
              type="text"
              id="nostr-pubkey"
              value={nostrPubkey}
              onChange={(e) => setNostrPubkey(e.target.value)}
              placeholder="Enter Nostr pubkey"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isImporting}
            />
          </div>
          
          <div>
            <label htmlFor="number-of-posts" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Posts
            </label>
            <input
              type="number"
              id="number-of-posts"
              value={numberOfPosts}
              onChange={(e) => setNumberOfPosts(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isImporting}
            />
          </div>
          
          {isImporting && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{importStatus}</p>
            </div>
          )}
        </div>
      </Dialog>

      <Footer />
    </AuthGuard>
  );
}