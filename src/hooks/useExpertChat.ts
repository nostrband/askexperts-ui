import { useState, useEffect, useRef } from "react";
import { AskExpertsChatClient, AskExpertsClient } from "askexperts/client";
import { Expert, METHOD_LIGHTNING, parseBolt11 } from "askexperts/common";
import { useDBClient } from "./useDBClient";
import { nwc } from "@getalby/sdk";
import { updateWalletBalance } from "../utils/walletUtils";
import { parseExpertProfile } from "askexperts/experts";
import { useClerk } from "@clerk/nextjs";
import { processImagesForStorage, cleanupObjectUrls } from "../utils/images";

// Define Message interface for chat messages
export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "expert";
  timestamp: number;
  amountPaid?: number; // Amount paid in sats (only for expert messages)
  sending?: boolean; // Flag to indicate if the message is currently being sent
  images?: string[]; // Array of image URLs (data URLs or remote URLs)
}

export interface UseExpertChatResult {
  expert: Expert | null;
  loading: boolean;
  error: string | null;
  messages: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  sendError: string | null;
  setSendError: (error: string | null) => void;
  lastFailedMessage: string;
  setLastFailedMessage: (message: string) => void;
  onMaxAmountExceeded?: (amount_sats: number) => Promise<boolean>;
}

