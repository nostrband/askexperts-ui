"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamically import ReactMarkdown with no SSR to avoid document-related errors
const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
});

// Basic implementation of MarkdownView that safely handles SSR
export default function MarkdownView({ md }: { md: string }) {
  const [isClient, setIsClient] = React.useState(false);

  // Only enable client-side rendering after mount
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Always render the plain text during SSR
  if (!isClient) {
    return <div className="whitespace-pre-wrap">{md}</div>;
  }

  // Only use ReactMarkdown on the client
  return <ReactMarkdown>{md}</ReactMarkdown>;
}