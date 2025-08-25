'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '../ui/Button';
import ExpertCard from './ExpertCard';
import { Expert } from 'askexperts/common';
import { searchExperts } from '../../utils/nostr';

export default function ExpertSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Expert[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Check for query parameter on initial load
  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam) {
      setSearchQuery(queryParam);
      performSearch(queryParam);
    }
  }, [searchParams]);

  // Function to perform the search
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      // Search for experts using the Nostr network
      const results = await searchExperts(query);
      setSearchResults(results);
      setHasSearched(true);
    } catch (err) {
      console.error('Error searching for experts:', err);
      setError('Failed to search for experts. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    // Update URL with query parameter
    router.push(`/experts?q=${encodeURIComponent(searchQuery)}`);
    
    // Perform the search
    await performSearch(searchQuery);
  };

  return (
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
              <ExpertCard key={expert.pubkey} expert={expert} />
            ))}
          </div>
        </div>
      )}
      
      {hasSearched && searchResults.length === 0 && !isSearching && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">No experts found matching your search criteria.</p>
        </div>
      )}
    </div>
  );
}