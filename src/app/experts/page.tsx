'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import Button from '../../components/ui/Button';
import { Expert } from 'askexperts/common';

export default function ExpertsSearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Expert[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock experts data for demonstration
  const mockExperts: Expert[] = [
    {
      pubkey: 'npub1abc123def456',
      name: 'AI Expert',
      description: 'AI and Machine Learning',
      relays: ['wss://relay.example.com'],
      formats: [],
      stream: true,
      methods: [],
      hashtags: ['ai', 'ml'],
      event: {} as any
    },
    {
      pubkey: 'npub2xyz789uvw012',
      name: 'Blockchain Specialist',
      description: 'Blockchain and Cryptocurrency',
      relays: ['wss://relay.example.com'],
      formats: [],
      stream: true,
      methods: [],
      hashtags: ['blockchain', 'crypto'],
      event: {} as any
    },
    {
      pubkey: 'npub3ghi456jkl789',
      name: 'Web Development Guru',
      description: 'Web Development',
      relays: ['wss://relay.example.com'],
      formats: [],
      stream: true,
      methods: [],
      hashtags: ['web', 'javascript'],
      event: {} as any
    }
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      // In a real implementation, this would call an API to search for experts
      // For now, we'll simulate a search with the mock data
      const results = mockExperts.filter(expert =>
        expert.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expert.hashtags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching for experts:', err);
      setError('Failed to search for experts. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Find Experts</h1>
          
          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for experts by name or expertise..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className={`px-6 ${isSearching ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </form>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
                {error}
              </div>
            )}
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Search Results</h2>
              <div className="space-y-4">
                {searchResults.map((expert) => (
                  <Link
                    key={expert.pubkey}
                    href={`/experts/${expert.pubkey}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">{expert.name || 'Unnamed Expert'}</h3>
                        <p className="text-sm text-gray-500">{expert.description}</p>
                        {expert.hashtags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {expert.hashtags.map(tag => (
                              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                #{tag}
                              </span>
                            ))}
                          </div>
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
            </div>
          )}
          
          {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-600">No experts found matching your search criteria.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}