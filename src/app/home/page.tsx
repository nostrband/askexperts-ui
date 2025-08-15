'use client';

import React, { useEffect, useState } from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuth } from "@clerk/nextjs";

export default function HomePage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await getToken();
        const response = await fetch('https://api.askexperts.io/whoami', {
          headers: {
            authorization: `Bearer ${token}`,
          }
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('User data:', data);
        setUserData(data);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Welcome to AskExperts.io</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            
            {loading && (
              <div className="text-gray-600">Loading your profile data...</div>
            )}
            
            {error && (
              <div className="text-red-500">
                <p>Error loading profile data:</p>
                <p>{error}</p>
              </div>
            )}
            
            {!loading && !error && userData && (
              <div className="space-y-2">
                <p className="text-gray-700">
                  <span className="font-medium">API Response:</span>
                </p>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(userData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}