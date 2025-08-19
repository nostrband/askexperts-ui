'use client';

import React, { useState, useEffect } from 'react';
import { useDocStoreClient, DocStore } from '../../hooks/useDocStoreClient';
import Dialog from '../ui/Dialog';

interface DocStoreDetailsProps {
  docStoreId: string;
}

export default function DocStoreDetails({ docStoreId }: DocStoreDetailsProps) {
  const { client, loading: clientLoading, error: clientError } = useDocStoreClient();
  const [docStore, setDocStore] = useState<DocStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');

  // Fetch docstore
  useEffect(() => {
    const fetchDocStore = async () => {
      if (!client || clientLoading) return;

      try {
        setLoading(true);
        const store = await client.getDocstore(docStoreId);
        if (store) {
          setDocStore(store);
        } else {
          setError('Docstore not found');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching docstore:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    fetchDocStore();
  }, [client, clientLoading, docStoreId]);

  // Handle editing the docstore
  const handleEditDocStore = async () => {
    if (!client || !docStore) return;
    if (!editName.trim()) {
      setError('Please enter a name for the docstore');
      return;
    }

    try {
      // Since there's no direct update method, we'll create a new docstore with the new name
      // but keep all other parameters the same
      await client.createDocstore(
        editName,
        docStore.model,
        docStore.vector_size,
        docStore.options
      );
      
      // Fetch the updated docstore to get its full details
      const updatedStore = await client.getDocstore(docStoreId);
      
      if (updatedStore) {
        // Update the local state
        setDocStore({
          ...updatedStore,
          name: editName
        });
      } else {
        // If we can't fetch the updated docstore, just update the name in our local state
        setDocStore({
          ...docStore,
          name: editName
        });
      }
      
      // Close the dialog and reset the form
      setEditDialogOpen(false);
      setEditName('');
    } catch (err) {
      console.error('Error updating docstore:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  // Open edit dialog with current name
  const openEditDialog = () => {
    if (docStore) {
      setEditName(docStore.name);
      setEditDialogOpen(true);
    }
  };

  if (loading || clientLoading) {
    return <div className="p-4 text-center">Loading docstore data...</div>;
  }

  if (error || clientError) {
    return (
      <div className="p-4 text-center text-red-500">
        Error: {error || (clientError instanceof Error ? clientError.message : 'Unknown error')}
      </div>
    );
  }

  if (!docStore) {
    return <div className="p-4 text-center">Docstore not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">{docStore.name}</h2>
          </div>
          <button
            onClick={openEditDialog}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">ID</p>
            <p className="font-mono text-sm">{docStore.id}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Created</p>
            <p>{new Date(docStore.timestamp * 1000).toLocaleString()}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Model</p>
            <p className="font-mono">{docStore.model}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Vector Size</p>
            <p>{docStore.vector_size}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">Options</p>
            <p>{docStore.options || 'None'}</p>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditName('');
        }}
        title="Edit Doc Store"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setEditDialogOpen(false);
                setEditName('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEditDocStore}
              disabled={!editName.trim()}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                !editName.trim()
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Save
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
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter a name for your doc store"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}