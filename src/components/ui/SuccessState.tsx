import React from 'react';

interface SuccessStateProps {
  amount?: number;
  message?: string;
}

export default function SuccessState({ amount, message }: SuccessStateProps) {
  const displayMessage = message || (amount ? `Received ₿ ${amount.toLocaleString()}` : 'Success!');

  return (
    <div className="text-center py-4">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-xl font-medium text-green-900 mb-2">
        {displayMessage}
      </h3>
    </div>
  );
}