export function useExpertChat(
  expertPubkey: string,
  onMaxAmountExceeded?: (amount_sats: number) => Promise<boolean>
): UseExpertChatResult {
  const { client: dbClient, loading: dbLoading } = useDBClient();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string>("");
  const { openSignIn } = useClerk();

  const chatClient = useRef<AskExpertsChatClient | null>(null);
  const nwcClientRef = useRef<nwc.NWCClient | null>(null);

  // Initialize chat client
  useEffect(() => {
    let isMounted = true;

    const initializeClient = async () => {
      if (!dbClient) {

        try {
          using anonClient = new AskExpertsClient();
          const experts = await anonClient.fetchExperts({ pubkeys: [expertPubkey] });
          if (!experts.length) {
            console.error(`Expert ${expertPubkey} not found`);
            return;
          }
          const expertData = experts[0];
          console.log("expertData", expertData);
          if (isMounted) {
            setExpert(expertData);
            setLoading(false);
          }
        } catch (err) {
          console.error("Error fetching expert:", err);
          if (isMounted) {
            setError("Failed to load expert profile. Please try again later.");
            setLoading(false);
          }
        }
        return;
      }

      setLoading(true);
      if (dbLoading) return;

      try {
        // Get the default wallet to get the NWC string
        const defaultWallet = await dbClient.getDefaultWallet();

        if (!defaultWallet || !defaultWallet.nwc) {
          throw new Error(
            "No default wallet found or wallet missing NWC string"
          );
        }

        // Create an NWC client for balance updates
        const nwcClient = new nwc.NWCClient({
          nostrWalletConnectUrl: defaultWallet.nwc,
        });
        nwcClientRef.current = nwcClient;

        // Create chat client with expert pubkey and proper NWC string
        const client = new AskExpertsChatClient(expertPubkey, {
          nwcString: defaultWallet.nwc,
          onMaxAmountExceeded: async (prompt, quote) => {
            // If callback is provided, use it to ask for user confirmation
            if (onMaxAmountExceeded) {
              // Find the lightning invoice to get the amount
              const lightningInvoice = quote.invoices.find(
                (inv) => inv.method === METHOD_LIGHTNING
              );

              if (lightningInvoice && lightningInvoice.invoice) {
                // Parse the invoice to get the amount in sats
                const { amount_sats } = parseBolt11(lightningInvoice.invoice);
                return await onMaxAmountExceeded(amount_sats);
              }
            }
            // Default behavior: reject payments over max amount
            return false;
          },
          onPaid: async (prompt, quote, proof, fees_msat) => {
            try {
              // Find the lightning invoice
              const lightningInvoice = quote.invoices.find(
                (inv) => inv.method === METHOD_LIGHTNING
              );

              if (lightningInvoice && lightningInvoice.invoice) {
                // Parse the invoice to get the amount
                const { amount_sats } = parseBolt11(lightningInvoice.invoice);

                // Calculate total amount paid including fees
                const totalPaid = amount_sats + Math.ceil(fees_msat / 1000);

                // Get expert name or use a default
                const expertName = expert?.name || "Expert";

                // Print payment information to console
                console.log(
                  `Paid ${amount_sats}+${Math.ceil(
                    fees_msat / 1000
                  )} sats to ${expertName}`
                );

                // Force a refresh of the header balance
                updateWalletBalance();

                // Update the last user message with the amount paid
                setMessages((prev) => {
                  // Find the last user message
                  const lastUserMessageIndex = [...prev]
                    .reverse()
                    .findIndex((msg) => msg.sender === "user");
                  if (lastUserMessageIndex === -1) return prev;

                  // Create a new messages array with the updated message
                  const newMessages = [...prev];
                  const actualIndex = prev.length - 1 - lastUserMessageIndex;
                  newMessages[actualIndex] = {
                    ...newMessages[actualIndex],
                    amountPaid: totalPaid,
                  };

                  return newMessages;
                });
              }
            } catch (error) {
              console.error("Error in onPaid callback:", error);
            }
          },
        });

        chatClient.current = client;

        // Initialize client and get expert profile
        const expertData = await client.initialize();
        console.log("expertData", expertData);

        if (isMounted) {
          setExpert(expertData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error initializing chat client:", err);
        if (isMounted) {
          setError("Failed to load expert profile. Please try again later.");
          setLoading(false);
        }
      }
    };

    // Add a small delay to ensure the DB client is fully initialized
    const timeoutId = setTimeout(() => {
      initializeClient();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      isMounted = false;
      if (chatClient.current) {
        chatClient.current[Symbol.dispose]();
      }
      if (nwcClientRef.current) {
        nwcClientRef.current.close();
      }
      
      // Cleanup object URLs to prevent memory leaks
      messages.forEach(message => {
        if (message.images) {
          cleanupObjectUrls(message.images);
        }
      });
    };
  }, [expertPubkey, dbClient, dbLoading]);

  // Function to send a message to the expert
  const sendMessage = async (messageContent: string) => {
    if (!chatClient.current) {
      // Create redirect URL with the message in the hash
      const currentUrl = new URL(window.location.href);
      // Remove existing hash if any
      currentUrl.hash = '';
      // Add the message to the hash, URL-encoded to handle special characters,
      // ? is a hack to force page reload
      const redirectUrl = `${currentUrl.href}#send=${encodeURIComponent(messageContent)}`;
      
      // Pass the URL with message as redirect URL so user returns to this chat page after sign-in
      openSignIn({
        forceRedirectUrl: redirectUrl
      });
      return;
    }

    if (!messageContent.trim() || !chatClient.current || sending) {
      return;
    }

    // Clear any previous send errors
    setSendError(null);

    // Generate a unique ID for this message
    const messageId = `user-${Date.now()}`;

    try {
      setSending(true);

      // Add user message to chat
      const userMessage: ChatMessage = {
        id: messageId,
        content: messageContent,
        sender: "user",
        timestamp: Date.now(),
        sending: true, // Mark the message as being sent
      };

      setMessages((prev) => [...prev, userMessage]);

      // Process message and get expert's reply with images
      const expertReplyData = await chatClient.current.processMessageExt(
        messageContent
      );

      // Process images for storage optimization
      const processedImages = expertReplyData.images ? processImagesForStorage(expertReplyData.images) : undefined;

      // Add expert's reply to chat
      const expertReply: ChatMessage = {
        id: `expert-${Date.now()}`,
        content: expertReplyData.text,
        sender: "expert",
        timestamp: Date.now(),
        images: processedImages,
      };
      // Update the user message to mark it as sent and add the expert reply
      setMessages((prev) => {
        const updatedMessages = prev.map((msg) =>
          msg.id === messageId ? { ...msg, sending: false } : msg
        );
        return [...updatedMessages, expertReply];
      });
    } catch (err) {
      console.error("Error sending message:", err);

      // Instead of removing the message, mark it as not sending
      // This ensures the spinner disappears if we keep the message in the UI
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, sending: false } : msg
        )
      );

      // Then remove the user message from history
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

      // Save the failed message so it can be put back in the textarea
      setLastFailedMessage(messageContent);

      // Set the error message to display
      setSendError(
        err instanceof Error
          ? err.message
          : "Failed to send message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return {
    expert,
    loading,
    error,
    messages,
    sendMessage,
    sendError,
    setSendError,
    lastFailedMessage,
    setLastFailedMessage,
    onMaxAmountExceeded,
  };
}
