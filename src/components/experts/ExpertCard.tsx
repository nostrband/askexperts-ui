'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Expert } from 'askexperts/common';

interface ExpertCardProps {
  expert: Expert;
}

export default function ExpertCard({ expert }: ExpertCardProps) {
  // Default avatar if none provided
  const avatarUrl = expert.picture || '/nostr.png';
  
  return (
    <Link
      href={`/experts/${expert.pubkey}`}
      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="relative w-12 h-12 rounded-full overflow-hidden">
            <Image
              src={avatarUrl}
              alt={expert.name || 'Expert'}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        </div>
        
        <div className="flex-grow min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {expert.name || 'Unnamed Expert'}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">
            {expert.description || 'No description available'}
          </p>
          
          {expert.hashtags && expert.hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {expert.hashtags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </Link>
  );
}