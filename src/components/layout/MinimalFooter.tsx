import React from 'react';
import Link from 'next/link';

export default function MinimalFooter() {
  return (
    <footer className="bg-white py-2">
      <div className="container mx-auto px-4">
        <div className="flex flex-row justify-center items-center space-x-6 text-xs text-gray-600">
          <span>&copy; {new Date().getFullYear()} AskExperts</span>
          <div className="flex space-x-4">
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy
            </Link>
            <Link href="/tos" className="hover:text-gray-900">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}