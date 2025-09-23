"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import ExpertChatHeader from "../../../components/layout/ExpertChatHeader";
import MinimalFooter from "../../../components/layout/MinimalFooter";
import { useExpertChat } from "../../../hooks/useExpertChat";
import Dialog from "../../../components/ui/Dialog";
import MarkdownView from "../../../components/Markdown";
import ImageGallery from "../../../components/ui/ImageGallery";

export default function ExpertChatPage() {
  const params = useParams();
  const expertId = params.id as string;

  // Payment confirmation dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentResolver, setPaymentResolver] = useState<
    ((value: boolean) => void) | null
  >(null);

  // Handle max amount exceeded
  const handleMaxAmountExceeded = async (amount_sats: number) => {
    return new Promise<boolean>((resolve) => {
      setPaymentAmount(amount_sats);
      setPaymentResolver(() => resolve);
      setIsPaymentDialogOpen(true);
    });
  };

  const {
    expert,
    loading,
    error,
    messages,
    sendMessage,
    sendError,
    setSendError,
    lastFailedMessage,
    setLastFailedMessage,
  } = useExpertChat(expertId, handleMaxAmountExceeded);

  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [textareaRows, setTextareaRows] = useState(1);
  const [showExpertInfo, setShowExpertInfo] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Helper function to set input message and calculate textarea rows
  const setInputMessageWithRows = (message: string) => {
    setInputMessage(message);
    // Calculate number of lines based on newlines, minimum 1, maximum 10
    const lineCount = Math.min(Math.max(message.split("\n").length, 1), 10);
    setTextareaRows(lineCount);
  };

  // Scroll to bottom only when new messages are added (not during streaming updates)
  useEffect(() => {
    // Only scroll if:
    // 1. Number of messages increased (new message added)
    // 2. Or if a message finished streaming (sending flag changed from true to false)
    const currentLength = messages.length;
    const lengthIncreased = currentLength > prevMessagesLengthRef.current;
    
    // Check if any message just finished streaming
    const hasFinishedStreaming = messages.some((msg, index) => {
      // Only check expert messages that might have been streaming
      if (msg.sender !== 'expert') return false;
      
      // If this message is not sending and it's the last expert message, it likely just finished
      return !msg.sending && index === messages.length - 1;
    });
    
    // Update the ref for next comparison
    prevMessagesLengthRef.current = currentLength;
    
    // Only scroll if we added a new message or finished streaming the last message
    if (lengthIncreased || (hasFinishedStreaming && messages.length > 0)) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [messages]);

  // Set input message to last failed message when there's an error
  useEffect(() => {
    if (lastFailedMessage) {
      setInputMessageWithRows(lastFailedMessage);
      setLastFailedMessage("");
    }
  }, [lastFailedMessage, setLastFailedMessage]);

  // Check for message in URL hash on page load and restore it
  useEffect(() => {
    const handleHashMessage = async () => {
      const hash = window.location.hash;
      if (hash.startsWith("#send=")) {
        try {
          // Extract and decode the message from the hash
          const encodedMessage = hash.substring(6); // Remove '#send='
          const message = decodeURIComponent(encodedMessage);

          // Remove the hash from the URL without triggering a page reload
          const urlWithoutHash = window.location.href.split("#")[0];
          window.history.replaceState(null, "", urlWithoutHash);

          // Send the message directly instead of just setting it in the textarea
          if (message.trim()) {
            setInputMessageWithRows(message);
          }
        } catch (error) {
          console.error("Error decoding message from URL hash:", error);
        }
      }
    };

    const forceReload = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#send=")) {
        window.location.reload();
      }
    };

    // Check hash on mount
    handleHashMessage();

    // Listen for hash changes
    window.addEventListener("hashchange", forceReload);

    // Listen for popstate events (back/forward navigation)
    window.addEventListener("popstate", forceReload);

    // Listen for modern navigate events if available
    let handleNavigate: ((e: any) => void) | null = null;
    if ("navigation" in window) {
      handleNavigate = (e: any) => {
        if (e.navigationType !== "reload") {
          // Small delay to ensure URL has been updated
          setTimeout(forceReload, 0);
        }
      };
      (window as any).navigation.addEventListener("navigate", handleNavigate);
    }

    // Cleanup event listeners
    return () => {
      window.removeEventListener("hashchange", forceReload);
      window.removeEventListener("popstate", forceReload);
      if ("navigation" in window && handleNavigate) {
        (window as any).navigation.removeEventListener(
          "navigate",
          handleNavigate
        );
      }
    };
  }, [sendMessage]); // Include sendMessage in dependencies

  // Hide expert info when messages are present
  useEffect(() => {
    setShowExpertInfo(messages.length === 0);
  }, [messages.length]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || !expert) {
      return;
    }

    // Clear any previous send errors
    setSendError(null);

    // Store the message content before clearing the textarea
    const messageToSend = inputMessage;

    // Clear the textarea immediately when Send is clicked
    setInputMessage("");
    setTextareaRows(1);

    try {
      setSending(true);
      await sendMessage(messageToSend);
      // No need to clear the textarea here as it's already cleared
    } catch (err) {
      console.error("Error in handleSendMessage:", err);
      // Error handling is done in the useExpertChat hook
      // The text will be restored via the useEffect that watches lastFailedMessage
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <>
        <ExpertChatHeader expert={null} showExpertInfo={true} />
        <main className="pt-24 pb-3 min-h-screen">
          <div className="container mx-auto px-4">
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-600">Loading expert profile...</p>
            </div>
          </div>
        </main>
        <MinimalFooter />
      </>
    );
  }

  if (error || !expert) {
    return (
      <>
        <ExpertChatHeader expert={null} showExpertInfo={true} />
        <main className="pt-24 pb-3 min-h-screen">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-red-600">{error || "Expert not found"}</p>
            </div>
          </div>
        </main>
        <MinimalFooter />
      </>
    );
  }

  return (
    <>
      <ExpertChatHeader expert={expert} showExpertInfo={showExpertInfo} />
      <main className="pt-24 min-h-screen flex flex-col">
        <div className="container mx-auto px-4 flex flex-col flex-grow relative pb-32">
          {/* Expert Profile - Fixed at the top with animation */}
          <div
            className={`bg-white rounded-lg shadow-md p-6 mb-4 sticky top-20 z-20 transition-all duration-500 ease-in-out ${
              showExpertInfo
                ? "transform translate-y-0 opacity-100 max-h-96"
                : "transform -translate-y-full opacity-0 max-h-0 p-0 mb-0 overflow-hidden"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-start space-x-4 min-w-0 flex-1 pr-4">
                <div className="flex-shrink-0">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden">
                    <Image
                      src={expert.picture || "/nostr.png"}
                      alt={expert.name || "Expert"}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold truncate sm:whitespace-normal">
                    {expert.name || "Expert"}
                  </h1>
                  <p className="text-gray-600 break-words whitespace-pre-wrap overflow-hidden">
                    {expert.description}
                  </p>
                </div>
              </div>
              {/* <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Available
                </span>
              </div> */}
            </div>
          </div>

          {/* Chat Container - Scrollable area between header and input */}
          <div className="bg-white mb-4 flex-grow overflow-y-auto mt-0 relative z-10">
            {/* Add a top fade effect to hide content scrolling behind the header */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent z-10"></div>
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Start a conversation with {expert.name || "the expert"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`${
                        message.sender === "user"
                          ? "max-w-[70%] bg-blue-100 text-blue-900"
                          : "max-w-full bg-gray-100 text-gray-900"
                      } rounded-lg p-4`}
                    >
                      <div className="break-words">
                        <MarkdownView md={message.content} />
                      </div>
                      {message.images && message.images.length > 0 && (
                        <div className="mt-3">
                          <ImageGallery images={message.images} />
                        </div>
                      )}
                      <div className="text-xs mt-1 flex items-center flex-wrap">
                        <span className="text-gray-500 flex items-center">
                          {new Date(message.timestamp).toLocaleTimeString()}
                          {message.content && (
                            <span className="ml-2 text-xs text-gray-400">
                              {(() => {
                                const bytes = new TextEncoder().encode(
                                  message.content
                                ).length;
                                return bytes < 1024
                                  ? `${bytes} B`
                                  : `${(bytes / 1024).toFixed(1)} KB`;
                              })()}
                            </span>
                          )}
                          {message.sender === "expert" &&
                            message.send_time &&
                            message.first_chunk_time &&
                            message.finished_time && (
                              <span className="ml-2 text-xs text-gray-400">
                                {(() => {
                                  const latencySec =
                                    (message.first_chunk_time -
                                      message.send_time) /
                                    1000;
                                  const streamingSec =
                                    (message.finished_time -
                                      message.first_chunk_time) /
                                    1000;
                                  return `${latencySec.toFixed(
                                    1
                                  )}+${streamingSec.toFixed(1)} sec`;
                                })()}
                              </span>
                            )}
                        </span>
                        {message.sender === "user" && message.amountPaid && (
                          <span className="text-red-600 font-medium ml-2">
                            ₿ -{message.amountPaid}
                          </span>
                        )}
                        {message.sending && (
                          <span className="ml-2">
                            <svg
                              className="animate-spin h-3 w-3 text-gray-500"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Message Input - Fixed at the bottom */}
        <div className="fixed bottom-8 left-0 right-0 z-30">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-lg shadow-md">
              <form onSubmit={handleSendMessage} className="space-y-4">
                {/* Input container with border */}
                <div className="border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  {textareaRows === 1 ? (
                    // Single line layout - textarea and button side by side
                    <div className="flex items-center">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => {
                          setInputMessageWithRows(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          // Send message on Enter (without Shift)
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (inputMessage.trim() && !sending) {
                              handleSendMessage(e);
                            }
                          }
                          // Allow Shift+Enter to add new lines (default textarea behavior)
                        }}
                        placeholder={`Type your message...`}
                        className="flex-1 px-4 py-3 border-0 focus:outline-none focus:ring-0 resize-none bg-transparent"
                        rows={1}
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={!inputMessage.trim() || sending}
                        className={`p-3 mx-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                          !inputMessage.trim() || sending
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                        title="Send message"
                      >
                        {sending ? (
                          <svg
                            className="animate-spin h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        ) : (
                          // Send icon (paper plane)
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ) : (
                    // Multi-line layout - textarea full width, button below
                    <div className="space-y-0">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => {
                          setInputMessageWithRows(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          // Send message on Enter (without Shift)
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (inputMessage.trim() && !sending) {
                              handleSendMessage(e);
                            }
                          }
                          // Allow Shift+Enter to add new lines (default textarea behavior)
                        }}
                        placeholder={`Message ${
                          expert.name || "the expert"
                        }... (Enter to send, Shift+Enter for new line)`}
                        className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 resize-none bg-transparent"
                        rows={textareaRows}
                        disabled={sending}
                      />
                      <div className="flex justify-end px-3 pb-2">
                        <button
                          type="submit"
                          disabled={!inputMessage.trim() || sending}
                          className={`bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            !inputMessage.trim() || sending
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          title="Send message"
                        >
                          {sending ? (
                            <svg
                              className="animate-spin h-5 w-5"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          ) : (
                            // Send icon (paper plane)
                            <svg
                              className="h-5 w-5"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error message display */}
                {sendError && (
                  <div className="text-red-600 text-sm mt-1">{sendError}</div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at the bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <MinimalFooter />
        </div>
      </main>

      {/* Payment Confirmation Dialog */}
      <Dialog
        isOpen={isPaymentDialogOpen}
        onClose={() => {
          setIsPaymentDialogOpen(false);
          if (paymentResolver) {
            paymentResolver(false);
          }
        }}
        title="Payment Confirmation"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setIsPaymentDialogOpen(false);
                if (paymentResolver) {
                  paymentResolver(false);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              No
            </button>
            <button
              onClick={() => {
                setIsPaymentDialogOpen(false);
                if (paymentResolver) {
                  paymentResolver(true);
                }
              }}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Yes
            </button>
          </div>
        }
      >
        <div className="p-4 text-center">
          <p className="text-lg font-medium">Pay {paymentAmount} sats?</p>
          <p className="text-sm text-gray-500 mt-2">
            This amount exceeds the maximum allowed amount (100 sats).
          </p>
        </div>
      </Dialog>
    </>
  );
}
