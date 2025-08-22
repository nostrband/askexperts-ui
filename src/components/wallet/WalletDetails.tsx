'use client';

import React, { useState, useEffect } from 'react';
import { useDBClient } from '../../hooks/useDBClient';
import { useNWCClient, millisatsToSats } from '../../hooks/useNWCClient';
import Dialog from '../../components/ui/Dialog';
import { DBWallet } from 'askexperts/db';
import { QRCodeSVG } from 'qrcode.react';

interface WalletDetailsProps {
  walletId: string;
  onWalletChange: (walletId: string) => void;
}

export default function WalletDetails({ walletId, onWalletChange }: WalletDetailsProps) {
  const { client: dbClient, loading: dbLoading, error: dbError } = useDBClient();
  const [wallet, setWallet] = useState<DBWallet | null>(null);
  const [wallets, setWallets] = useState<DBWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [addWalletDialogOpen, setAddWalletDialogOpen] = useState(false);
  const [invoice, setInvoice] = useState('');
  const [amount, setAmount] = useState('');
  // description is now fixed as "AskExperts topup"
  const [generatedInvoice, setGeneratedInvoice] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Add wallet dialog states
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletNWC, setNewWalletNWC] = useState('');
  const [addWalletStatus, setAddWalletStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Initialize NWC client with the wallet's NWC string
  const { 
    balance, 
    loading: nwcLoading, 
    error: nwcError,
    payInvoice,
    makeInvoice,
    listTransactions
  } = useNWCClient(wallet?.nwc);

  // Fetch wallet and wallets list
  useEffect(() => {
    const fetchWalletData = async () => {
      if (!dbClient || dbLoading) return;

      try {
        setLoading(true);
        
        // Fetch the current wallet
        const walletData = await dbClient.getWallet(walletId);
        setWallet(walletData);
        
        // Fetch all wallets for the dropdown
        const walletsData = await dbClient.listWallets();
        setWallets(walletsData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching wallet data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [dbClient, dbLoading, walletId]);

  // Fetch transactions when wallet changes
  useEffect(() => {
    const fetchTransactions = async () => {
      // Only proceed if we have a wallet with an NWC string, NWC client is not loading,
      // and listTransactions function is available
      if (!wallet?.nwc || nwcLoading || !listTransactions) return;

      try {
        const txs = await listTransactions(10);
        setTransactions(txs);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        // Don't set error state here to avoid UI disruption
      }
    };

    // Add a small delay to ensure the NWC client is fully initialized
    const timeoutId = setTimeout(() => {
      fetchTransactions();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [wallet, nwcLoading, listTransactions]);

  // Handle making a wallet the default
  const handleMakeDefault = async (id: string) => {
    if (!dbClient) return;

    try {
      // Get the wallet to update
      const walletToUpdate = wallets.find(w => w.id === id);
      if (!walletToUpdate) return;

      // Update the wallet to be default
      await dbClient.updateWallet({
        ...walletToUpdate,
        default: true
      });

      // Refresh wallets list
      const updatedWallets = await dbClient.listWallets();
      setWallets(updatedWallets);
      
      // Reload the current wallet data to reflect the updated state
      const updatedWallet = await dbClient.getWallet(id);
      setWallet(updatedWallet);
      
      // Show a success message or visual feedback
      console.log('Wallet set as default successfully');
    } catch (err) {
      console.error('Error making wallet default:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  // Handle paying an invoice
  const handlePayInvoice = async () => {
    if (!invoice.trim()) return;

    try {
      setPaymentStatus('loading');
      await payInvoice(invoice);
      setPaymentStatus('success');
      
      // Close dialog after successful payment
      setTimeout(() => {
        setSendDialogOpen(false);
        setInvoice('');
        setPaymentStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Error paying invoice:', err);
      setPaymentStatus('error');
    }
  };

  // Handle creating an invoice
  const handleCreateInvoice = async () => {
    if (!amount) return;

    try {
      const amountInSats = parseInt(amount, 10);
      if (isNaN(amountInSats) || amountInSats <= 0) {
        throw new Error('Invalid amount');
      }

      // Use fixed description "AskExperts topup"
      const fixedDescription = "AskExperts topup";
      const invoiceStr = await makeInvoice(amountInSats, fixedDescription);
      setGeneratedInvoice(invoiceStr);
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  // Handle adding a new wallet
  const handleAddWallet = async () => {
    if (!newWalletName.trim() || !newWalletNWC.trim() || !dbClient) return;

    try {
      setAddWalletStatus('loading');
      
      // Get the user ID
      const userId = await dbClient.getUserId();
      
      // Create the new wallet
      const walletName = newWalletName.trim() || `Wallet ${wallets.length + 1}`;
      
      // Insert the wallet to the database
      const walletId = await dbClient.insertWallet({
        name: walletName,
        nwc: newWalletNWC.trim(),
        default: wallets.length === 0, // Make it default if it's the first wallet
        user_id: userId
      });
      
      // Update the wallets list
      const updatedWallets = await dbClient.listWallets();
      setWallets(updatedWallets);
      
      // Show success message
      setAddWalletStatus('success');
      
      // Close dialog after successful addition
      setTimeout(() => {
        setAddWalletDialogOpen(false);
        setNewWalletName('');
        setNewWalletNWC('');
        setAddWalletStatus('idle');
        
        // Navigate to the new wallet
        onWalletChange(walletId);
      }, 1500);
    } catch (err) {
      console.error('Error adding wallet:', err);
      setAddWalletStatus('error');
    }
  };

  // Format date for transaction display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading || dbLoading) {
    return <div className="p-4 text-center">Loading wallet data...</div>;
  }

  if (error || dbError) {
    return (
      <div className="p-4 text-center text-red-500">
        Error: {error || (dbError instanceof Error ? dbError.message : 'Unknown error')}
      </div>
    );
  }

  if (!wallet) {
    return <div className="p-4 text-center">Wallet not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Wallet Switcher */}
      <div className="mb-6">
        <label htmlFor="wallet-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Wallet
        </label>
        <select
          id="wallet-select"
          value={walletId}
          onChange={(e) => {
            if (e.target.value === "add-wallet") {
              setAddWalletDialogOpen(true);
            } else {
              onWalletChange(e.target.value);
            }
          }}
          className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
          {wallets.length > 0 && (
            <option disabled className="border-t border-gray-200">
              ───────────────
            </option>
          )}
          <option value="add-wallet">Add wallet...</option>
        </select>
      </div>

      {/* Wallet Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">{wallet.name}</h2>
            {wallet.default ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Default
              </span>
            ) : (
              <button
                onClick={() => handleMakeDefault(wallet.id)}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                Make Default
              </button>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">Balance</p>
          <h3 className="text-3xl font-bold">
            {nwcLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : balance !== null ? (
              `₿ ${balance.toLocaleString()}`
            ) : (
              <span className="text-red-500">-</span>
            )}
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={() => setSendDialogOpen(true)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Send
          </button>
          <button
            onClick={() => setReceiveDialogOpen(true)}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Receive
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No transactions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(tx.settled_at || tx.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.type === 'incoming' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {tx.type === 'incoming' ? 'Received' : 'Sent'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={tx.type === 'incoming' ? 'text-green-600' : 'text-blue-600'}>
                        {tx.type === 'incoming' ? '+' : '-'}{millisatsToSats(tx.amount).toLocaleString()} sats
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                      {tx.description || 'No description'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send Dialog */}
      <Dialog
        isOpen={sendDialogOpen}
        onClose={() => {
          setSendDialogOpen(false);
          setInvoice('');
          setPaymentStatus('idle');
        }}
        title="Send Payment"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setSendDialogOpen(false);
                setInvoice('');
                setPaymentStatus('idle');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePayInvoice}
              disabled={!invoice.trim() || paymentStatus === 'loading'}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                !invoice.trim() || paymentStatus === 'loading'
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {paymentStatus === 'loading' ? 'Processing...' : 'Pay'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="invoice" className="block text-sm font-medium text-gray-700 mb-1">
              Lightning Invoice
            </label>
            <textarea
              id="invoice"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              placeholder="Enter BOLT11 invoice"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          
          {paymentStatus === 'success' && (
            <div className="p-2 bg-green-100 text-green-800 rounded-md">
              Payment successful!
            </div>
          )}
          
          {paymentStatus === 'error' && (
            <div className="p-2 bg-red-100 text-red-800 rounded-md">
              Payment failed. Please try again.
            </div>
          )}
        </div>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog
        isOpen={receiveDialogOpen}
        onClose={() => {
          setReceiveDialogOpen(false);
          setAmount('');
          setGeneratedInvoice('');
        }}
        title="Receive Payment"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setReceiveDialogOpen(false);
                setAmount('');
                setGeneratedInvoice('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            {!generatedInvoice && (
              <button
                onClick={handleCreateInvoice}
                disabled={!amount}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                  !amount
                    ? 'bg-green-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Generate Invoice
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {!generatedInvoice ? (
            <>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (sats)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount in sats"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  min="1"
                />
              </div>
              {/* Description input removed - using fixed "AskExperts topup" */}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Invoice Generated:</p>
              
              {/* QR Code Display */}
              <div className="flex justify-center mb-4">
                <QRCodeSVG value={generatedInvoice} size={200} />
              </div>
              
              {/* Invoice as single-line input */}
              <div className="bg-gray-100 p-3 rounded-md">
                <input
                  type="text"
                  value={generatedInvoice}
                  readOnly
                  className="w-full text-xs text-gray-800 bg-transparent border-none focus:outline-none"
                />
              </div>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedInvoice);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>
      </Dialog>

      {/* Add Wallet Dialog */}
      <Dialog
        isOpen={addWalletDialogOpen}
        onClose={() => {
          setAddWalletDialogOpen(false);
          setNewWalletName('');
          setNewWalletNWC('');
          setAddWalletStatus('idle');
        }}
        title="Add Wallet"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setAddWalletDialogOpen(false);
                setNewWalletName('');
                setNewWalletNWC('');
                setAddWalletStatus('idle');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddWallet}
              disabled={!newWalletName.trim() || !newWalletNWC.trim() || addWalletStatus === 'loading'}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                !newWalletName.trim() || !newWalletNWC.trim() || addWalletStatus === 'loading'
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {addWalletStatus === 'loading' ? 'Adding...' : 'Add Wallet'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="wallet-name" className="block text-sm font-medium text-gray-700 mb-1">
              Wallet Name
            </label>
            <input
              type="text"
              id="wallet-name"
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              placeholder="Enter wallet name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="wallet-nwc" className="block text-sm font-medium text-gray-700 mb-1">
              NWC Connection String
            </label>
            <textarea
              id="wallet-nwc"
              value={newWalletNWC}
              onChange={(e) => setNewWalletNWC(e.target.value)}
              placeholder="Enter NWC connection string"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          
          {addWalletStatus === 'success' && (
            <div className="p-2 bg-green-100 text-green-800 rounded-md">
              Wallet added successfully!
            </div>
          )}
          
          {addWalletStatus === 'error' && (
            <div className="p-2 bg-red-100 text-red-800 rounded-md">
              Failed to add wallet. Please try again.
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}